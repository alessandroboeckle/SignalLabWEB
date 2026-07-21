<template>
  <div class="login-wrap">
    <!-- Animated sine wave background -->
    <svg class="wave-bg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
      <path class="wave wave1" d="" />
      <path class="wave wave2" d="" />
      <path class="wave wave3" d="" />
    </svg>

    <div class="login-card">
      <div class="brand">
        <svg class="brand-icon" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2" />
          <path class="brand-wave" d="M 15 50 Q 27 20 39 50 T 63 50 T 87 50" stroke="white" stroke-width="5"
                fill="none" stroke-linecap="round" />
        </svg>
        <h1 class="brand-title">Signal Lab</h1>
        <p class="brand-sub">Signalverarbeitung & Analyse</p>
      </div>

      <div class="tab-switch">
        <button :class="['switch-btn', { active: mode === 'login' }]" @click="mode = 'login'">
          Anmelden
        </button>
        <button :class="['switch-btn', { active: mode === 'signup' }]" @click="mode = 'signup'">
          Registrieren
        </button>
      </div>

      <div class="form">
        <label class="field">
          <span class="field-label">E-Mail</span>
          <input
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="du@beispiel.com"
            @keyup.enter="submit"
          />
        </label>

        <label class="field">
          <span class="field-label">Passwort</span>
          <input
            v-model="password"
            type="password"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            placeholder="••••••••"
            @keyup.enter="submit"
          />
        </label>

        <p v-if="auth.errorMsg" class="msg error">{{ auth.errorMsg }}</p>
        <p v-if="info" class="msg info">{{ info }}</p>

        <button class="submit-btn" :disabled="busy" @click="submit">
          <span v-if="busy" class="spinner"></span>
          <span v-else>{{ mode === "login" ? "Anmelden" : "Konto erstellen" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useAuthStore } from "../stores/authStore";

const auth = useAuthStore();

const mode = ref("login");
const email = ref("");
const password = ref("");
const busy = ref(false);
const info = ref("");

async function submit() {
  if (busy.value) return;
  auth.errorMsg = "";
  info.value = "";

  if (!email.value || !password.value) {
    auth.errorMsg = "Bitte E-Mail und Passwort eingeben.";
    return;
  }

  busy.value = true;
  if (mode.value === "login") {
    await auth.signIn(email.value, password.value);
  } else {
    const ok = await auth.signUp(email.value, password.value);
    if (ok) {
      info.value =
        "Konto erstellt! Du kannst dich jetzt anmelden. Ein Admin muss dich noch freischalten.";
      mode.value = "login";
    }
  }
  busy.value = false;
}

// --- animated wave background ---
let raf = null;
let t = 0;

function buildWave(amp, wavelength, phase, yBase) {
  const pts = [];
  for (let x = 0; x <= 1440; x += 20) {
    const y = yBase + Math.sin(x / wavelength + phase) * amp;
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} L 1440,900 L 0,900 Z`;
}

// Builds an open sine line (not a filled shape) for the small logo wave.
function buildLogoWave(phase) {
  const pts = [];
  for (let x = 14; x <= 86; x += 4) {
    // sine across the circle; amplitude ~12, centered at y=50
    const y = 50 + Math.sin((x - 14) / 9 + phase) * 12;
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M ${pts.join(" L ")}`;
}

function animate() {
  t += 0.015;
  const w1 = document.querySelector(".wave1");
  const w2 = document.querySelector(".wave2");
  const w3 = document.querySelector(".wave3");
  if (w1) w1.setAttribute("d", buildWave(40, 180, t, 480));
  if (w2) w2.setAttribute("d", buildWave(55, 240, t * 0.8 + 2, 540));
  if (w3) w3.setAttribute("d", buildWave(30, 140, t * 1.3 + 4, 600));

  // logo wave runs through the circle
  const lw = document.querySelector(".brand-wave");
  if (lw) lw.setAttribute("d", buildLogoWave(t * 2.2));

  raf = requestAnimationFrame(animate);
}

onMounted(() => {
  animate();
});
onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf);
});
</script>

<style scoped>
.login-wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%);
  overflow: hidden;
}

.wave-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.35;
}

.wave {
  fill: rgba(255, 255, 255, 0.12);
}
.wave2 {
  fill: rgba(255, 255, 255, 0.08);
}
.wave3 {
  fill: rgba(255, 255, 255, 0.06);
}

.login-card {
  position: relative;
  z-index: 2;
  width: 380px;
  max-width: calc(100vw - 32px);
  padding: 36px 32px 32px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.brand {
  text-align: center;
  margin-bottom: 24px;
}
.brand-icon {
  width: 64px;
  height: 64px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
  animation: floaty 3.5s ease-in-out infinite;
}
@keyframes floaty {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(3deg); }
}
.brand-title {
  color: #fff;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 8px 0 2px;
}
.brand-sub {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.tab-switch {
  display: flex;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 22px;
}
.switch-btn {
  flex: 1;
  padding: 9px 0;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 600;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.25s ease;
}
.switch-btn.active {
  background: #fff;
  color: #2563eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 600;
}
.field input {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
}
.field input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}
.field input:focus {
  border-color: #fff;
  background: rgba(255, 255, 255, 0.22);
}

.msg {
  font-size: 13px;
  margin: -4px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
}
.msg.error {
  color: #fff;
  background: rgba(239, 68, 68, 0.35);
}
.msg.info {
  color: #fff;
  background: rgba(16, 185, 129, 0.3);
}

.submit-btn {
  margin-top: 4px;
  padding: 13px 0;
  border: none;
  border-radius: 10px;
  background: #fff;
  color: #2563eb;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}
.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(37, 99, 235, 0.3);
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
