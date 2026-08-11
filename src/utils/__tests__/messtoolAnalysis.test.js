import { describe, it, expect } from "vitest";
import { mean, rms, variance, stddev, minMax, derivative, integral, dft, fft } from "../messtoolAnalysis.js";

describe("messtoolAnalysis", () => {
  it("mean computes the arithmetic average", () => {
    expect(mean([1, 2, 3, 4])).toBeCloseTo(2.5);
  });

  it("rms computes the root-mean-square", () => {
    expect(rms([3, 4])).toBeCloseTo(Math.sqrt((9 + 16) / 2));
  });

  it("variance and stddev are consistent with each other", () => {
    const y = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(stddev(y)).toBeCloseTo(Math.sqrt(variance(y)));
  });

  it("variance of a constant series is zero", () => {
    expect(variance([5, 5, 5, 5])).toBeCloseTo(0);
  });

  it("minMax finds the extremes", () => {
    expect(minMax([3, -1, 7, 2])).toEqual({ min: -1, max: 7 });
  });

  it("derivative of a linear ramp is constant", () => {
    const t = [0, 1, 2, 3];
    const y = [0, 2, 4, 6]; // slope 2
    const d = derivative(y, t);
    for (const v of d) expect(v).toBeCloseTo(2);
  });

  it("integral of a constant signal grows linearly (cumsum*dt convention)", () => {
    const t = [0, 1, 2, 3];
    const y = [1, 1, 1, 1];
    const i = integral(y, t);
    // documented as cumsum(y)*dt, so with dt=1 this is exactly 1,2,3,4
    expect(i).toEqual([1, 2, 3, 4]);
  });
});

describe("dft (Bluestein / exact-length DFT) vs a slow reference DFT", () => {
  // A textbook O(N^2) DFT — deliberately independent of our own
  // implementation, so it's a genuine cross-check, not just re-testing
  // the same code against itself.
  function referenceDft(reIn, imIn) {
    const N = reIn.length;
    const re = new Array(N).fill(0);
    const im = new Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      let sr = 0, si = 0;
      for (let n = 0; n < N; n++) {
        const ang = (-2 * Math.PI * k * n) / N;
        const c = Math.cos(ang), s = Math.sin(ang);
        sr += reIn[n] * c - imIn[n] * s;
        si += reIn[n] * s + imIn[n] * c;
      }
      re[k] = sr;
      im[k] = si;
    }
    return { re, im };
  }

  const lengths = [5, 7, 12, 13, 17, 30, 100]; // primes and composites, none powers of 2
  for (const N of lengths) {
    it(`matches a direct DFT for N=${N} (non-power-of-2)`, () => {
      const re = Array.from({ length: N }, (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 1.9));
      const im = new Array(N).fill(0);
      const got = dft(re.slice(), im.slice());
      const want = referenceDft(re, im);
      for (let k = 0; k < N; k++) {
        expect(got.re[k]).toBeCloseTo(want.re[k], 6);
        expect(got.im[k]).toBeCloseTo(want.im[k], 6);
      }
    });
  }

  it("matches a direct DFT for a power-of-2 length too (fast path)", () => {
    const N = 16;
    const re = Array.from({ length: N }, (_, i) => Math.sin(i * 0.5));
    const im = new Array(N).fill(0);
    const got = dft(re.slice(), new Array(N).fill(0));
    const want = referenceDft(re, im);
    for (let k = 0; k < N; k++) {
      expect(got.re[k]).toBeCloseTo(want.re[k], 6);
      expect(got.im[k]).toBeCloseTo(want.im[k], 6);
    }
  });
});

describe("fft — amplitude scaling and non-power-of-2 lengths", () => {
  it("recovers close to the true amplitude of a pure sine (rectangular window, no zero-padding)", () => {
    const N = 300; // deliberately not a power of 2
    const fs = 100;
    const freqHz = 10;
    const amplitude = 3;
    const t = Array.from({ length: N }, (_, i) => i / fs);
    const y = t.map((ti) => amplitude * Math.sin(2 * Math.PI * freqHz * ti));
    const { freq, amp } = fft(y, t, { windowType: "none", normalize: true });
    const peakIdx = amp.indexOf(Math.max(...amp));
    expect(freq[peakIdx]).toBeCloseTo(freqHz, 0);
    expect(amp[peakIdx]).toBeCloseTo(amplitude, 1);
  });

  it("phase spectrum: a pure cosine (phase 0) peaks near 0°, a pure sine (phase -90°) peaks near -90°, at the tone's own bin", () => {
    // Used by the Anzeige page's new phase-frequency-response plot —
    // this locks in that phaseDeg is actually meaningful (matches the
    // real phase of a known tone), not just present.
    const N = 300;
    const fs = 100;
    const freqHz = 10;
    const t = Array.from({ length: N }, (_, i) => i / fs);

    const yCos = t.map((ti) => Math.cos(2 * Math.PI * freqHz * ti));
    const cosResult = fft(yCos, t, { windowType: "none", normalize: true });
    const cosPeakIdx = cosResult.amp.indexOf(Math.max(...cosResult.amp));
    expect(cosResult.phaseDeg[cosPeakIdx]).toBeCloseTo(0, 0);

    const ySin = t.map((ti) => Math.sin(2 * Math.PI * freqHz * ti));
    const sinResult = fft(ySin, t, { windowType: "none", normalize: true });
    const sinPeakIdx = sinResult.amp.indexOf(Math.max(...sinResult.amp));
    expect(sinResult.phaseDeg[sinPeakIdx]).toBeCloseTo(-90, 0);
  });

  it("has exactly N//2 + 1 bins (matches numpy/scipy's rfft convention), not a power-of-2-padded count", () => {
    const N = 137; // prime, nowhere near a power of 2
    const t = Array.from({ length: N }, (_, i) => i / 50);
    const y = t.map((ti) => Math.sin(ti));
    const { freq } = fft(y, t, { windowType: "none" });
    expect(freq).toHaveLength(Math.floor(N / 2) + 1);
  });
});

describe("derivative — edge handling matches numpy's np.gradient", () => {
  it("uses the second-order accurate one-sided formula at both edges", () => {
    // y = x^2 has derivative dy/dx = 2x exactly, everywhere — including
    // the edges, unlike a plain forward/backward difference, which numpy's
    // second-order edge stencil gets exactly right too.
    const dt = 1;
    const t = [0, 1, 2, 3, 4, 5];
    const y = t.map((x) => x * x);
    const d = derivative(y, t);
    for (let i = 0; i < t.length; i++) {
      expect(d[i]).toBeCloseTo(2 * t[i], 6);
    }
    void dt;
  });

  it("still matches for 2-point signals (falls back to a plain difference, as numpy does)", () => {
    const d = derivative([1, 3], [0, 1]);
    expect(d[0]).toBeCloseTo(2, 6);
    expect(d[1]).toBeCloseTo(2, 6);
  });
});
