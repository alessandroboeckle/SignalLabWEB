// Registry of live ChartCards that can be exported together — e.g. every
// plot on the Anzeige page, so Export (or Anzeige itself) can put all of
// them, exactly as currently shown (zoom + cursors), into one PDF.
//
// A ChartCard with an `exportGroup` prop registers itself here with a
// render() callback; the list is reactive so pages can show "N Plots".
// Order follows the on-screen (DOM) order, not registration order, so
// the PDF matches what you see top to bottom.

import { shallowReactive, computed } from "vue";

const entries = shallowReactive([]); // [{ id, group, el: () => Element|null, title: () => string, render: (opts) => Promise<...> }]

export function registerExportChart(entry) {
  entries.push(entry);
  return () => {
    const i = entries.indexOf(entry);
    if (i !== -1) entries.splice(i, 1);
  };
}

function domOrder(a, b) {
  const ea = a.el?.(), eb = b.el?.();
  if (!ea || !eb || ea === eb) return 0;
  return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

export function exportChartsIn(group) {
  return entries.filter((e) => e.group === group).sort(domOrder);
}

export function useExportCharts(group) {
  return computed(() => exportChartsIn(group));
}
