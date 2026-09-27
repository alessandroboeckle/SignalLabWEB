<template>
  <!-- Segmented choice with real gaps between the options (instead of
       Vuetify's glued-together v-btn-toggle). Selected = solid neutral,
       so it never looks like the page's primary action button. -->
  <div class="option-toggle" :class="{ 'option-toggle--fill': fill }" role="radiogroup">
    <v-btn
      v-for="o in options"
      :key="String(o.value)"
      :size="size"
      :variant="modelValue === o.value ? 'flat' : 'outlined'"
      :color="modelValue === o.value ? 'secondary' : undefined"
      :prepend-icon="o.icon"
      :disabled="o.disabled"
      role="radio"
      :aria-checked="modelValue === o.value"
      class="option-toggle__btn"
      @click="$emit('update:modelValue', o.value)"
    >
      {{ o.label }}
    </v-btn>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number, Boolean], default: null },
  // [{ value, label, icon?, disabled? }]
  options: { type: Array, required: true },
  size: { type: String, default: "default" },
  // Stretch the options to share the full width equally.
  fill: { type: Boolean, default: false },
});
defineEmits(["update:modelValue"]);
</script>

<style scoped>
.option-toggle {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}
.option-toggle--fill {
  display: flex;
  width: 100%;
}
.option-toggle--fill .option-toggle__btn {
  flex: 1 1 0;
  min-width: 0;
}
</style>
