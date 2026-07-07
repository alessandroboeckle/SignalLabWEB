<template>
  <v-container fluid class="pa-4">
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4">Signal Comparison</h2>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="3">
        <v-card class="elevation-2">
          <v-card-title class="text-h6">Select Signals</v-card-title>
          <v-card-text>
            <v-list dense>
              <v-list-item
                v-for="signal in availableSignals"
                :key="signal.id"
                @click="toggleSignalSelection(signal.id)"
                :class="{ 'bg-primary-light': selectedSignals.includes(signal.id) }"
                class="mb-2"
              >
                <template v-slot:prepend>
                  <v-checkbox
                    :model-value="selectedSignals.includes(signal.id)"
                    @click.stop="toggleSignalSelection(signal.id)"
                  ></v-checkbox>
                </template>
                <v-list-item-title class="text-body2">
                  {{ signal.name }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                  {{ signal.waveType }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <div v-if="availableSignals.length === 0" class="text-center text-disabled py-4 text-caption">
              No signals to compare. Create signals first!
            </div>

            <v-btn
              block
              color="primary"
              class="mt-4"
              :disabled="selectedSignals.length === 0"
              @click="compareSelected"
            >
              Compare Selected
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <v-card v-if="comparisonData.length > 0" class="elevation-2">
          <v-card-title>Comparison Results</v-card-title>
          <v-card-text>
            <canvas id="comparisonChart"></canvas>
          </v-card-text>
        </v-card>

        <v-card v-else class="elevation-2">
          <v-card-text class="text-center text-disabled py-8">
            Select signals and click "Compare Selected" to see results
          </v-card-text>
        </v-card>

        <!-- Statistics Table -->
        <v-card v-if="selectedSignals.length > 0" class="elevation-2 mt-4">
          <v-card-title>Statistics</v-card-title>
          <v-card-text>
            <v-table>
              <thead>
                <tr>
                  <th>Signal Name</th>
                  <th>Type</th>
                  <th>Frequency (Hz)</th>
                  <th>RMS</th>
                  <th>Peak</th>
                  <th>Peak-to-Peak</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="signal in selectedSignalObjects" :key="signal.id">
                  <td><strong>{{ signal.name }}</strong></td>
                  <td>{{ signal.waveType }}</td>
                  <td>{{ signal.frequency }}</td>
                  <td>{{ formatNumber(signal.meta?.rms || 0) }}</td>
                  <td>{{ formatNumber(signal.meta?.peak || 0) }}</td>
                  <td>{{ formatNumber(signal.meta?.peakToPeak || 0) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSignalStore } from '../stores/signalStore'
import * as storage from '../utils/storage'
import Chart from 'chart.js/auto'

const store = useSignalStore()
const selectedSignals = ref([])
const comparisonData = ref([])
let comparisonChart = null

const availableSignals = computed(() => {
  return store.currentSession.signals
})

const selectedSignalObjects = computed(() => {
  return selectedSignals.value
    .map(id => storage.loadSignal(id))
    .filter(Boolean)
})

const colors = [
  '#2563EB',
  '#FF6B35',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899'
]

function toggleSignalSelection(signalId) {
  const index = selectedSignals.value.indexOf(signalId)
  if (index >= 0) {
    selectedSignals.value.splice(index, 1)
  } else {
    selectedSignals.value.push(signalId)
  }
}

function compareSelected() {
  const signals = store.compareSignals(selectedSignals.value)
  comparisonData.value = signals
  drawComparisonChart()
}

function drawComparisonChart() {
  const canvas = document.getElementById('comparisonChart')
  if (!canvas) return

  if (comparisonChart) {
    comparisonChart.destroy()
  }

  if (comparisonData.value.length === 0) return

  // Use the first signal as time reference
  const timeData = comparisonData.value[0].timeData
  const sampleRate = Math.ceil(timeData.length / 500)
  const sampledTime = timeData.filter((_, i) => i % sampleRate === 0)

  const datasets = comparisonData.value.map((signal, idx) => {
    const sampledAmplitude = signal.amplitudeData.filter((_, i) => i % sampleRate === 0)
    return {
      label: signal.name,
      data: sampledAmplitude,
      borderColor: colors[idx % colors.length],
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4
    }
  })

  comparisonChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: sampledTime.map(t => t.toFixed(3)),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          labels: { usePointStyle: true }
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Amplitude'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time (s)'
          }
        }
      }
    }
  })
}

function formatNumber(num) {
  return typeof num === 'number' ? num.toFixed(3) : '0'
}

watch(selectedSignals, () => {
  if (selectedSignals.value.length === 0) {
    comparisonData.value = []
  }
}, { deep: true })
</script>

<style scoped>
canvas {
  max-height: 400px;
}

.bg-primary-light {
  background-color: rgba(37, 99, 235, 0.1);
}
</style>
