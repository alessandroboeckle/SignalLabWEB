import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "/SignalLabWEB/",
  server: { port: 3000 },
  build: { outDir: "dist" },
});
