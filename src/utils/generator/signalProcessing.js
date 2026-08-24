// Signal generation and processing utilities
import { dft } from "../messtoolAnalysis.js";

/**
 * Generate a time array
 * @param {number} duration - Duration in seconds
 * @param {number} samplingRate - Sampling rate in Hz
 * @returns {Float64Array} Time array
 */
export function generateTimeArray(duration, samplingRate) {
  const n = Math.ceil(duration * samplingRate);
  const t = new Float64Array(n);
  const dt = 1 / samplingRate;
  for (let i = 0; i < n; i++) {
    t[i] = i * dt;
  }
  return t;
}

/**
 * Generate sine wave
 * @param {Float64Array} t - Time array
 * @param {number} frequency - Frequency in Hz
 * @param {number} amplitude - Amplitude
 * @param {number} phase - Phase in degrees
 * @returns {Float64Array} Signal values
 */
export function generateSine(t, frequency, amplitude, phase = 0) {
  const phaseRad = (phase * Math.PI) / 180;
  const signal = new Float64Array(t.length);
  for (let i = 0; i < t.length; i++) {
    signal[i] = amplitude * Math.sin(2 * Math.PI * frequency * t[i] + phaseRad);
  }
  return signal;
}

/**
 * Generate cosine wave
 * @param {Float64Array} t - Time array
 * @param {number} frequency - Frequency in Hz
 * @param {number} amplitude - Amplitude
 * @param {number} phase - Phase in degrees
 * @returns {Float64Array} Signal values
 */
export function generateCosine(t, frequency, amplitude, phase = 0) {
  const phaseRad = (phase * Math.PI) / 180;
  const signal = new Float64Array(t.length);
  for (let i = 0; i < t.length; i++) {
    signal[i] = amplitude * Math.cos(2 * Math.PI * frequency * t[i] + phaseRad);
  }
  return signal;
}

/**
 * Generate square wave
 * @param {Float64Array} t - Time array
 * @param {number} frequency - Frequency in Hz
 * @param {number} amplitude - Amplitude
 * @param {number} phase - Phase in degrees
 * @returns {Float64Array} Signal values
 */
export function generateSquare(t, frequency, amplitude, phase = 0) {
  const phaseRad = (phase * Math.PI) / 180;
  const signal = new Float64Array(t.length);
  for (let i = 0; i < t.length; i++) {
    const arg = (2 * Math.PI * frequency * t[i] + phaseRad) % (2 * Math.PI);
    signal[i] = arg < Math.PI ? amplitude : -amplitude;
  }
  return signal;
}

/**
 * Generate sawtooth wave
 * @param {Float64Array} t - Time array
 * @param {number} frequency - Frequency in Hz
 * @param {number} amplitude - Amplitude
 * @param {number} phase - Phase in degrees
 * @returns {Float64Array} Signal values
 */
export function generateSawtooth(t, frequency, amplitude, phase = 0) {
  const phaseRad = (phase * Math.PI) / 180;
  const signal = new Float64Array(t.length);
  for (let i = 0; i < t.length; i++) {
    const arg =
      ((2 * Math.PI * frequency * t[i] + phaseRad) % (2 * Math.PI)) /
      (2 * Math.PI);
    signal[i] = amplitude * (2 * arg - 1);
  }
  return signal;
}

/**
 * Generate triangle wave
 * @param {Float64Array} t - Time array
 * @param {number} frequency - Frequency in Hz
 * @param {number} amplitude - Amplitude
 * @param {number} phase - Phase in degrees
 * @returns {Float64Array} Signal values
 */
export function generateTriangle(t, frequency, amplitude, phase = 0) {
  const phaseRad = (phase * Math.PI) / 180;
  const signal = new Float64Array(t.length);
  for (let i = 0; i < t.length; i++) {
    const arg =
      ((2 * Math.PI * frequency * t[i] + phaseRad) % (2 * Math.PI)) /
      (2 * Math.PI);
    if (arg < 0.25) {
      signal[i] = amplitude * (4 * arg);
    } else if (arg < 0.75) {
      signal[i] = amplitude * (2 - 4 * arg);
    } else {
      signal[i] = amplitude * (-4 + 4 * arg);
    }
  }
  return signal;
}

/**
 * Generate signal based on type
 */
export function generateSignal(t, waveType, frequency, amplitude, phase = 0) {
  switch (waveType.toLowerCase()) {
    case "sinus":
    case "sine":
      return generateSine(t, frequency, amplitude, phase);
    case "cosinus":
    case "cosine":
      return generateCosine(t, frequency, amplitude, phase);
    case "rechteck":
    case "square":
      return generateSquare(t, frequency, amplitude, phase);
    case "sägezahn":
    case "sawtooth":
      return generateSawtooth(t, frequency, amplitude, phase);
    case "dreieck":
    case "triangle":
      return generateTriangle(t, frequency, amplitude, phase);
    default:
      return generateSine(t, frequency, amplitude, phase);
  }
}

/**
 * Simple FFT implementation using Cooley-Tukey algorithm
 */
export function computeFFT(signal) {
  const n = signal.length;
  if (n <= 1) return { re: Array.from(signal), im: new Array(n).fill(0) };
  const reIn = Array.from(signal);
  const imIn = new Array(n).fill(0);
  // dft() handles any length exactly (Bluestein's algorithm for non-power-
  // of-2 sizes) — no zero-padding, and it correctly tracks the imaginary
  // component throughout, unlike the previous real-only recursive FFT here
  // (which silently discarded phase information at every recursion level
  // and gave mathematically wrong results beyond the most trivial inputs).
  return dft(reIn, imIn);
}

/**
 * Compute FFT magnitude spectrum (single-sided, matches numpy/scipy's
 * rfft convention: N//2 + 1 bins, amplitude scaled by 2/N).
 */
export function computeFFTMagnitude(signal, samplingRate) {
  const n = signal.length;
  const { re, im } = computeFFT(signal);

  const half = Math.floor(n / 2) + 1;
  const magnitude = new Float64Array(half);
  const frequency = new Float64Array(half);
  const freqResolution = samplingRate / n;

  for (let i = 0; i < half; i++) {
    magnitude[i] = (Math.sqrt(re[i] * re[i] + im[i] * im[i]) * 2) / n;
    frequency[i] = i * freqResolution;
  }

  return { magnitude, frequency };
}

/**
 * Calculate RMS (Root Mean Square)
 */
export function calculateRMS(signal) {
  let sum = 0;
  for (let i = 0; i < signal.length; i++) {
    sum += signal[i] * signal[i];
  }
  return Math.sqrt(sum / signal.length);
}

/**
 * Calculate peak value
 */
export function calculatePeak(signal) {
  let max = 0;
  for (let i = 0; i < signal.length; i++) {
    max = Math.max(max, Math.abs(signal[i]));
  }
  return max;
}

/**
 * Calculate peak-to-peak value
 */
export function calculatePeakToPeak(signal) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < signal.length; i++) {
    min = Math.min(min, signal[i]);
    max = Math.max(max, signal[i]);
  }
  return max - min;
}

/**
 * Apply window function (Hann window)
 */
export function applyHannWindow(signal) {
  const windowed = new Float64Array(signal.length);
  const n = signal.length;
  for (let i = 0; i < n; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    windowed[i] = signal[i] * window;
  }
  return windowed;
}
