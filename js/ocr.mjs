// Simple wrapper for in-browser Tesseract.js OCR
export async function ocrImageDataUrl(dataUrl) {
  if (!window.Tesseract) {
    console.warn("Tesseract not found; OCR disabled. Place vendor/tesseract files to enable OCR.");
    return ""; // graceful fallback: return empty text so recognition continues without throwing
  }

  // If Tesseract.recognize is present (older builds), use it
  if (typeof window.Tesseract.recognize === "function") {
    const res = await window.Tesseract.recognize(dataUrl, "eng", { logger: () => {} });
    return String(res?.data?.text || "").trim();
  }

  // Otherwise try worker API
  if (typeof window.Tesseract.createWorker === "function") {
    const worker = window.Tesseract.createWorker({ logger: () => {} });
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

  console.warn("Unsupported Tesseract API in vendor script; OCR disabled.");
  return "";
}
