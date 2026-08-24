// jsPDF statically imports html2canvas internally to support its .html()
// method (renders a live DOM element to canvas) — but MtExport.vue never
// calls that method; every PDF here is built manually via doc.addImage()
// with an already-rendered chart image. Since jsPDF's import isn't
// conditional, Vite bundles the real html2canvas (~200 KB) into the
// export chunk regardless of whether it's ever used.
//
// This file is aliased in vite.config.js to replace it — if some future
// code path does end up needing jsPDF.html(), this throws a clear error
// immediately instead of silently misbehaving, so the alias is easy to
// spot and remove.
export default function html2canvasStub() {
  throw new Error(
    "html2canvas was stubbed out (see vite.config.js) because it was unused — " +
      "if you're now calling jsPDF's .html() method, remove the alias.",
  );
}
