import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.mjs";

const pdfPath = "./SUNDAY_ZINE_VOL2_AUTOSAVE.pdf";

const status = document.getElementById("status");
const book = document.getElementById("book");

let pdf;

try {
  pdf = await pdfjsLib.getDocument(pdfPath).promise;
  status.textContent = `PDF 확인 완료 / ${pdf.numPages} pages`;
} catch (error) {
  console.error("PDF load error:", error);
  status.textContent = "PDF 파일을 읽는 단계에서 오류가 발생했습니다.";
  throw error;
}

try {
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 1.5 });
  const outputScale = window.devicePixelRatio || 1;

  const canvas = document.createElement("canvas");

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);

  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const transform =
    outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : null;

  await page.render({
    canvas: canvas,
    viewport: viewport,
    transform: transform
  }).promise;

  book.innerHTML = "";
  book.appendChild(canvas);
  book.style.display = "block";

  status.textContent = `SUNDAY ZINE Vol.2 / ${pdf.numPages} pages`;

} catch (error) {
  console.error("Page render error:", error);
  status.textContent = "PDF는 읽었지만 페이지를 그리는 단계에서 오류가 발생했습니다.";
}