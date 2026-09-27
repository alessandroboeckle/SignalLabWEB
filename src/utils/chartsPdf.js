// Puts several already-rendered charts (see ChartCard's renderForExport)
// into ONE PDF: header with title/date/logo on every page, each plot
// with its title, and — if cursors were set — a compact table of the
// cursor positions and every series' value there, right under the plot.
//
// perPage 1 → A4 landscape, one large plot per page.
// perPage 2 → A4 portrait, two plots stacked per page.

function fitLogo(doc, logoDataUrl, logoAspect, xRight, y) {
  if (!logoDataUrl) return;
  try {
    const maxW = 36, maxH = 14;
    const aspect = logoAspect > 0 ? logoAspect : maxW / maxH;
    let w = maxW, h = maxW / aspect;
    if (h > maxH) { h = maxH; w = maxH * aspect; }
    doc.addImage(logoDataUrl, "PNG", xRight - w, y, w, h, undefined, "FAST");
  } catch {
    // a broken logo must not break the export
  }
}

export function formatCursorNumber(v) {
  if (v == null || !Number.isFinite(v)) return "–";
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e6 || a < 1e-3)) return v.toExponential(3);
  return v.toFixed(a >= 1e4 ? 1 : 3);
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return [60, 60, 60];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Height (mm) the cursor table will need — used to size the plot image
// so plot + table always fit in their slot.
// Differences between consecutive cursors (C1–C2, C2–C3, …): dx plus
// the difference of every series both cursors have a value for — the "measure between
// two points" use case, now also on paper.
export function cursorDeltas(cursors) {
  const out = [];
  for (let i = 1; i < (cursors?.length || 0); i++) {
    const a = cursors[i - 1], b = cursors[i];
    const series = a.series
      .map((sa) => {
        const sb = b.series.find((s) => s.label === sa.label);
        return sb ? { label: sa.label, value: sb.value - sa.value } : null;
      })
      .filter(Boolean);
    // jsPDF's built-in fonts are WinAnsi only: no "Δ"/"→" glyphs, so
    // "C1–C2" / "dx" and signed values instead.
    out.push({ label: `${a.label}–${b.label}`, dx: b.x - a.x, series });
  }
  return out;
}

function signed(v) {
  const t = formatCursorNumber(v);
  return v > 0 ? `+${t}` : t;
}

function deltaText(series) {
  return series.map((s) => `${s.label}: ${signed(s.value)}`).join("   ·   ") || "(keine gemeinsamen Werte)";
}

function rowText(series) {
  return series.map((s) => `${s.label}: ${formatCursorNumber(s.value)}`).join("   ·   ") || "(keine Werte)";
}

function cursorTableHeight(doc, cursors, width) {
  if (!cursors?.length) return 0;
  let h = 6; // heading
  doc.setFontSize(8);
  for (const c of cursors) h += doc.splitTextToSize(rowText(c.series), width - 38).length * 3.6 + 1.2;
  for (const d of cursorDeltas(cursors)) {
    h += doc.splitTextToSize(deltaText(d.series), width - 38).length * 3.6 + 1.2;
  }
  return h + 2;
}

function drawCursorTable(doc, cursors, x, y, width, xUnit) {
  if (!cursors?.length) return;
  doc.setFontSize(8.5);
  doc.setTextColor(40);
  doc.setFont(undefined, "bold");
  doc.text("Cursor", x, y + 3.5);
  doc.setFont(undefined, "normal");
  let cy = y + 7.5;
  doc.setFontSize(8);
  for (const c of cursors) {
    const [r, g, b] = hexToRgb(c.color);
    doc.setFillColor(r, g, b);
    doc.circle(x + 1.2, cy - 1.1, 1.1, "F");
    doc.setTextColor(r, g, b);
    doc.setFont(undefined, "bold");
    doc.text(c.label, x + 3.5, cy);
    doc.setFont(undefined, "normal");
    doc.setTextColor(40);
    doc.text(`x = ${formatCursorNumber(c.x)} ${xUnit || ""}`.trim(), x + 11, cy);
    const lines = doc.splitTextToSize(rowText(c.series), width - 38);
    doc.setTextColor(80);
    doc.text(lines, x + 38, cy);
    cy += lines.length * 3.6 + 1.2;
  }
  for (const d of cursorDeltas(cursors)) {
    doc.setTextColor(40);
    doc.setFont(undefined, "bold");
    doc.text(d.label, x + 3.5, cy);
    doc.setFont(undefined, "normal");
    doc.text(`dx = ${signed(d.dx)} ${xUnit || ""}`.trim(), x + 15, cy);
    const lines = doc.splitTextToSize(deltaText(d.series), width - 38);
    doc.setTextColor(80);
    doc.text(lines, x + 38, cy);
    cy += lines.length * 3.6 + 1.2;
  }
}

export async function buildChartsPdf(items, {
  title = "Signal Lab – Anzeige",
  subtitle = "",
  perPage = 1,
  logoDataUrl = null,
  logoAspect = null,
  fields = [],
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const landscape = perPage === 1;
  const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - 2 * margin;
  const created = new Date().toLocaleString("de-CH");
  const fieldText = fields.filter((f) => f.label?.trim()).map((f) => `${f.label.trim()}: ${f.value ?? ""}`).join("   ·   ");

  function header() {
    fitLogo(doc, logoDataUrl, logoAspect, pageW - margin, 8);
    doc.setFontSize(14);
    doc.setTextColor(20);
    doc.setFont(undefined, "bold");
    doc.text(title, margin, 14);
    doc.setFont(undefined, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(110);
    const sub = [subtitle, created].filter(Boolean).join("   ·   ");
    doc.text(doc.splitTextToSize(sub, contentW - 45), margin, 19);
    let y = 23;
    if (fieldText) {
      const lines = doc.splitTextToSize(fieldText, contentW - 45);
      doc.text(lines, margin, y);
      y += lines.length * 3.6;
    }
    doc.setDrawColor(210);
    doc.line(margin, y + 1, pageW - margin, y + 1);
    return y + 5;
  }

  const pages = Math.max(1, Math.ceil(items.length / perPage));
  let top = header();
  for (let i = 0; i < items.length; i++) {
    const slotIndex = i % perPage;
    if (i > 0 && slotIndex === 0) {
      doc.addPage();
      top = header();
    }
    const usableH = pageH - top - 10; // 10 mm footer
    const slotH = usableH / perPage;
    const y0 = top + slotIndex * slotH;
    const item = items[i];

    doc.setFontSize(10.5);
    doc.setTextColor(30);
    doc.setFont(undefined, "bold");
    doc.text(item.title || `Plot ${i + 1}`, margin, y0 + 4);
    doc.setFont(undefined, "normal");

    const tableH = cursorTableHeight(doc, item.cursors, contentW);
    const maxImgH = slotH - 8 - tableH - 3;
    const aspect = item.width / item.height;
    let imgW = contentW, imgH = imgW / aspect;
    if (imgH > maxImgH) { imgH = Math.max(20, maxImgH); imgW = imgH * aspect; }
    doc.addImage(item.image, "PNG", margin, y0 + 6, imgW, imgH, undefined, "FAST");
    drawCursorTable(doc, item.cursors, margin, y0 + 6 + imgH + 1, contentW, item.xUnit);
  }

  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text("Erstellt mit Signal Lab – Messtool", margin, pageH - 5);
    doc.text(`Seite ${p} / ${pages}`, pageW - margin, pageH - 5, { align: "right" });
  }
  return doc;
}
