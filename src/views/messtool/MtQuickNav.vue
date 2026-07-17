<template>
  <div class="d-flex flex-wrap align-center ga-2 mb-4">
    <span class="text-caption text-medium-emphasis mr-1">Weiter zu:</span>
    <v-btn
      v-for="item in items"
      :key="item.target"
      size="small"
      variant="tonal"
      color="primary"
      :prepend-icon="item.icon"
      @click="$emit('navigate', item.target)"
    >
      {{ item.label }}
    </v-btn>
  </div>
</template>

<script setup>
// items: [{ target: 'mt-filter', label: 'Filter', icon: 'mdi-tune-variant' }, ...]
defineProps({
  items: { type: Array, required: true },
});
defineEmits(["navigate"]);
</script>
