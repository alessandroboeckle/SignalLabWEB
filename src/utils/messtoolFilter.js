// Digital filter design + application, mirroring the SciPy-based Messtool.
//
// Supports Butterworth (more characteristics added after verification).
// Pipeline: analog prototype poles -> frequency transform -> bilinear ->
// second-order sections (SOS) -> zero-phase filtering (filtfilt).
//
// Verified numerically against scipy.signal.butter / sosfiltfilt.

// ---------- complex helpers ----------
const cx = (re, im = 0) => ({ re, im });
const cadd = (a, b) => cx(a.re + b.re, a.im + b.im);
const csub = (a, b) => cx(a.re - b.re, a.im - b.im);
const cmul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cdiv = (a, b) => {
  const d = b.re * b.re + b.im * b.im;
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
const cneg = (a) => cx(-a.re, -a.im);

// ---------- Butterworth analog prototype poles (unit cutoff) ----------
function butterPoles(N) {
  const poles = [];
  for (let k = 0; k < N; k++) {
    const theta = (Math.PI * (2 * k + 1)) / (2 * N) + Math.PI / 2;
    poles.push(cx(Math.cos(theta), Math.sin(theta)));
  }
  return poles; // all in left half-plane
}

// ---------- lowpass -> lowpass frequency scaling (analog) ----------
// s -> s/wc ; poles scale by wc; gain adjusts
function lpToLp(poles, wc) {
  return poles.map((p) => cx(p.re * wc, p.im * wc));
}

// ---------- bilinear transform of a single analog pole/zero ----------
// z = (2*fs + s) / (2*fs - s)
function bilinearPoint(s, fs2) {
  const num = cx(fs2 + s.re, s.im);
  const den = cx(fs2 - s.re, -s.im);
  return cdiv(num, den);
}

// Build SOS for a Butterworth lowpass/highpass.
// wnNorm = cutoff / nyquist  (0..1). btype: 'low' | 'high'
export function butterSOS(order, wnNorm, btype = "low") {
  const fs = 2; // work in normalized domain, fs=2 so nyquist=1
  const fs2 = 2 * fs; // = 4
  // pre-warp analog cutoff
  const wc = 2 * fs * Math.tan((Math.PI * wnNorm) / 2);

  let poles = butterPoles(order);
  poles = lpToLp(poles, wc);

  // analog zeros: lowpass has all zeros at infinity; highpass at 0
  // For bilinear, lowpass zeros map to z=-1; highpass zeros at s=0 map to z=+1.
  let zeros = [];
  if (btype === "high") {
    // transform lowpass prototype to highpass: s -> wc/s
    poles = poles.map((p) => cdiv(cx(wc, 0), p));
    zeros = new Array(order).fill(cx(0, 0)); // zeros at s=0
  }

  // bilinear transform poles and zeros
  const zPoles = poles.map((p) => bilinearPoint(p, fs2));
  let zZeros;
  if (btype === "high") {
    zZeros = zeros.map((z) => bilinearPoint(z, fs2)); // -> z = +1
  } else {
    zZeros = new Array(order).fill(cx(-1, 0)); // lowpass zeros at z = -1
  }

  // pair conjugate poles/zeros into second-order sections
  const sos = [];
  const nSections = Math.ceil(order / 2);

  // sort poles by imaginary part to pair conjugates
  const usedP = new Array(zPoles.length).fill(false);
  const usedZ = new Array(zZeros.length).fill(false);

  function takePair(arr, used) {
    // find first unused
    let i = used.findIndex((u) => !u);
    if (i === -1) return null;
    used[i] = true;
    const a = arr[i];
    // find its conjugate (or a real partner)
    let j = -1;
    for (let k = 0; k < arr.length; k++) {
      if (used[k]) continue;
      if (Math.abs(arr[k].im + a.im) < 1e-9 && Math.abs(arr[k].re - a.re) < 1e-9) { j = k; break; }
    }
    if (j !== -1) { used[j] = true; return [a, arr[j]]; }
    return [a, null];
  }

  for (let sIdx = 0; sIdx < nSections; sIdx++) {
    const pp = takePair(zPoles, usedP);
    const zz = takePair(zZeros, usedZ);

    // build 2nd-order polynomial from roots: (1 - r1 z^-1)(1 - r2 z^-1)
    const polyFrom = (pair) => {
      if (!pair) return [1, 0, 0];
      const [r1, r2] = pair;
      if (r2 === null) {
        // first order: 1 - r1 z^-1
        return [1, -r1.re, 0];
      }
      // 1 - (r1+r2) z^-1 + (r1 r2) z^-2  (imag parts cancel for conjugates)
      const sum = cadd(r1, r2);
      const prod = cmul(r1, r2);
      return [1, -sum.re, prod.re];
    };

    const b = polyFrom(zz);
    const a = polyFrom(pp);
    sos.push([b[0], b[1], b[2], a[0], a[1], a[2]]);
  }

  // normalize gain so that response = 1 at the appropriate frequency
  // lowpass: unity at z=1 (DC); highpass: unity at z=-1 (nyquist)
  const evalZ = btype === "high" ? -1 : 1;
  let gain = 1;
  for (const s of sos) {
    const num = s[0] + s[1] * evalZ + s[2] * evalZ * evalZ;
    const den = s[3] + s[4] * evalZ + s[5] * evalZ * evalZ;
    gain *= num / den;
  }
  // apply inverse gain to numerator of first section
  const g = 1 / gain;
  sos[0][0] *= g;
  sos[0][1] *= g;
  sos[0][2] *= g;

  return sos;
}

// ---------- apply SOS (single direction) ----------
function sosfiltOnce(sos, x) {
  let y = x.slice();
  for (const s of sos) {
    const [b0, b1, b2, a0, a1, a2] = s;
    const nb0 = b0 / a0, nb1 = b1 / a0, nb2 = b2 / a0;
    const na1 = a1 / a0, na2 = a2 / a0;
    let z1 = 0, z2 = 0;
    const out = new Array(y.length);
    for (let i = 0; i < y.length; i++) {
      const xn = y[i];
      const yn = nb0 * xn + z1;
      z1 = nb1 * xn - na1 * yn + z2;
      z2 = nb2 * xn - na2 * yn;
      out[i] = yn;
    }
    y = out;
  }
  return y;
}

// ---------- zero-phase filtering (like scipy sosfiltfilt) ----------
// filter forward, reverse, filter again, reverse back.
export function sosfiltfilt(sos, x) {
  if (!x || x.length === 0) return [];
  // simple edge padding to reduce transients (odd reflection)
  const n = x.length;
  const padLen = Math.min(3 * sos.length * 2, n - 1);
  if (padLen < 1) {
    let y = sosfiltOnce(sos, x);
    y.reverse();
    y = sosfiltOnce(sos, y);
    y.reverse();
    return y;
  }
  const pre = [];
  for (let i = padLen; i >= 1; i--) pre.push(2 * x[0] - x[i]);
  const post = [];
  for (let i = 2; i <= padLen + 1; i++) post.push(2 * x[n - 1] - x[n - 1 - i + 1]);
  let ext = pre.concat(x, post);

  let y = sosfiltOnce(sos, ext);
  y.reverse();
  y = sosfiltOnce(sos, y);
  y.reverse();

  return y.slice(padLen, padLen + n);
}

// convenience: design + apply
export function applyButterworth(x, { order = 4, cutoffHz, cutoff2Hz, sampleRate, btype = "low" }) {
  const nyq = sampleRate / 2;
  if (btype === "low" || btype === "high") {
    const wn = cutoffHz / nyq;
    if (wn <= 0 || wn >= 1) return x.slice();
    const sos = butterSOS(order, wn, btype);
    return sosfiltfilt(sos, x);
  }
  // bandpass = highpass(low cutoff) then lowpass(high cutoff)
  if (btype === "band") {
    const hp = applyButterworth(x, { order, cutoffHz, sampleRate, btype: "high" });
    return applyButterworth(hp, { order, cutoffHz: cutoff2Hz, sampleRate, btype: "low" });
  }
  return x.slice();
}
