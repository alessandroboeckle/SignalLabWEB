<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-2">
      <v-icon color="primary" size="28" class="mr-3">{{ icon }}</v-icon>
      <h2 class="text-h4 font-weight-bold">{{ title }}</h2>
    </div>
    <p class="text-medium-emphasis mb-6">{{ subtitle }}</p>

    <v-card variant="outlined" rounded="lg" class="pa-8 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-hammer-wrench</v-icon>
      <h3 class="text-h6 mb-2">Kommt bald</h3>
      <p class="text-medium-emphasis">
        Dieser Bereich wird als Nächstes gebaut.
      </p>
    </v-card>
  </v-container>
</template>

<script setup>
defineProps({
  title: { type: String, default: "Messtool" },
  subtitle: { type: String, default: "" },
  icon: { type: String, default: "mdi-tools" },
});
</script>
