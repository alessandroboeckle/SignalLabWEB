export const keyboardShortcuts = [
  {
    keys: [{ icon: "mdi-arrow-up" }, { icon: "mdi-arrow-down" }],
    keySep: "/",
    effect: "Durchs Signal blättern",
    scope: "Messtool: Analyse, Filter, Verarbeitung, Export",
  },
  {
    keys: [{ text: "Strg" }, { text: "Z" }],
    effect: "Verarbeitungsschritt rückgängig",
    scope: "Messtool: Verarbeitung",
  },
  {
    keys: [{ text: "Strg" }, { text: "Y" }],
    effect: "Verarbeitungsschritt wiederholen",
    scope: "Messtool: Verarbeitung",
  },
  {
    keys: [{ text: "Umschalt" }, { icon: "mdi-cursor-move" }],
    effect: "Chart verschieben (pan)",
    scope: "Messtool: alle Diagramme",
  },
  {
    keys: [{ icon: "mdi-mouse-outline" }],
    effect: "Chart zoomen",
    scope: "Messtool: alle Diagramme",
  },
  {
    keys: [{ icon: "mdi-vector-square" }],
    effect: "Rechteck ziehen → in Bereich hineinzoomen",
    scope: "Messtool: alle Diagramme",
  },
  {
    keys: [{ text: "?" }],
    effect: "Diese Übersicht anzeigen",
    scope: "Überall",
  },
];
