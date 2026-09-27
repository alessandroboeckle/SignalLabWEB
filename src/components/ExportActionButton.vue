<template>
  <!-- The one "this produces a file" button style used on every export
       surface: big, solid primary, download icon, what you'll get in the
       second line, and a progress readout while it's working. -->
  <v-btn
    block
    size="large"
    color="primary"
    variant="flat"
    elevation="3"
    class="export-action-btn"
    :loading="loading"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <v-icon start size="22">{{ icon }}</v-icon>
    <span class="export-action-text">
      <span class="export-action-main">{{ label }}</span>
      <span v-if="sub" class="export-action-sub">{{ sub }}</span>
    </span>
    <template #loader>
      <v-progress-circular indeterminate size="20" width="2" class="mr-2"></v-progress-circular>
      {{ loadingText }}<template v-if="progress != null"> … {{ progress }} %</template>
    </template>
  </v-btn>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  sub: { type: String, default: "" },
  icon: { type: String, default: "mdi-download" },
  loading: { type: Boolean, default: false },
  loadingText: { type: String, default: "Wird erstellt" },
  progress: { type: Number, default: null },
  disabled: { type: Boolean, default: false },
});
defineEmits(["click"]);
</script>

<style scoped>
.export-action-btn {
  height: 52px !important;
  letter-spacing: 0.01em;
}
.export-action-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.15;
}
.export-action-main {
  font-weight: 700;
  font-size: 0.98rem;
}
.export-action-sub {
  font-size: 0.72rem;
  opacity: 0.85;
  font-weight: 500;
}
</style>
