// Groups a list of items (anything with a created_at) into human-scale
// "when" buckets — Heute/Gestern/Diese Woche/Dieser Monat/Älter — instead
// of one long flat list ordered only by timestamp. Kept generic (doesn't
// know about "files" specifically) so both the Import page's own file
// list and the Anzeige page's "Aus Cloud hinzufügen" dialog can share it
// rather than drifting into two slightly different grouping schemes.
export function groupByDate(items, dateKey = "created_at") {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfToday.getDay() + (startOfToday.getDay() === 0 ? -6 : 1));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const buckets = new Map([
    ["Heute", []],
    ["Gestern", []],
    ["Diese Woche", []],
    ["Diesen Monat", []],
    ["Älter", []],
  ]);

  for (const item of items) {
    const d = new Date(item[dateKey]);
    let bucket;
    if (d >= startOfToday) bucket = "Heute";
    else if (d >= startOfYesterday) bucket = "Gestern";
    else if (d >= startOfWeek) bucket = "Diese Woche";
    else if (d >= startOfMonth) bucket = "Diesen Monat";
    else bucket = "Älter";
    buckets.get(bucket).push(item);
  }

  // Only return buckets that actually have something in them, in the
  // fixed most-recent-first order above (not alphabetical).
  return [...buckets.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
