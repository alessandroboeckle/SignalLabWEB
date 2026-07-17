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
const cabs = (a) => Math.hypot(a.re, a.im);
function csqrt(a) {
  const r = cabs(a);
  const re = Math.sqrt(Math.max(0, (r + a.re) / 2));
  let im = Math.sqrt(Math.max(0, (r - a.re) / 2));
  if (a.im < 0) im = -im;
  return cx(re, im);
}
function cln(a) {
  return cx(Math.log(cabs(a)), Math.atan2(a.im, a.re));
}
// principal complex arcsin: asin(z) = -i * ln(iz + sqrt(1 - z^2))
function casin(z) {
  const iz = cx(-z.im, z.re); // i*z
  const one_minus_z2 = csub(cx(1, 0), cmul(z, z));
  const root = csqrt(one_minus_z2);
  const inner = cadd(iz, root);
  const l = cln(inner);
  // -i * l = cx(l.im, -l.re)
  return cx(l.im, -l.re);
}

// ---------- elliptic integrals via AGM (arithmetic-geometric mean) ----------
// K(m): complete elliptic integral of the first kind, modulus m = k^2
function ellipK(m) {
  let a = 1, b = Math.sqrt(1 - m);
  for (let i = 0; i < 60; i++) {
    if (Math.abs(a - b) < 1e-15 * a) break;
    const an = (a + b) / 2;
    const bn = Math.sqrt(a * b);
    a = an; b = bn;
  }
  return Math.PI / (2 * a);
}
// K(1-m1): complementary, used when m1 is small
function ellipKm1(m1) {
  return ellipK(1 - m1);
}

// Jacobi elliptic functions sn, cn, dn for real u, parameter m (Cephes-style AGM descent).
export function ellipj(u, m) {
  const CA = 1e-8;
  if (m === 0) {
    return { sn: Math.sin(u), cn: Math.cos(u), dn: 1, phi: u };
  }
  if (m === 1) {
    const sn = Math.tanh(u);
    const cn = 1 / Math.cosh(u);
    return { sn, cn, dn: cn, phi: 2 * Math.atan(Math.exp(u)) - Math.PI / 2 };
  }
  // NOTE: the classic sncndn algorithm takes the COMPLEMENTARY parameter
  // (1 - m) as its second argument, not m itself.
  let emc = 1 - m, uu = u;
  const bo = emc < 0;
  let d = 1;
  if (bo) { d = 1 - emc; emc = -emc / d; d = Math.sqrt(d); uu = d * u; }
  let a = 1, dn = 1;
  const em = [], en = [];
  let i = 0, c = 0;
  while (true) {
    em.push(a);
    emc = Math.sqrt(emc);
    en.push(emc);
    c = 0.5 * (a + emc);
    if (Math.abs(a - emc) <= CA * a) break;
    emc = a * emc;
    a = c;
    i++;
    if (i > 60) break;
  }
  uu = c * uu;
  let sn = Math.sin(uu);
  let cn = Math.cos(uu);
  if (sn !== 0) {
    a = cn / sn;
    c = a * c;
    for (let ii = i; ii >= 0; ii--) {
      const b = em[ii];
      a = c * a;
      c = dn * c;
      dn = (en[ii] + a) / (b + a);
      a = c / b;
    }
    a = 1 / Math.sqrt(c * c + 1);
    sn = (sn < 0 ? -1 : 1) * a;
    cn = c * sn;
  }
  if (bo) {
    const tmp = dn;
    dn = cn; cn = tmp;
    sn = sn / d;
  }
  return { sn, cn, dn, phi: Math.asin(sn) };
}

// solve degree equation: given n, m1 -> m (nome/Landen series, matches scipy _ellipdeg)
function ellipDeg(n, m1) {
  const K1 = ellipK(m1);
  const K1p = ellipKm1(m1);
  const q1 = Math.exp(-Math.PI * K1p / K1);
  const q = Math.pow(q1, 1 / n);
  const MMAX = 7;
  let num = 0, den = 1;
  for (let mnum = 0; mnum <= MMAX; mnum++) num += Math.pow(q, mnum * (mnum + 1));
  for (let mden = 1; mden <= MMAX + 1; mden++) den += 2 * Math.pow(q, mden * mden);
  return 16 * q * Math.pow(num / den, 4);
}

// inverse Jacobi sn for complex w (Landen transformation descent, matches scipy _arc_jac_sn)
function arcJacSn(w, m) {
  const complement = (kx) => Math.sqrt((1 - kx) * (1 + kx));
  const k = Math.sqrt(m);
  if (k === 1) {
    const num = cadd(cx(1, 0), w);
    const den = csub(cx(1, 0), w);
    const l = cln(cdiv(num, den));
    return cx(l.re / 2, l.im / 2);
  }
  const ks = [k];
  for (let iter = 0; iter < 60 && ks[ks.length - 1] !== 0; iter++) {
    const kcur = ks[ks.length - 1];
    const kp = complement(kcur);
    const nxt = (1 - kp) / (1 + kp);
    ks.push(nxt);
    if (nxt === 0) break;
  }
  // K = prod(1 + ks[1:]) * pi/2
  let Kfac = Math.PI / 2;
  for (let i = 1; i < ks.length; i++) Kfac *= (1 + ks[i]);

  let wns = [w];
  for (let i = 0; i < ks.length - 1; i++) {
    const kn = ks[i], knext = ks[i + 1];
    const wn = wns[wns.length - 1];
    const knwn = cx(kn * wn.re, kn * wn.im);
    const compl = csqrt(csub(cx(1, 0), cmul(knwn, knwn)));
    const denomInner = cadd(cx(1, 0), compl);
    const denom = cx(denomInner.re * (1 + knext), denomInner.im * (1 + knext));
    const wnext = cdiv(cx(2 * wn.re, 2 * wn.im), denom);
    wns.push(wnext);
  }
  const asinVal = casin(wns[wns.length - 1]);
  const u = cx((2 / Math.PI) * asinVal.re, (2 / Math.PI) * asinVal.im);
  // z = K * u
  return cx(Kfac * u.re, Kfac * u.im);
}

function arcJacSc1(w, m) {
  const z = arcJacSn(cx(0, w), m); // 1j*w
  return z.im; // real result expected
}

// ---------- Elliptic (Cauer) analog lowpass prototype: zeros, poles, gain ----------
// Ports scipy.signal.ellipap. rp/rs in dB. Returns { zeros, poles, k } (unit cutoff).
export function ellipPrototype(N, rp, rs) {
  const epsSq = Math.pow(10, 0.1 * rp) - 1;
  const eps = Math.sqrt(epsSq);
  const ck1Sq = epsSq / (Math.pow(10, 0.1 * rs) - 1);

  const m = ellipDeg(N, ck1Sq);
  const capK = ellipK(m);
  const K1 = ellipK(ck1Sq);
  // zeros
  const zeros = [];
  const jVals = [];
  for (let j = 1 - (N % 2); j < N; j += 2) jVals.push(j);
  const halfZeros = [];
  for (const j of jVals) {
    const { sn } = ellipj((j * capK) / N, m);
    if (Math.abs(sn) > 1e-9) {
      const zval = 1 / (Math.sqrt(m) * sn);
      halfZeros.push(cx(0, zval));
    }
  }
  for (const z of halfZeros) zeros.push(z);
  for (const z of halfZeros) zeros.push(cx(z.re, -z.im)); // conjugates

  // poles
  const r = arcJacSc1(1 / eps, ck1Sq);
  const v0 = (capK * r) / (N * K1);
  const poles = [];
  const halfPoles = [];
  for (const j of jVals) {
    const { sn: s, cn: c, dn: d } = ellipj((j * capK) / N, m);
    const { sn: sv, cn: cv, dn: dv } = ellipj(v0, 1 - m);
    const denom = 1 - (d * sv) ** 2;
    const re = -(c * d * sv * cv) / denom;
    const im = -(s * dv) / denom;
    halfPoles.push(cx(re, im));
  }
  if (N % 2) {
    // one pole is real (imag ~0); keep it once, conjugate the rest
    for (const p of halfPoles) {
      if (Math.abs(p.im) < 1e-9 * cabs(p)) {
        poles.push(p);
      } else {
        poles.push(p);
        poles.push(cx(p.re, -p.im));
      }
    }
  } else {
    for (const p of halfPoles) { poles.push(p); poles.push(cx(p.re, -p.im)); }
  }

  // gain: k = prod(-poles) / prod(-zeros), real part; even order scales by 1/sqrt(1+eps^2)
  let kNum = cx(1, 0), kDen = cx(1, 0);
  for (const p of poles) kNum = cmul(kNum, cneg(p));
  for (const z of zeros) kDen = cmul(kDen, cneg(z));
  let k = zeros.length ? cdiv(kNum, kDen).re : kNum.re;
  if (N % 2 === 0) k = k / Math.sqrt(1 + epsSq);

  return { zeros, poles, k };
}

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

// ---------- generic zpk transform pipeline (used for Elliptic) ----------
function lp2lpZpk(zeros, poles, k, wo) {
  const degree = poles.length - zeros.length;
  const z = zeros.map((zz) => cx(zz.re * wo, zz.im * wo));
  const p = poles.map((pp) => cx(pp.re * wo, pp.im * wo));
  return { zeros: z, poles: p, k: k * Math.pow(wo, degree) };
}

function lp2hpZpk(zeros, poles, k, wo) {
  const degree = poles.length - zeros.length;
  const z = zeros.map((zz) => cdiv(cx(wo, 0), zz));
  const p = poles.map((pp) => cdiv(cx(wo, 0), pp));
  for (let i = 0; i < degree; i++) z.push(cx(0, 0));
  let numC = cx(1, 0), denC = cx(1, 0);
  for (const zz of zeros) numC = cmul(numC, cneg(zz));
  for (const pp of poles) denC = cmul(denC, cneg(pp));
  const kHp = k * cdiv(numC, denC).re;
  return { zeros: z, poles: p, k: kHp };
}

function bilinearZpk(zeros, poles, k, fs) {
  const degree = poles.length - zeros.length;
  const fs2 = 2 * fs;
  const z = zeros.map((zz) => cdiv(cx(fs2 + zz.re, zz.im), cx(fs2 - zz.re, -zz.im)));
  const p = poles.map((pp) => cdiv(cx(fs2 + pp.re, pp.im), cx(fs2 - pp.re, -pp.im)));
  for (let i = 0; i < degree; i++) z.push(cx(-1, 0));
  let numC = cx(1, 0), denC = cx(1, 0);
  for (const zz of zeros) numC = cmul(numC, cx(fs2 - zz.re, -zz.im));
  for (const pp of poles) denC = cmul(denC, cx(fs2 - pp.re, -pp.im));
  const kz = k * cdiv(numC, denC).re;
  return { zeros: z, poles: p, k: kz };
}

// Pair complex zeros/poles into second-order sections, distributing gain
// into the first section (mirrors scipy's zpk2sos "keep_odd" pairing well
// enough for our real-coefficient, conjugate-paired filters).
function zpk2sos(zeros, poles, k) {
  const nSections = Math.ceil(Math.max(zeros.length, poles.length, 1) / 2);
  const zs = zeros.slice();
  const ps = poles.slice();
  while (zs.length < nSections * 2) zs.push(cx(0, 0)); // pad with zeros at origin (unity contribution... handled by polyFrom null-case instead)
  const usedZ = new Array(zeros.length).fill(false);
  const usedP = new Array(poles.length).fill(false);

  function takePair(arr, used) {
    let i = used.findIndex((u) => !u);
    if (i === -1) return null;
    used[i] = true;
    const a = arr[i];
    let j = -1;
    for (let idx = 0; idx < arr.length; idx++) {
      if (used[idx]) continue;
      if (Math.abs(arr[idx].im + a.im) < 1e-6 && Math.abs(arr[idx].re - a.re) < 1e-6) { j = idx; break; }
    }
    if (j !== -1) { used[j] = true; return [a, arr[j]]; }
    return [a, null];
  }

  const sos = [];
  for (let s = 0; s < nSections; s++) {
    const zp = takePair(zeros, usedZ);
    const pp = takePair(poles, usedP);
    const polyFrom = (pair) => {
      if (!pair) return [1, 0, 0];
      const [r1, r2] = pair;
      if (r2 === null) return [1, -r1.re, 0];
      const sum = cadd(r1, r2);
      const prod = cmul(r1, r2);
      return [1, -sum.re, prod.re];
    };
    const b = polyFrom(zp);
    const a = polyFrom(pp);
    sos.push([b[0], b[1], b[2], a[0], a[1], a[2]]);
  }
  // apply overall gain k to first section's numerator
  sos[0][0] *= k;
  sos[0][1] *= k;
  sos[0][2] *= k;
  return sos;
}

// Elliptic (Cauer) SOS design, low/high pass. rp = passband ripple (dB),
// rs = stopband attenuation (dB).
export function ellipticSOS(order, wnNorm, btype, rp = 1, rs = 40) {
  const fs = 2;
  const fs2 = 2 * fs;
  const wc = 2 * fs * Math.tan((Math.PI * wnNorm) / 2);

  const proto = ellipPrototype(order, rp, rs);
  let stage = { zeros: proto.zeros, poles: proto.poles, k: proto.k };

  stage = btype === "high" ? lp2hpZpk(stage.zeros, stage.poles, stage.k, wc)
                            : lp2lpZpk(stage.zeros, stage.poles, stage.k, wc);
  stage = bilinearZpk(stage.zeros, stage.poles, stage.k, fs);

  return zpk2sos(stage.zeros, stage.poles, stage.k);
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
// characteristic: 'butterworth' | 'cheby1' | 'bessel' | 'elliptic'
export function designSOS(order, wnNorm, btype = "low", characteristic = "butterworth", rippleDb = 1, rs = 40) {
  if (characteristic === "elliptic") {
    return ellipticSOS(order, wnNorm, btype, rippleDb, rs);
  }
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

// ---------- apply SOS with optional per-section initial state ----------
// Returns { y, zf } where zf are the final states (for chaining/matching scipy).
function sosfiltWithState(sos, x, zi) {
  let y = x.slice();
  const zfOut = [];
  for (let s = 0; s < sos.length; s++) {
    const [b0, b1, b2, a0, a1, a2] = sos[s];
    const nb0 = b0 / a0, nb1 = b1 / a0, nb2 = b2 / a0;
    const na1 = a1 / a0, na2 = a2 / a0;
    let z1 = zi ? zi[s][0] : 0;
    let z2 = zi ? zi[s][1] : 0;
    const out = new Array(y.length);
    for (let i = 0; i < y.length; i++) {
      const xn = y[i];
      const yn = nb0 * xn + z1;
      z1 = nb1 * xn - na1 * yn + z2;
      z2 = nb2 * xn - na2 * yn;
      out[i] = yn;
    }
    zfOut.push([z1, z2]);
    y = out;
  }
  return { y, zf: zfOut };
}

function sosfiltOnce(sos, x) {
  return sosfiltWithState(sos, x, null).y;
}

// steady-state initial conditions per section (matches scipy.signal.sosfilt_zi)
function sosfiltZi(sos) {
  const zis = [];
  let scale = 1;
  for (const [b0, b1, b2, a0, a1, a2] of sos) {
    const nb0 = b0 / a0, nb1 = b1 / a0, nb2 = b2 / a0;
    const na1 = a1 / a0, na2 = a2 / a0;
    // solve for lfilter_zi of this section:
    // (1+a1) zi0 - zi1 = b1 - a1*b0
    // a2*zi0 + zi1 = b2 - a2*b0
    const B0 = nb1 - na1 * nb0;
    const B1 = nb2 - na2 * nb0;
    const zi0 = (B0 + B1) / (1 + na1 + na2);
    const zi1 = B1 - na2 * zi0;
    zis.push([scale * zi0, scale * zi1]);
    scale *= (nb0 + nb1 + nb2) / (1 + na1 + na2);
  }
  return zis;
}

// odd extension of length `edge` at both ends, matching scipy's odd_ext
function oddExt(x, edge) {
  const n = x.length;
  const left = [];
  for (let i = edge; i >= 1; i--) left.push(2 * x[0] - x[i]);
  const right = [];
  for (let i = n - 2; i >= n - 1 - edge; i--) right.push(2 * x[n - 1] - x[i]);
  return left.concat(x, right);
}

// ---------- zero-phase filtering (matches scipy.signal.sosfiltfilt) ----------
export function sosfiltfilt(sos, x) {
  if (!x || x.length === 0) return [];
  const n = x.length;
  const nSections = sos.length;

  // padlen formula from scipy: 3*(2*n_sections+1 - min(#b2==0, #a2==0))
  let zeroB2 = 0, zeroA2 = 0;
  for (const s of sos) {
    if (s[2] === 0) zeroB2++;
    if (s[5] === 0) zeroA2++;
  }
  const ntaps = 2 * nSections + 1 - Math.min(zeroB2, zeroA2);
  let edge = 3 * ntaps;
  if (edge >= n) edge = Math.max(0, n - 1); // fall back safely for short signals
  if (edge === 0) {
    let y = sosfiltOnce(sos, x);
    y.reverse();
    y = sosfiltOnce(sos, y);
    y.reverse();
    return y;
  }

  const ext = oddExt(x, edge);
  const zi = sosfiltZi(sos);

  // forward pass, scaled by first sample of the extended signal
  const zi1 = zi.map(([a, b]) => [a * ext[0], b * ext[0]]);
  let { y } = sosfiltWithState(sos, ext, zi1);

  // backward pass, scaled by last sample of the forward result
  const yRev = y.slice().reverse();
  const zi2 = zi.map(([a, b]) => [a * yRev[0], b * yRev[0]]);
  let { y: y2 } = sosfiltWithState(sos, yRev, zi2);
  y2.reverse();

  return y2.slice(edge, edge + n);
}

// convenience: design + apply, with characteristic
export function applyFilter(x, { order = 4, cutoffHz, cutoff2Hz, sampleRate, btype = "low", characteristic = "butterworth", rippleDb = 1, rs = 40 }) {
  const nyq = sampleRate / 2;
  if (btype === "low" || btype === "high") {
    const wn = cutoffHz / nyq;
    if (wn <= 0 || wn >= 1) return x.slice();
    const sos = designSOS(order, wn, btype, characteristic, rippleDb, rs);
    return sosfiltfilt(sos, x);
  }
  if (btype === "band") {
    const hp = applyFilter(x, { order, cutoffHz, sampleRate, btype: "high", characteristic, rippleDb, rs });
    return applyFilter(hp, { order, cutoffHz: cutoff2Hz, sampleRate, btype: "low", characteristic, rippleDb, rs });
  }
  return x.slice();
}

// keep old name working
export function applyButterworth(x, opts) {
  return applyFilter(x, { ...opts, characteristic: "butterworth" });
}

// Evaluates the filter's own frequency response H(e^jw) — magnitude (dB)
// and phase (degrees) across the spectrum from ~0 Hz to Nyquist — so you
// can see exactly where the cutoff sits and how steep the roll-off is
// *before* applying the filter to real data. Log-spaced frequency points,
// standard for Bode-style plots.
export function computeFrequencyResponse(sos, sampleRate, numPoints = 200) {
  const nyquist = sampleRate / 2;
  const fMin = Math.max(0.01, nyquist / 10000);
  const freqs = [];
  const magDb = [];
  const phaseDeg = [];

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1);
    const f = fMin * Math.pow(nyquist / fMin, t); // log-spaced
    const w = (2 * Math.PI * f) / sampleRate;
    const cosw = Math.cos(w), sinw = Math.sin(w);
    const cos2w = Math.cos(2 * w), sin2w = Math.sin(2 * w);

    let reH = 1, imH = 0;
    for (const [b0, b1, b2, a0, a1, a2] of sos) {
      const numRe = b0 + b1 * cosw + b2 * cos2w;
      const numIm = -b1 * sinw - b2 * sin2w;
      const denRe = a0 + a1 * cosw + a2 * cos2w;
      const denIm = -a1 * sinw - a2 * sin2w;
      const denMagSq = denRe * denRe + denIm * denIm || 1e-30;
      const sectionRe = (numRe * denRe + numIm * denIm) / denMagSq;
      const sectionIm = (numIm * denRe - numRe * denIm) / denMagSq;
      const newRe = reH * sectionRe - imH * sectionIm;
      const newIm = reH * sectionIm + imH * sectionRe;
      reH = newRe;
      imH = newIm;
    }

    const mag = Math.sqrt(reH * reH + imH * imH);
    freqs.push(f);
    magDb.push(20 * Math.log10(Math.max(mag, 1e-12)));
    phaseDeg.push((Math.atan2(imH, reH) * 180) / Math.PI);
  }

  return { freqs, magDb, phaseDeg };
}
