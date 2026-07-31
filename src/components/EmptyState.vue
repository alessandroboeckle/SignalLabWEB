<template>
  <Transition name="empty-state" appear>
    <v-card variant="outlined" rounded="lg" class="pa-8 text-center empty-state-card">
      <div class="empty-state-icon-wrap mb-4">
        <v-icon :icon="icon" size="30" color="primary"></v-icon>
      </div>
      <h3 class="text-h6 mb-2">{{ title }}</h3>
      <p class="text-medium-emphasis mb-4 empty-state-desc">
        <slot>{{ description }}</slot>
      </p>
      <v-btn
        v-if="actionLabel"
        size="small"
        color="primary"
        variant="tonal"
        :prepend-icon="actionIcon"
        @click="$emit('action')"
      >
        {{ actionLabel }}
      </v-btn>
      <slot name="extra"></slot>
    </v-card>
  </Transition>
</template>

<script setup>
defineProps({
  icon: { type: String, default: "mdi-file-question-outline" },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  actionLabel: { type: String, default: "" },
  actionIcon: { type: String, default: "mdi-arrow-right" },
});

defineEmits(["action"]);
</script>

<style scoped>
.empty-state-card {
  max-width: 560px;
  margin: 0 auto;
}

.empty-state-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  margin-right: auto;
}

.empty-state-desc {
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
}

.empty-state-enter-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.empty-state-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}
</style>
