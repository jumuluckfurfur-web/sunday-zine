import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.mjs";

const pdfUrl = "./SUNDAY_ZINE_VOL2_AUTOSAVE.pdf";

const book = document.getElementById("book");
const status = document.getElementById("status");

const controls = document.getElementById("controls");
const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");
const pageCounter = document.getElementById("page-counter");

const PAGE_WIDTH = 500;
const PAGE_HEIGHT = Math.round(PAGE_WIDTH * 258 / 183);

const RENDER_WIDTH = 1400;
const JPEG_QUALITY = 0.94;

let pageFlip = null;
let totalPages = 0;

const temporaryImageUrls = [];


function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("페이지 이미지를 만들 수 없습니다."));
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}


function waitForImage(image) {
  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    image.onload = () => resolve();

    image.onerror = () => {
      reject(new Error("페이지 이미지를 불러올 수 없습니다."));
    };
  });
}


function updateCounter(pageIndex) {
  const currentPage =
    Math.min(pageIndex + 1, totalPages);

  pageCounter.textContent =
    `${String(currentPage).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`;

  prevButton.disabled =
    pageIndex <= 0;

  nextButton.disabled =
    pageIndex >= totalPages - 1;
}


async function createPageImage(pdf, pageNumber) {
  const page =
    await pdf.getPage(pageNumber);

  const baseViewport =
    page.getViewport({
      scale: 1
    });

  const renderScale =
    RENDER_WIDTH / baseViewport.width;

  const viewport =
    page.getViewport({
      scale: renderScale
    });

  const canvas =
    document.createElement("canvas");

  const context =
    canvas.getContext("2d", {
      alpha: false
    });

  if (!context) {
    throw new Error("Canvas를 만들 수 없습니다.");
  }

  canvas.width =
    Math.ceil(viewport.width);

  canvas.height =
    Math.ceil(viewport.height);

  context.fillStyle = "#ffffff";

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  const blob =
    await canvasToBlob(canvas);

  const imageUrl =
    URL.createObjectURL(blob);

  temporaryImageUrls.push(imageUrl);

  const pageElement =
    document.createElement("div");

  pageElement.className = "page";

  if (
    pageNumber === 1 ||
    pageNumber === totalPages
  ) {
    pageElement.dataset.density = "hard";
  }

  const image =
    document.createElement("img");

  image.src = imageUrl;

  image.alt =
    `SUNDAY ZINE Vol.2 page ${pageNumber}`;

  image.draggable = false;

  pageElement.appendChild(image);

  book.appendChild(pageElement);

  await waitForImage(image);

  canvas.width = 1;
  canvas.height = 1;

  page.cleanup();
}


async function startViewer() {
  try {
    if (!window.St || !window.St.PageFlip) {
      throw new Error(
        "플립북 라이브러리를 불러오지 못했습니다."
      );
    }

    const loadingTask =
      pdfjsLib.getDocument({
        url: pdfUrl
      });

    const pdf =
      await loadingTask.promise;

    totalPages =
      pdf.numPages;

    pageCounter.textContent =
      `01 / ${String(totalPages).padStart(2, "0")}`;

    for (
      let pageNumber = 1;
      pageNumber <= totalPages;
      pageNumber++
    ) {
      status.textContent =
        `페이지 준비 중 ${pageNumber} / ${totalPages}`;

      await createPageImage(
        pdf,
        pageNumber
      );
    }

    pageFlip =
      new window.St.PageFlip(
        book,
        {
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,

          size: "stretch",

          minWidth: 230,
          maxWidth: PAGE_WIDTH,

          minHeight: Math.round(
            230 * 258 / 183
          ),

          maxHeight: PAGE_HEIGHT,

          startPage: 0,

          drawShadow: true,

          flippingTime: 700,

          usePortrait: true,

          autoSize: true,

          maxShadowOpacity: 0.25,

          showCover: true,

          mobileScrollSupport: true,

          swipeDistance: 30,

          useMouseEvents: true,

          showPageCorners: true,

          disableFlipByClick: false
        }
      );

    pageFlip.on(
      "init",
      (event) => {
        status.style.display = "none";

        book.classList.add("ready");

        controls.hidden = false;

        updateCounter(
          event.data.page
        );
      }
    );

    pageFlip.on(
      "flip",
      (event) => {
        updateCounter(
          event.data
        );
      }
    );

    pageFlip.loadFromHTML(
      book.querySelectorAll(".page")
    );

    prevButton.addEventListener(
      "click",
      () => {
        pageFlip.flipPrev();
      }
    );

    nextButton.addEventListener(
      "click",
      () => {
        pageFlip.flipNext();
      }
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "ArrowLeft") {
          pageFlip.flipPrev();
        }

        if (event.key === "ArrowRight") {
          pageFlip.flipNext();
        }
      }
    );

  } catch (error) {
    console.error(error);

    book.classList.remove("ready");

    controls.hidden = true;

    status.style.display = "block";

    status.textContent =
      `오류: ${error.message || error}`;
  }
}


window.addEventListener(
  "beforeunload",
  () => {
    for (
      const url
      of temporaryImageUrls
    ) {
      URL.revokeObjectURL(url);
    }
  }
);


startViewer();