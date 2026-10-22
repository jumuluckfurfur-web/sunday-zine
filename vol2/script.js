import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299/build/pdf.worker.mjs";


const pdfUrl =
  "./SUNDAY_ZINE_VOL2_AUTOSAVE.pdf";


const main =
  document.querySelector("main");

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


const RENDER_WIDTH = 1600;

let pageRatio = 258 / 183;

let pageFlip = null;

let totalPages = 0;

const temporaryImageUrls = [];


/*
  실제로 책이 들어갈 main 영역을 측정해서
  가능한 최대 페이지 크기를 계산한다.
*/
function getBookSize() {

  const isMobile =
    window.innerWidth <= 700;

  const availableWidth =
    main.clientWidth;

  const availableHeight =
    main.clientHeight;


  let pageWidth;


  if (isMobile) {

    /*
      모바일:
      한 페이지가 화면 안에 최대한 크게 들어가도록
    */
    const widthLimit =
      availableWidth - 16;

    const heightLimit =
      (availableHeight - 8) /
      pageRatio;

    pageWidth =
      Math.min(
        widthLimit,
        heightLimit
      );

  } else {

    /*
      데스크톱:
      두 페이지 펼침이 main 영역을
      거의 가득 사용하도록
    */
    const widthLimit =
      (availableWidth - 32) / 2;

    const heightLimit =
      (availableHeight - 12) /
      pageRatio;

    pageWidth =
      Math.min(
        widthLimit,
        heightLimit
      );

  }


  pageWidth =
    Math.floor(pageWidth);


  const pageHeight =
    Math.floor(
      pageWidth * pageRatio
    );


  return {
    width: pageWidth,
    height: pageHeight
  };
}


/*
  Canvas → 손실 없는 PNG
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
  이미지 로딩 완료 대기
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
  페이지 카운터
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
  PDF 한 페이지를 고해상도 PNG로 만든다.
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


    /*
      실제 PDF 비율을 읽어서 사용한다.
    */
    const firstPage =
      await pdf.getPage(1);


    const firstViewport =
      firstPage.getViewport({
        scale: 1
      });


    pageRatio =
      firstViewport.height /
      firstViewport.width;


    firstPage.cleanup();


    pageCounter.textContent =
      `01 / ${String(totalPages).padStart(2, "0")}`;


    /*
      PDF 페이지 준비
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
      크기를 계산하기 전에
      하단 컨트롤 영역을 레이아웃에 먼저 포함시킨다.
      보이지 않게만 해둔다.
    */
    controls.hidden =
      false;

    controls.style.visibility =
      "hidden";


    /*
      위 변경사항을 브라우저 레이아웃에 반영한 뒤
      실제 main 크기를 읽는다.
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


        controls.style.visibility =
          "visible";


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
  페이지 종료 시 임시 PNG 정리
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