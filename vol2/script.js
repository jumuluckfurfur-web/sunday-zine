import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.mjs";


const pdfUrl =
  "./SUNDAY_ZINE_VOL2_AUTOSAVE.pdf";


const book =
  document.getElementById("book");

const status =
  document.getElementById("status");

const controls =
  document.getElementById("controls");

const prevButton =
  document.getElementById("prev");

const nextButton =
  document.getElementById("next");

const pageCounter =
  document.getElementById("page-counter");


const PAGE_RATIO =
  258 / 183;

const RENDER_WIDTH =
  1600;


let pageFlip = null;

let totalPages = 0;

const temporaryImageUrls = [];


/*
  현재 브라우저 크기에 맞춰
  실제 화면에 표시할 한 페이지 크기를 계산한다.
*/
function getBookSize() {
  const isMobile =
    window.innerWidth <= 700;

  const horizontalMargin =
    isMobile ? 16 : 70;

  const verticalSpace =
    isMobile ? 100 : 125;

  const availableWidth =
    Math.max(
      280,
      window.innerWidth - horizontalMargin
    );

  const availableHeight =
    Math.max(
      360,
      window.innerHeight - verticalSpace
    );

  let pageWidth;

  if (isMobile) {
    pageWidth =
      Math.min(
        620,
        availableWidth,
        availableHeight / PAGE_RATIO
      );
  } else {
    pageWidth =
      Math.min(
        620,
        availableWidth / 2,
        availableHeight / PAGE_RATIO
      );
  }

  pageWidth =
    Math.floor(pageWidth);

  const pageHeight =
    Math.floor(
      pageWidth * PAGE_RATIO
    );

  return {
    width: pageWidth,
    height: pageHeight
  };
}


/*
  Canvas를 손실 없는 PNG Blob으로 변환한다.
*/
function canvasToPngBlob(canvas) {
  return new Promise(
    (resolve, reject) => {

      canvas.toBlob(
        (blob) => {

          if (blob) {
            resolve(blob);

          } else {
            reject(
              new Error(
                "페이지 이미지를 만들 수 없습니다."
              )
            );
          }

        },
        "image/png"
      );

    }
  );
}


/*
  브라우저가 이미지를 실제로 읽을 때까지 기다린다.
*/
function waitForImage(image) {

  if (
    image.complete &&
    image.naturalWidth > 0
  ) {
    return Promise.resolve();
  }

  return new Promise(
    (resolve, reject) => {

      image.onload =
        () => resolve();

      image.onerror =
        () => reject(
          new Error(
            "페이지 이미지를 불러올 수 없습니다."
          )
        );

    }
  );
}


/*
  페이지 번호 표시와 화살표 상태 갱신
*/
function updateCounter(pageIndex) {

  const currentPage =
    Math.min(
      pageIndex + 1,
      totalPages
    );

  pageCounter.textContent =
    `${String(currentPage).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`;

  prevButton.disabled =
    pageIndex <= 0;

  nextButton.disabled =
    pageIndex >= totalPages - 1;
}


/*
  PDF 한 페이지를 고해상도 PNG 페이지로 만든다.
*/
async function createPageImage(
  pdf,
  pageNumber
) {

  const page =
    await pdf.getPage(
      pageNumber
    );

  const originalViewport =
    page.getViewport({
      scale: 1
    });

  const renderScale =
    RENDER_WIDTH /
    originalViewport.width;

  const viewport =
    page.getViewport({
      scale: renderScale
    });


  const canvas =
    document.createElement(
      "canvas"
    );

  const context =
    canvas.getContext(
      "2d",
      {
        alpha: false
      }
    );


  if (!context) {
    throw new Error(
      "Canvas를 만들 수 없습니다."
    );
  }


  canvas.width =
    Math.ceil(
      viewport.width
    );

  canvas.height =
    Math.ceil(
      viewport.height
    );


  context.fillStyle =
    "#ffffff";

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
    await canvasToPngBlob(
      canvas
    );


  const imageUrl =
    URL.createObjectURL(
      blob
    );

  temporaryImageUrls.push(
    imageUrl
  );


  const pageElement =
    document.createElement(
      "div"
    );

  pageElement.className =
    "page";


  /*
    앞표지와 뒤표지를
    단단한 표지로 지정
  */
  if (
    pageNumber === 1 ||
    pageNumber === totalPages
  ) {
    pageElement.dataset.density =
      "hard";
  }


  const image =
    document.createElement(
      "img"
    );

  image.src =
    imageUrl;

  image.alt =
    `SUNDAY ZINE Vol.2 page ${pageNumber}`;

  image.draggable =
    false;

  image.decoding =
    "async";


  pageElement.appendChild(
    image
  );

  book.appendChild(
    pageElement
  );


  await waitForImage(
    image
  );


  /*
    변환이 끝난 Canvas 메모리 해제
  */
  canvas.width = 1;
  canvas.height = 1;

  page.cleanup();
}


/*
  플립북 시작
*/
async function startViewer() {

  try {

    if (
      !window.St ||
      !window.St.PageFlip
    ) {
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


    /*
      PDF 44페이지를 순서대로
      PNG 페이지로 준비
    */
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


    /*
      브라우저 크기를 기준으로
      책 크기 결정
    */
    const bookSize =
      getBookSize();


    pageFlip =
      new window.St.PageFlip(
        book,
        {
          width:
            bookSize.width,

          height:
            bookSize.height,

          size:
            "fixed",

          startPage:
            0,

          drawShadow:
            true,

          flippingTime:
            700,

          usePortrait:
            true,

          autoSize:
            true,

          maxShadowOpacity:
            0.22,

          showCover:
            true,

          mobileScrollSupport:
            true,

          swipeDistance:
            30,

          useMouseEvents:
            true,

          showPageCorners:
            true,

          disableFlipByClick:
            false
        }
      );


    pageFlip.on(
      "init",
      (event) => {

        status.style.display =
          "none";

        book.classList.add(
          "ready"
        );

        controls.hidden =
          false;


        if (
          event.data &&
          typeof event.data.page === "number"
        ) {
          updateCounter(
            event.data.page
          );

        } else {
          updateCounter(0);
        }

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
      book.querySelectorAll(
        ".page"
      )
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

        if (
          event.key ===
          "ArrowLeft"
        ) {
          pageFlip.flipPrev();
        }

        if (
          event.key ===
          "ArrowRight"
        ) {
          pageFlip.flipNext();
        }

      }
    );


  } catch (error) {

    console.error(
      error
    );


    book.classList.remove(
      "ready"
    );

    controls.hidden =
      true;

    status.style.display =
      "block";

    status.textContent =
      `오류: ${error.message || error}`;

  }

}


/*
  페이지를 닫으면
  임시 PNG URL 정리
*/
window.addEventListener(
  "beforeunload",
  () => {

    for (
      const url
      of temporaryImageUrls
    ) {
      URL.revokeObjectURL(
        url
      );
    }

  }
);


startViewer();