import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

export default [
  js.configs.recommended,
  // "essential" only — catches real Vue mistakes (missing keys, invalid
  // directives, etc.), not formatting (indentation, attrs-per-line, ...).
  // This codebase has no Prettier and its own established style; a lint
  // setup that fought that style on every run would just get ignored.
  ...pluginVue.configs["flat/essential"],
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Unused imports/vars are exactly the kind of dead code that's easy
      // to miss by hand — catch them at lint time instead of during an
      // occasional manual audit. Prefix with _ to intentionally ignore
      // (e.g. an unused function arg you must keep for signature reasons).
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "vue/multi-word-component-names": "off", // plenty of intentionally single-word views (App, MtFilter, etc.)
      "vue/no-v-html": "off", // not used in a way that takes untrusted input; dompurify is stubbed out deliberately (see html2canvasStub.js)
      // Vuetify's v-data-table dynamic column slots use dots in the slot
      // name itself (#item.name, #item.meta.rms) — the rule misreads the
      // dot as a directive modifier and flags every one as invalid.
      "vue/valid-v-slot": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "src/generator/**/dist/**"],
  },
];
