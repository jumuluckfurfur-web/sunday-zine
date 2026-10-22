import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.mjs";

const pdfUrl = "./SUNDAY_ZINE_VOL2_AUTOSAVE.pdf";

const status = document.getElementById("status");
const book = document.getElementById("book");

try {
  // PDF 불러오기
  const loadingTask = pdfjsLib.getDocument({
    url: pdfUrl
  });

  const pdf = await loadingTask.promise;

  // 첫 페이지 불러오기
  const page = await pdf.getPage(1);

  // 렌더링 크기
  const scale = 1.5;
  const viewport = page.getViewport({ scale });

  // 고해상도 화면 대응
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

  const renderContext = {
    canvasContext: context,
    transform: transform,
    viewport: viewport
  };

  await page.render(renderContext).promise;

  book.innerHTML = "";
  book.appendChild(canvas);
  book.style.display = "block";

  status.textContent =
    `SUNDAY ZINE Vol.2 / ${pdf.numPages} pages`;

} catch (error) {
  console.error(error);

  status.textContent =
    `오류: ${error.name || "Error"} — ${error.message || error}`;
}