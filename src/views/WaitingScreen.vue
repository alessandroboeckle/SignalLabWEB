<template>
  <div class="wait-wrap">
    <div class="wait-card">
      <div class="pulse-icon">
        <svg viewBox="0 0 100 100" width="56" height="56">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(37,99,235,0.4)" stroke-width="3" />
          <path d="M 20 50 Q 32 25 44 50 T 68 50 T 84 50" stroke="#2563eb" stroke-width="5"
                fill="none" stroke-linecap="round" />
        </svg>
      </div>

      <h2 class="wait-title">Warte auf Freigabe</h2>
      <p class="wait-text">
        Dein Konto <strong>{{ email }}</strong> wurde erstellt, muss aber noch von
        einem Admin freigeschaltet werden. Sobald das erledigt ist, hast du Zugriff
        auf die Sessions.
      </p>

      <button class="refresh-btn" :disabled="checking" @click="check">
        <span v-if="checking" class="spinner"></span>
        <span v-else>Status prüfen</span>
      </button>

      <button class="logout-btn" @click="auth.signOut()">Abmelden</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useAuthStore } from "../stores/authStore";

const auth = useAuthStore();
const checking = ref(false);

const email = computed(() => auth.user?.email ?? "");

async function check() {
  checking.value = true;
  await auth.refreshApproval();
  checking.value = false;
}
</script>

<style scoped>
.wait-wrap {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #f9fafb 0%, #eef2f7 100%);
  padding: 16px;
}
.wait-card {
  width: 420px;
  max-width: 100%;
  background: #fff;
  border-radius: 18px;
  padding: 40px 32px;
  text-align: center;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}
.pulse-icon {
  margin-bottom: 16px;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.75; }
}
.wait-title {
  font-size: 22px;
  font-weight: 800;
  color: #111827;
  margin-bottom: 10px;
}
.wait-text {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 24px;
}
.refresh-btn {
  width: 100%;
  padding: 12px 0;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
}
.refresh-btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-2px);
}
.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.logout-btn {
  margin-top: 12px;
  background: none;
  border: none;
  color: #6b7280;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
