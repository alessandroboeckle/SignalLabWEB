// 3-decimal display for the Generator tool's live parameter/value readouts
// (SignalCreationTab, ComparisonTab — CalculatorTab intentionally has its
// own richer version with exponential notation for very large/small
// numbers, so it's not consolidated here).
export function formatNumber(num) {
  return typeof num === "number" ? num.toFixed(3) : "0";
}
