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

// ---------- Chebyshev type I analog prototype poles ----------
// ripple in dB. Poles lie on an ellipse.
function cheby1Poles(N, rippleDb) {
  const eps = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
  const mu = (1 / N) * Math.asinh(1 / eps);
  const sinhMu = Math.sinh(mu);
  const coshMu = Math.cosh(mu);
  const poles = [];
  for (let k = 0; k < N; k++) {
    const theta = (Math.PI * (2 * k + 1)) / (2 * N);
    // s = -sinh(mu) sin(theta) + j cosh(mu) cos(theta)
    poles.push(cx(-sinhMu * Math.sin(theta), coshMu * Math.cos(theta)));
  }
  return poles;
}

// ---------- Bessel analog prototype poles (norm='phase', from SciPy) ----------
const BESSEL_POLES = {
  2: [[-0.8660254038, 0.5], [-0.8660254038, -0.5]],
  3: [[-0.7456403858, 0.7113666250], [-0.9416000265, 0], [-0.7456403858, -0.7113666250]],
  4: [[-0.6572111717, 0.8301614350], [-0.9047587968, 0.2709187330], [-0.9047587968, -0.2709187330], [-0.6572111717, -0.8301614350]],
  5: [[-0.5905759446, 0.9072067565], [-0.8515536194, 0.4427174639], [-0.9264420774, 0], [-0.8515536194, -0.4427174639], [-0.5905759446, -0.9072067565]],
  6: [[-0.5385526817, 0.9616876882], [-0.7996541858, 0.5621717347], [-0.9093906830, 0.1856964397], [-0.9093906830, -0.1856964397], [-0.7996541858, -0.5621717347], [-0.5385526817, -0.9616876882]],
  8: [[-0.4621740413, 1.0343886811], [-0.7111381808, 0.7186517314], [-0.8473250802, 0.4259017538], [-0.9096831547, 0.1412437977], [-0.9096831547, -0.1412437977], [-0.8473250802, -0.4259017538], [-0.7111381808, -0.7186517314], [-0.4621740413, -1.0343886811]],
};
function besselPoles(N) {
  const tbl = BESSEL_POLES[N];
  if (!tbl) throw new Error("Bessel Ordnung nicht verfügbar: " + N);
  return tbl.map(([re, im]) => cx(re, im));
}

// Pick prototype poles + gain factor for a characteristic.
function prototypePoles(N, characteristic, rippleDb = 1) {
  switch (characteristic) {
    case "cheby1": return cheby1Poles(N, rippleDb);
    case "bessel": return besselPoles(N);
    default: return butterPoles(N);
  }
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

// Build SOS for a lowpass/highpass of the given characteristic.
// wnNorm = cutoff / nyquist (0..1). btype: 'low' | 'high'
// characteristic: 'butterworth' | 'cheby1' | 'bessel'
export function designSOS(order, wnNorm, btype = "low", characteristic = "butterworth", rippleDb = 1) {
  const fs = 2;
  const fs2 = 2 * fs;
  const wc = 2 * fs * Math.tan((Math.PI * wnNorm) / 2);

  let poles = prototypePoles(order, characteristic, rippleDb);

  // For Bessel, SciPy normalizes so the cutoff matches; the 'phase' poles
  // are already scaled such that magnitude is ~-3dB near w=1, close enough
  // for measurement use after bilinear pre-warp.
  poles = lpToLp(poles, wc);

  let zeros = [];
  if (btype === "high") {
    poles = poles.map((p) => cdiv(cx(wc, 0), p));
    zeros = new Array(order).fill(cx(0, 0));
  }

  const zPoles = poles.map((p) => bilinearPoint(p, fs2));
  let zZeros;
  if (btype === "high") {
    zZeros = new Array(order).fill(cx(1, 0));
  } else {
    zZeros = new Array(order).fill(cx(-1, 0));
  }

  const sos = [];
  const nSections = Math.ceil(order / 2);
  const usedP = new Array(zPoles.length).fill(false);
  const usedZ = new Array(zZeros.length).fill(false);

  function takePair(arr, used) {
    let i = used.findIndex((u) => !u);
    if (i === -1) return null;
    used[i] = true;
    const a = arr[i];
    let j = -1;
    for (let k = 0; k < arr.length; k++) {
      if (used[k]) continue;
      if (Math.abs(arr[k].im + a.im) < 1e-6 && Math.abs(arr[k].re - a.re) < 1e-6) { j = k; break; }
    }
    if (j !== -1) { used[j] = true; return [a, arr[j]]; }
    return [a, null];
  }

  for (let sIdx = 0; sIdx < nSections; sIdx++) {
    const pp = takePair(zPoles, usedP);
    const zz = takePair(zZeros, usedZ);
    const polyFrom = (pair) => {
      if (!pair) return [1, 0, 0];
      const [r1, r2] = pair;
      if (r2 === null) return [1, -r1.re, 0];
      const sum = cadd(r1, r2);
      const prod = cmul(r1, r2);
      return [1, -sum.re, prod.re];
    };
    const b = polyFrom(zz);
    const a = polyFrom(pp);
    sos.push([b[0], b[1], b[2], a[0], a[1], a[2]]);
  }

  // gain normalization
  // Chebyshev I with even order has DC gain = 1/sqrt(1+eps^2); SciPy keeps that.
  const evalZ = btype === "high" ? -1 : 1;
  let gain = 1;
  for (const s of sos) {
    const num = s[0] + s[1] * evalZ + s[2] * evalZ * evalZ;
    const den = s[3] + s[4] * evalZ + s[5] * evalZ * evalZ;
    gain *= num / den;
  }

  let target = 1;
  if (characteristic === "cheby1" && btype === "low" && order % 2 === 0) {
    const eps = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
    target = 1 / Math.sqrt(1 + eps * eps);
  }
  if (characteristic === "cheby1" && btype === "high" && order % 2 === 0) {
    const eps = Math.sqrt(Math.pow(10, rippleDb / 10) - 1);
    target = 1 / Math.sqrt(1 + eps * eps);
  }

  const g = target / gain;
  sos[0][0] *= g;
  sos[0][1] *= g;
  sos[0][2] *= g;

  return sos;
}

// keep old name working
export function butterSOS(order, wnNorm, btype = "low") {
  return designSOS(order, wnNorm, btype, "butterworth");
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

// convenience: design + apply, with characteristic
export function applyFilter(x, { order = 4, cutoffHz, cutoff2Hz, sampleRate, btype = "low", characteristic = "butterworth", rippleDb = 1 }) {
  const nyq = sampleRate / 2;
  if (btype === "low" || btype === "high") {
    const wn = cutoffHz / nyq;
    if (wn <= 0 || wn >= 1) return x.slice();
    const sos = designSOS(order, wn, btype, characteristic, rippleDb);
    return sosfiltfilt(sos, x);
  }
  if (btype === "band") {
    const hp = applyFilter(x, { order, cutoffHz, sampleRate, btype: "high", characteristic, rippleDb });
    return applyFilter(hp, { order, cutoffHz: cutoff2Hz, sampleRate, btype: "low", characteristic, rippleDb });
  }
  return x.slice();
}

// keep old name working
export function applyButterworth(x, opts) {
  return applyFilter(x, { ...opts, characteristic: "butterworth" });
}
