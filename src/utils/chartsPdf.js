// Puts several already-rendered charts (see ChartCard's renderForExport)
// into ONE PDF: header with title/date/logo on every page, each plot
// with its title, and — if cursors were set — a compact table of the
// cursor positions and every series' value there, right under the plot.
//
// Page: A4 portrait or landscape, 1–12 plots per page (see pdfGrid).

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

// Footer credit: who exported this — "Erstellt von SignalLab – <user>".
export function createdByLine(user) {
  const u = String(user || "").trim();
  return u ? `Erstellt von SignalLab – ${u}` : "Erstellt mit SignalLab";
}

// Grid for n plots per page: side by side in 2 columns once they'd get
// too flat stacked (≥3 on landscape, ≥5 on portrait), otherwise stacked.
export function pdfGrid(perPage, orientation) {
  const n = Math.max(1, Math.min(12, Math.round(perPage) || 1));
  const landscape = orientation === "landscape";
  const cols = (landscape && n >= 3) || (!landscape && n >= 5) ? 2 : 1;
  return { n, cols, rows: Math.ceil(n / cols) };
}

// charts: [{ render({width, height}) → Promise<{title, image, width,
// height, cursors, xUnit}>, cursorCount() }]. Each chart is rendered at
// exactly the aspect ratio of its slot on the page, so plots fill their
// cell whatever the layout (orientation × plots per page).
export async function buildChartsPdf(charts, {
  title = "Signal Lab – Anzeige",
  subtitle = "",
  perPage = 1,
  orientation = "landscape",
  logoDataUrl = null,
  logoAspect = null,
  fields = [],
  createdBy = "",
  onProgress = null,
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const { n, cols, rows } = pdfGrid(perPage, orientation);
  const doc = new jsPDF({ orientation: orientation === "portrait" ? "portrait" : "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const gap = 6;
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

  const pages = Math.max(1, Math.ceil(charts.length / n));
  let top = header();
  for (let i = 0; i < charts.length; i++) {
    const slot = i % n;
    if (i > 0 && slot === 0) {
      doc.addPage();
      top = header();
    }
    const usableH = pageH - top - 10; // 10 mm footer
    const slotW = (contentW - (cols - 1) * gap) / cols;
    const slotH = (usableH - (rows - 1) * gap) / rows;
    const x0 = margin + (slot % cols) * (slotW + gap);
    const y0 = top + Math.floor(slot / cols) * (slotH + gap);

    // Estimated table height (cursor rows + delta rows) to size the render.
    const cc = charts[i].cursorCount?.() || 0;
    const tableEst = cc ? 7.5 + (2 * cc - 1) * 4.8 : 0;
    const imgHmm = Math.max(22, slotH - 7 - tableEst - 2);
    const pxPerMm = 4.2;
    const item = await charts[i].render({
      width: Math.round(slotW * pxPerMm),
      height: Math.round(imgHmm * pxPerMm),
    });

    doc.setFontSize(cols > 1 || n > 2 ? 9 : 10.5);
    doc.setTextColor(30);
    doc.setFont(undefined, "bold");
    doc.text(doc.splitTextToSize(item.title || `Plot ${i + 1}`, slotW)[0], x0, y0 + 4);
    doc.setFont(undefined, "normal");

    const tableH = cursorTableHeight(doc, item.cursors, slotW);
    const maxImgH = Math.max(18, slotH - 6 - tableH - 2);
    const aspect = item.width / item.height;
    let imgW = slotW, imgH = imgW / aspect;
    if (imgH > maxImgH) { imgH = maxImgH; imgW = imgH * aspect; }
    doc.addImage(item.image, "PNG", x0, y0 + 6, imgW, imgH, undefined, "FAST");
    drawCursorTable(doc, item.cursors, x0, y0 + 6 + imgH + 1, slotW, item.xUnit);
    onProgress?.((i + 1) / charts.length);
    await new Promise((r) => setTimeout(r, 0)); // keep the UI responsive between plots
  }

  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(createdByLine(createdBy), margin, pageH - 5);
    doc.text(`Seite ${p} / ${pages}`, pageW - margin, pageH - 5, { align: "right" });
  }
  return doc;
}
