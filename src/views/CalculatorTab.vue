<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4">Signal Calculator</h2>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>Frequency Calculator</v-card-title>
          <v-card-text>
            <v-text-field
              v-model.number="freq.frequency"
              label="Frequency (Hz)"
              outlined
              dense
              class="mb-4"
            ></v-text-field>

            <div class="mb-4">
              <div class="text-caption mb-1"><strong>Period:</strong></div>
              <div class="text-body2">
                {{ formatNumber(1 / freq.frequency) }} s
              </div>
            </div>

            <div class="mb-4">
              <div class="text-caption mb-1">
                <strong>Angular Frequency:</strong>
              </div>
              <div class="text-body2">
                {{ formatNumber(2 * Math.PI * freq.frequency) }} rad/s
              </div>
            </div>

            <div class="mb-4">
              <div class="text-caption mb-1">
                <strong>Wavelength (in air):</strong>
              </div>
              <div class="text-body2">
                {{ formatNumber(343 / freq.frequency) }} m
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>RMS & Peak Calculator</v-card-title>
          <v-card-text>
            <v-text-field
              v-model.number="amplitude.peakValue"
              label="Peak Amplitude"
              outlined
              dense
              class="mb-4"
            ></v-text-field>

            <div class="mb-4">
              <div class="text-caption mb-1"><strong>RMS Value:</strong></div>
              <div class="text-body2">
                {{ formatNumber(amplitude.peakValue / Math.sqrt(2)) }} (for sine
                wave)
              </div>
            </div>

            <div class="mb-4">
              <div class="text-caption mb-1">
                <strong>Peak-to-Peak:</strong>
              </div>
              <div class="text-body2">
                {{ formatNumber(2 * amplitude.peakValue) }}
              </div>
            </div>

            <div class="mb-4">
              <div class="text-caption mb-1">
                <strong>Crest Factor:</strong>
              </div>
              <div class="text-body2">
                {{
                  formatNumber(
                    amplitude.peakValue / (amplitude.peakValue / Math.sqrt(2)),
                  )
                }}
                (for sine wave)
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>Sampling Theorem Calculator</v-card-title>
          <v-card-text>
            <v-text-field
              v-model.number="sampling.frequency"
              label="Signal Frequency (Hz)"
              outlined
              dense
              class="mb-4"
            ></v-text-field>

            <div class="mb-4">
              <div class="text-caption mb-1">
                <strong>Nyquist Frequency:</strong>
              </div>
              <div class="text-body2 text-success">
                {{ formatNumber(2 * sampling.frequency) }} Hz (minimum sampling
                rate)
              </div>
            </div>

            <div class="mb-4">
              <div class="text-caption mb-1">
                <strong>Recommended Sampling Rate:</strong>
              </div>
              <div class="text-body2">
                {{ formatNumber(10 * sampling.frequency) }} Hz (10x signal
                frequency)
              </div>
            </div>

            <v-text-field
              v-model.number="sampling.samplingRate"
              label="Your Sampling Rate (Hz)"
              outlined
              dense
              class="mb-4"
            ></v-text-field>

            <div class="mb-4">
              <div class="text-caption mb-1"><strong>Status:</strong></div>
              <div
                class="text-body2"
                :class="
                  sampling.samplingRate >= 2 * sampling.frequency
                    ? 'text-success'
                    : 'text-error'
                "
              >
                {{
                  sampling.samplingRate >= 2 * sampling.frequency
                    ? "✓ Sufficient sampling rate"
                    : "✗ Aliasing will occur"
                }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="elevation-2">
          <v-card-title>Energy Calculator</v-card-title>
          <v-card-text>
            <v-text-field
              v-model.number="energy.voltage"
              label="RMS Voltage (V)"
              outlined
              dense
              class="mb-4"
            ></v-text-field>

            <v-text-field
              v-model.number="energy.resistance"
              label="Impedance (Ω)"
              outlined
              dense
              class="mb-4"
            ></v-text-field>

            <div class="mb-4">
              <div class="text-caption mb-1"><strong>Power (RMS):</strong></div>
              <div class="text-body2">
                {{
                  formatNumber(
                    (energy.voltage * energy.voltage) / energy.resistance,
                  )
                }}
                W
              </div>
            </div>

            <div class="mb-4">
              <div class="text-caption mb-1">
                <strong>Current (RMS):</strong>
              </div>
              <div class="text-body2">
                {{ formatNumber(energy.voltage / energy.resistance) }} A
              </div>
            </div>

            <div class="mb-4">
              <div class="text-caption mb-1">
                <strong>dB (referenced to 1V):</strong>
              </div>
              <div class="text-body2">
                {{ formatNumber(20 * Math.log10(energy.voltage)) }} dB
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card class="elevation-2">
          <v-card-title>FFT Resolution Calculator</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="fft.samplingRate"
                  label="Sampling Rate (Hz)"
                  outlined
                  dense
                  class="mb-4"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="fft.fftSize"
                  label="FFT Size (samples)"
                  outlined
                  dense
                  class="mb-4"
                ></v-text-field>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <div class="mb-4">
                  <div class="text-caption mb-1">
                    <strong>Frequency Resolution:</strong>
                  </div>
                  <div class="text-body2">
                    {{ formatNumber(fft.samplingRate / fft.fftSize) }} Hz/bin
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="mb-4">
                  <div class="text-caption mb-1">
                    <strong>Analysis Time:</strong>
                  </div>
                  <div class="text-body2">
                    {{ formatNumber(fft.fftSize / fft.samplingRate) }} s
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from "vue";

const freq = ref({
  frequency: 50,
});

const amplitude = ref({
  peakValue: 10,
});

const sampling = ref({
  frequency: 100,
  samplingRate: 1000,
});

const energy = ref({
  voltage: 1,
  resistance: 50,
});

const fft = ref({
  samplingRate: 10000,
  fftSize: 1024,
});

function formatNumber(num) {
  if (typeof num !== "number") return "0";
  if (Math.abs(num) > 1000 || Math.abs(num) < 0.001) {
    return num.toExponential(3);
  }
  return num.toFixed(3);
}
</script>

<style scoped>
.text-success {
  color: #10b981;
}

.text-error {
  color: #ef4444;
}
</style>
