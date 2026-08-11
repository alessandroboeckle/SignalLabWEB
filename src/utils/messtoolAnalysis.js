// Analysis functions, mirroring hilfsklassen/daten_verarbeiter.py from the
// original Messtool so results match.

// mean
export function mean(y) {
  if (!y || y.length === 0) return null;
  let s = 0, n = 0;
  for (const v of y) if (v != null && Number.isFinite(v)) { s += v; n++; }
  return n ? s / n : null;
}

// RMS = sqrt(mean(y^2))
export function rms(y) {
  if (!y || y.length === 0) return null;
  let s = 0, n = 0;
  for (const v of y) if (v != null && Number.isFinite(v)) { s += v * v; n++; }
  return n ? Math.sqrt(s / n) : null;
}

// population variance (np.var default)
export function variance(y) {
  const m = mean(y);
  if (m == null) return null;
  let s = 0, n = 0;
  for (const v of y) if (v != null && Number.isFinite(v)) { s += (v - m) ** 2; n++; }
  return n ? s / n : null;
}

export function stddev(y) {
  const v = variance(y);
  return v == null ? null : Math.sqrt(v);
}

export function minMax(y) {
  let mn = Infinity, mx = -Infinity;
  for (const v of y) if (v != null && Number.isFinite(v)) {
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  return { min: mn === Infinity ? null : mn, max: mx === -Infinity ? null : mx };
}

// mean sample spacing from a time array
function meanDt(t) {
  if (!t || t.length < 2) return 1;
  let s = 0;
  for (let i = 1; i < t.length; i++) s += t[i] - t[i - 1];
  return s / (t.length - 1);
}

// derivative dY/dt, like np.gradient (central differences, one-sided at edges)
export function derivative(y, t) {
  const n = y.length;
  if (n < 2) return y.slice();
  const out = new Array(n);
  const dt = meanDt(t);
  if (n < 3) {
    // Only 2 points — no second-order stencil possible, numpy falls back
    // to a plain forward/backward difference for both, same as we do.
    out[0] = (y[1] - y[0]) / dt;
    out[1] = (y[1] - y[0]) / dt;
    return out;
  }
  // Edges use numpy's second-order accurate one-sided formula (np.gradient's
  // default), not a plain forward/backward difference — matters for a
  // bin-for-bin match against numpy at the very first/last sample.
  out[0] = (-3 * y[0] + 4 * y[1] - y[2]) / (2 * dt);
  out[n - 1] = (3 * y[n - 1] - 4 * y[n - 2] + y[n - 3]) / (2 * dt);
  for (let i = 1; i < n - 1; i++) {
    out[i] = (y[i + 1] - y[i - 1]) / (2 * dt);
  }
  return out;
}

// integral ∫Y dt via cumulative sum * dt (matches np.cumsum(y)*dt)
export function integral(y, t) {
  const dt = meanDt(t);
  const out = new Array(y.length);
  let acc = 0;
  for (let i = 0; i < y.length; i++) {
    acc += (y[i] ?? 0);
    out[i] = acc * dt;
  }
  return out;
}

// --- FFT ---

// Hann / Hamming / Blackman / rectangular window
function getWindow(N, type) {
  const w = new Array(N);
  if (type === "hann") {
    for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  } else if (type === "hamming") {
    for (let i = 0; i < N; i++) w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
  } else if (type === "blackman") {
    for (let i = 0; i < N; i++) {
      w[i] = 0.42
        - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
        + 0.08 * Math.cos((4 * Math.PI * i) / (N - 1));
    }
  } else {
    w.fill(1);
  }
  return w;
}

// Inverse of fftRadix2 (conjugate trick), in place, length must be power of 2.
function ifftRadix2(re, im) {
  const n = re.length;
  for (let i = 0; i < n; i++) im[i] = -im[i];
  fftRadix2(re, im);
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
}

// Bluestein's algorithm (chirp-z transform): computes the exact DFT for ANY
// length N by rewriting it as a convolution, which a power-of-2 FFT can
// still do — without ever zero-padding the *signal itself*. That distinction
// matters: zero-padding the signal computes the DFT of a different, longer,
// zero-padded sequence (numerically valid, but not what scipy/numpy give
// you for the same signal, so the two aren't directly comparable bin for
// bin). Bluestein gives the exact same N frequency bins numpy/scipy would.
function bluesteinDft(reIn, imIn) {
  const N = reIn.length;
  if (N === 0) return { re: [], im: [] };
  if (N === 1) return { re: [reIn[0]], im: [imIn[0]] };

  let M = 1;
  while (M < 2 * N - 1) M <<= 1;

  // cos/sin of the chirp angle pi*i^2/N, reduced mod 2N first to avoid
  // precision loss from squaring large indices.
  const cosT = new Array(N);
  const sinT = new Array(N);
  for (let i = 0; i < N; i++) {
    const j = (i * i) % (2 * N);
    const ang = (Math.PI * j) / N;
    cosT[i] = Math.cos(ang);
    sinT[i] = Math.sin(ang);
  }

  const aRe = new Array(M).fill(0);
  const aIm = new Array(M).fill(0);
  for (let i = 0; i < N; i++) {
    aRe[i] = reIn[i] * cosT[i] + imIn[i] * sinT[i];
    aIm[i] = imIn[i] * cosT[i] - reIn[i] * sinT[i];
  }

  const bRe = new Array(M).fill(0);
  const bIm = new Array(M).fill(0);
  bRe[0] = cosT[0];
  bIm[0] = sinT[0];
  for (let i = 1; i < N; i++) {
    bRe[i] = cosT[i];
    bIm[i] = sinT[i];
    bRe[M - i] = cosT[i];
    bIm[M - i] = sinT[i];
  }

  fftRadix2(aRe, aIm);
  fftRadix2(bRe, bIm);
  const cRe = new Array(M);
  const cIm = new Array(M);
  for (let i = 0; i < M; i++) {
    cRe[i] = aRe[i] * bRe[i] - aIm[i] * bIm[i];
    cIm[i] = aRe[i] * bIm[i] + aIm[i] * bRe[i];
  }
  ifftRadix2(cRe, cIm);

  const outRe = new Array(N);
  const outIm = new Array(N);
  for (let i = 0; i < N; i++) {
    outRe[i] = cRe[i] * cosT[i] + cIm[i] * sinT[i];
    outIm[i] = cIm[i] * cosT[i] - cRe[i] * sinT[i];
  }
  return { re: outRe, im: outIm };
}

// Exact DFT for any N — power-of-2 lengths use the fast radix-2 path
// directly (no padding needed, it's already the right length); every other
// length goes through Bluestein. Either way this is the true DFT of
// exactly the N samples given, matching numpy.fft.fft / scipy.fft.fft.
export function dft(reIn, imIn) {
  const N = reIn.length;
  if ((N & (N - 1)) === 0 && N > 0) {
    const re = reIn.slice();
    const im = imIn.slice();
    fftRadix2(re, im);
    return { re, im };
  }
  return bluesteinDft(reIn, imIn);
}

// Iterative radix-2 FFT on real input (zero-padded to next power of two).
// Returns { re, im } arrays.
function fftRadix2(re, im) {
  const n = re.length;
  // bit reversal
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curR = 1, curI = 0;
      for (let k = 0; k < len / 2; k++) {
        const aR = re[i + k], aI = im[i + k];
        const bR = re[i + k + len / 2], bI = im[i + k + len / 2];
        const tR = curR * bR - curI * bI;
        const tI = curR * bI + curI * bR;
        re[i + k] = aR + tR;
        im[i + k] = aI + tI;
        re[i + k + len / 2] = aR - tR;
        im[i + k + len / 2] = aI - tI;
        const nR = curR * wr - curI * wi;
        curI = curR * wi + curI * wr;
        curR = nR;
      }
    }
  }
  return { re, im };
}

// Compute single-sided amplitude (+ phase) spectrum.
// Returns { freq:[Hz], amp:[], phaseDeg:[], sampleRate }.
export function fft(y, t, { windowType = "hann", normalize = true } = {}) {
  const N = y.length;
  if (N < 2) return { freq: [], amp: [], phaseDeg: [], sampleRate: 0 };

  const T = t[t.length - 1] - t[0];
  const sampleRate = N / T;

  const win = getWindow(N, windowType);
  const reIn = new Array(N);
  const imIn = new Array(N).fill(0);
  for (let i = 0; i < N; i++) reIn[i] = (y[i] ?? 0) * win[i];

  const { re, im } = dft(reIn, imIn);

  // Single-sided spectrum: bins 0..N/2 inclusive (matches numpy/scipy's
  // rfftfreq length of N//2 + 1), not the padded-length half used before.
  const half = Math.floor(N / 2) + 1;
  const freq = new Array(half);
  const amp = new Array(half);
  const phaseDeg = new Array(half);
  for (let k = 0; k < half; k++) {
    freq[k] = (k * sampleRate) / N;
    let a = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    // *2/N (not just /N) — matches the actual single-sided amplitude
    // convention used elsewhere in the Python tool's own FFT plot
    // (analyse_plotter.py: `np.abs(fft_complex) * 2 / n`), applied
    // uniformly to every bin the same way that code does.
    if (normalize) a = (a * 2) / N;
    amp[k] = a;
    phaseDeg[k] = (Math.atan2(im[k], re[k]) * 180) / Math.PI;
  }
  return { freq, amp, phaseDeg, sampleRate };
}
