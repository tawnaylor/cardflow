// Simple wrapper for in-browser Tesseract.js OCR
export async function ocrImageDataUrl(dataUrl) {
  if (!window.Tesseract) throw new Error("Tesseract not loaded.");

  // Prefer worker API when available and point to local vendor files if present.
  const local = {
    workerPath: './vendor/tesseract/worker.min.js',
    corePath: './vendor/tesseract/tesseract-core.wasm.js',
    langPath: './vendor/tesseract/'
  };

  if (typeof window.Tesseract.createWorker === "function") {
    const worker = window.Tesseract.createWorker({ logger: () => {}, ...local });
    try {
      await worker.load();
      await worker.loadLanguage("eng");
      await worker.initialize("eng");
      const { data } = await worker.recognize(dataUrl);
      return String(data?.text || "").trim();
    } finally {
      try { await worker.terminate(); } catch (_) {}
    }
  }

  // Fallback to bundled recognize (older bundle); pass local paths so it doesn't fetch CDN.
  if (typeof window.Tesseract.recognize === "function") {
    const res = await window.Tesseract.recognize(dataUrl, "eng", { logger: () => {}, ...local });
    return String(res?.data?.text || "").trim();
  }

  throw new Error("Unsupported Tesseract API in vendor script.");
}
