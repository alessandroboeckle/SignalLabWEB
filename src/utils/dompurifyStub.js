// Same situation as html2canvasStub.js — jsPDF's .html() method also
// pulls in DOMPurify to sanitize HTML before rendering it, and we never
// call .html() (every PDF export in this app draws manually via
// doc.addImage()). See vite.config.js for the alias and
// html2canvasStub.js for the fuller explanation.
export default {
  sanitize: () => {
    throw new Error(
      "DOMPurify was stubbed out (see vite.config.js) because it was unused — " +
        "if you're now calling jsPDF's .html() method, remove the alias.",
    );
  },
};
