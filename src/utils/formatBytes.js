// Human-readable byte counts (1.2 MB, 340 KB, 2.1 GB), switching units
// automatically instead of every call site picking its own threshold
// (the file list already always used MB regardless of size, which reads
// oddly once totals cross into GB territory).
export function formatBytes(bytes, decimals = 1) {
  if (bytes == null || !Number.isFinite(bytes)) return "–";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value.toFixed(exp === 0 ? 0 : decimals)} ${units[exp]}`;
}
