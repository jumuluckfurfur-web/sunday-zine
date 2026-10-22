import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.mjs";

const pdfPath = "./SUNDAY_ZINE_VOL2_AUTOSAVE.pdf";

const status = document.getElementById("status");

try {
  const loadingTask = pdfjsLib.getDocument({
    url: pdfPath
  });

  const pdf = await loadingTask.promise;

  status.textContent =
    `SUNDAY ZINE Vol.2 / ${pdf.numPages} pages / PDF loaded`;

  console.log("PDF loaded:", pdf.numPages, "pages");

} catch (error) {
  console.error(error);

  status.textContent =
    "PDF를 불러오지 못했습니다.";
}