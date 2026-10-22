import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.mjs";

const pdfPath = "./SUNDAY_ZINE_VOL2_AUTOSAVE.pdf";

const status = document.getElementById("status");
const book = document.getElementById("book");

try {
  const pdf = await pdfjsLib.getDocument(pdfPath).promise;

  status.textContent = `SUNDAY ZINE Vol.2 / ${pdf.numPages} pages`;

  const page = await pdf.getPage(1);

  const scale = 1.5;
  const viewport = page.getViewport({ scale });

  const outputScale = window.devicePixelRatio || 1;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);

  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const transform =
    outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : null;

  await page.render({
    canvasContext: context,
    transform,
    viewport
  }).promise;

  book.appendChild(canvas);
  book.style.display = "block";

} catch (error) {
  console.error(error);
  status.textContent = "PDF를 불러오지 못했습니다.";
}