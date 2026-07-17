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
  out[0] = (y[1] - y[0]) / dt;
  out[n - 1] = (y[n - 1] - y[n - 2]) / dt;
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

// Compute single-sided amplitude spectrum.
// Returns { freq:[Hz], amp:[], sampleRate }.
export function fft(y, t, { windowType = "hann", normalize = true } = {}) {
  const N = y.length;
  if (N < 2) return { freq: [], amp: [], sampleRate: 0 };

  const T = t[t.length - 1] - t[0];
  const sampleRate = N / T;
  const dt = 1 / sampleRate;

  // window
  const win = getWindow(N, windowType);

  // zero-pad to next power of two
  let size = 1;
  while (size < N) size <<= 1;

  const re = new Array(size).fill(0);
  const im = new Array(size).fill(0);
  for (let i = 0; i < N; i++) re[i] = (y[i] ?? 0) * win[i];

  fftRadix2(re, im);

  const half = size / 2;
  const freq = new Array(half);
  const amp = new Array(half);
  for (let k = 0; k < half; k++) {
    freq[k] = (k * sampleRate) / size;
    let a = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    if (normalize) a /= N;
    amp[k] = a;
  }
  return { freq, amp, sampleRate };
}
