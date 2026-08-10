<template>
  <v-dialog v-model="open" max-width="560" scrollable @update:model-value="onOpenChange">
    <v-card rounded="lg">
      <v-text-field
        ref="inputRef"
        v-model="query"
        variant="plain"
        density="comfortable"
        placeholder="Wohin? (Seite tippen, ↑↓ zum Wählen, Enter zum Springen)"
        prepend-inner-icon="mdi-magnify"
        hide-details
        autofocus
        class="px-3 pt-2"
        @keydown="onKeydown"
      ></v-text-field>
      <v-divider></v-divider>
      <v-list v-if="filtered.length" density="comfortable" class="command-list">
        <v-list-item
          v-for="(item, i) in filtered"
          :key="item.value"
          :active="i === activeIndex"
          rounded="lg"
          class="mx-2 my-1"
          @click="choose(item)"
          @mouseenter="activeIndex = i"
        >
          <template #prepend>
            <v-icon :icon="item.icon" size="20"></v-icon>
          </template>
          <v-list-item-title>{{ item.label }}</v-list-item-title>
          <v-list-item-subtitle v-if="item.group">{{ item.group }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <div v-else class="pa-6 text-center text-medium-emphasis">Keine Treffer.</div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  commands: { type: Array, required: true }, // [{ value, label, icon, group }]
});
const emit = defineEmits(["update:modelValue", "select"]);

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const query = ref("");
const activeIndex = ref(0);
const inputRef = ref(null);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.commands;
  return props.commands.filter(
    (c) => c.label.toLowerCase().includes(q) || c.group?.toLowerCase().includes(q),
  );
});

watch(filtered, () => {
  activeIndex.value = 0;
});

function onOpenChange(isOpen) {
  if (isOpen) {
    query.value = "";
    activeIndex.value = 0;
    nextTick(() => inputRef.value?.focus?.());
  }
}

function choose(item) {
  emit("select", item.value);
  open.value = false;
}

function onKeydown(e) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, filtered.value.length - 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (e.key === "Enter") {
    e.preventDefault();
    const item = filtered.value[activeIndex.value];
    if (item) choose(item);
  } else if (e.key === "Escape") {
    open.value = false;
  }
}
</script>

<style scoped>
.command-list {
  max-height: 360px;
  overflow-y: auto;
}
</style>
