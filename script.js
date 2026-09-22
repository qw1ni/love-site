const NO_PHRASES = [
  "Ты уверена?",
  "Правда нет?",
  "Может, всё-таки да?",
  "Ну пожалуйста…",
  "Сердце говорит иначе",
  "Не убегай от любви",
  "Ещё разок подумай",
  "Я в тебя верю",
  "Это не тот ответ",
  "Хмм, попробуй «да»",
];

const BOOK_IMAGES = [
  "photos/cover.png",
  "photos/1sheet.png",
  "photos/2sheet.png",
  "photos/3sheet.png",
  "photos/4sheet.png",
  "photos/6sheet.png",
  "photos/7sheet.png",
  "photos/8sheet.png",
  "photos/9sheet.png",
  "photos/10sheet.png",
  "photos/11sheet.png",
  "photos/12sheet.png",
  "photos/13sheet.png",
];

const heartsRoot = document.getElementById("hearts");
const askScreen = document.getElementById("ask-screen");
const bookScreen = document.getElementById("book-screen");
const bookEl = document.getElementById("book");
const bookPages = document.getElementById("book-pages");
const pageCounter = document.getElementById("page-counter");
const bookHint = document.getElementById("book-hint");
const yesBtn = document.getElementById("yes-btn");
const noBtn = document.getElementById("no-btn");
const backBtn = document.getElementById("back-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const noHome = document.getElementById("no-home");

const MARGIN = 12;
const COOLDOWN_MS = 180;
const FLIP_MS = 700;
const DRAG_THRESHOLD = 0.28;

let moveLocked = false;
let currentPage = 0;
let isFlipping = false;
let pageNodes = [];

const drag = {
  active: false,
  startX: 0,
  pageIndex: 0,
  direction: null,
};

function spawnHearts(count = 18) {
  const symbols = ["♥", "♡", "❤"];
  for (let i = 0; i < count; i += 1) {
    const heart = document.createElement("span");
    heart.className = "heart";
    heart.textContent = symbols[i % symbols.length];
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.bottom = `${-10 - Math.random() * 30}%`;
    heart.style.fontSize = `${0.7 + Math.random() * 1.8}rem`;
    heart.style.animationDuration = `${8 + Math.random() * 12}s`;
    heart.style.animationDelay = `${Math.random() * 10}s`;
    heartsRoot.appendChild(heart);
  }
}

function viewport() {
  const vv = window.visualViewport;
  return {
    width: vv?.width ?? document.documentElement.clientWidth,
    height: vv?.height ?? document.documentElement.clientHeight,
    left: vv?.offsetLeft ?? 0,
    top: vv?.offsetTop ?? 0,
  };
}

function randomInRange(min, max) {
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}

function boundsForButton() {
  const vp = viewport();
  const width = Math.ceil(noBtn.getBoundingClientRect().width);
  const height = Math.ceil(noBtn.getBoundingClientRect().height);

  return {
    width,
    height,
    minLeft: vp.left + MARGIN,
    minTop: vp.top + MARGIN,
    maxLeft: vp.left + vp.width - width - MARGIN,
    maxTop: vp.top + vp.height - height - MARGIN,
  };
}

function placeButton(left, top) {
  const b = boundsForButton();
  const safeLeft = Math.min(Math.max(left, b.minLeft), Math.max(b.minLeft, b.maxLeft));
  const safeTop = Math.min(Math.max(top, b.minTop), Math.max(b.minTop, b.maxTop));
  noBtn.style.left = `${safeLeft}px`;
  noBtn.style.top = `${safeTop}px`;
}

function randomSafePosition(pointerX, pointerY) {
  const b = boundsForButton();
  let left = b.minLeft;
  let top = b.minTop;

  for (let i = 0; i < 30; i += 1) {
    left = randomInRange(b.minLeft, Math.max(b.minLeft, b.maxLeft));
    top = randomInRange(b.minTop, Math.max(b.minTop, b.maxTop));

    const cx = left + b.width / 2;
    const cy = top + b.height / 2;
    if (Math.hypot(cx - pointerX, cy - pointerY) > 130) break;
  }

  return { left, top };
}

function ensureFleeing() {
  if (noBtn.classList.contains("is-fleeing")) return;

  const rect = noBtn.getBoundingClientRect();
  document.body.appendChild(noBtn);
  noBtn.classList.add("is-fleeing");
  noBtn.style.left = `${rect.left}px`;
  noBtn.style.top = `${rect.top}px`;
}

function moveNoButton(event) {
  if (moveLocked || noBtn.hidden) return;
  moveLocked = true;

  noBtn.textContent = NO_PHRASES[Math.floor(Math.random() * NO_PHRASES.length)];
  ensureFleeing();

  const pointerX = event?.clientX ?? viewport().width / 2;
  const pointerY = event?.clientY ?? viewport().height / 2;
  const { left, top } = randomSafePosition(pointerX, pointerY);
  placeButton(left, top);

  window.setTimeout(() => {
    moveLocked = false;
  }, COOLDOWN_MS);
}

function resetNoButton() {
  moveLocked = false;
  noBtn.classList.remove("is-fleeing");
  noBtn.style.left = "";
  noBtn.style.top = "";
  noBtn.textContent = "Нет";
  noBtn.hidden = false;
  noHome.appendChild(noBtn);
}

function buildBook() {
  bookPages.innerHTML = "";
  pageNodes = BOOK_IMAGES.map((src, index) => {
    const page = document.createElement("article");
    page.className = "page";
    page.dataset.index = String(index);
    page.style.zIndex = String(BOOK_IMAGES.length - index);

    page.innerHTML = `
      <div class="page__face page__face--front">
        <img src="${src}" alt="Страница ${index + 1}" draggable="false" />
        <div class="page__shade" aria-hidden="true"></div>
      </div>
      <div class="page__face page__face--back" aria-hidden="true"></div>
    `;

    bookPages.appendChild(page);
    return page;
  });

  currentPage = 0;
  syncBookUI();
}

function syncBookUI() {
  pageNodes.forEach((page, index) => {
    page.classList.toggle("is-flipped", index < currentPage);
    if (!page.classList.contains("is-animating")) {
      page.style.transform = "";
    }
    page.style.zIndex = index < currentPage
      ? String(index + 1)
      : String(BOOK_IMAGES.length - index + 10);
  });

  bookEl.classList.toggle("is-cover", currentPage === 0);
  pageCounter.textContent = `${currentPage + 1} / ${BOOK_IMAGES.length}`;
  prevBtn.disabled = currentPage <= 0 || isFlipping;
  nextBtn.disabled = currentPage >= BOOK_IMAGES.length - 1 || isFlipping;

  if (currentPage === 0) {
    bookHint.textContent = "Открой книгу — потяни обложку влево или нажми ›";
  } else if (currentPage === BOOK_IMAGES.length - 1) {
    bookHint.textContent = "Последняя страница — можно листать назад";
  } else {
    bookHint.textContent = "Тяни страницу или кликай по краям, чтобы листать";
  }
}

function finishFlip(targetPage) {
  currentPage = targetPage;
  isFlipping = false;
  pageNodes.forEach((page) => {
    page.classList.remove("is-animating");
    page.style.transition = "";
    page.style.transform = "";
  });
  syncBookUI();
}

function flipTo(targetPage) {
  if (isFlipping) return;
  if (targetPage < 0 || targetPage >= BOOK_IMAGES.length) return;
  if (targetPage === currentPage) return;

  isFlipping = true;
  const goingForward = targetPage > currentPage;
  const page = goingForward
    ? pageNodes[currentPage]
    : pageNodes[targetPage];

  // Expand frame before leaving the square cover.
  if (goingForward && currentPage === 0) {
    bookEl.classList.remove("is-cover");
  }

  page.classList.add("is-animating");
  page.style.zIndex = String(BOOK_IMAGES.length + 20);
  page.style.transition = `transform ${FLIP_MS}ms cubic-bezier(0.22, 0.8, 0.28, 1)`;

  // Force style flush before toggling class.
  void page.offsetWidth;

  if (goingForward) {
    page.classList.add("is-flipped");
  } else {
    page.classList.remove("is-flipped");
  }

  prevBtn.disabled = true;
  nextBtn.disabled = true;

  window.setTimeout(() => finishFlip(targetPage), FLIP_MS);
}

function nextPage() {
  flipTo(currentPage + 1);
}

function prevPage() {
  flipTo(currentPage - 1);
}

function onPointerDown(event) {
  if (isFlipping || event.button === 2) return;

  drag.active = true;
  drag.startX = event.clientX;
  drag.pageIndex = currentPage;
  drag.direction = null;
  bookEl.classList.add("is-dragging");
  bookEl.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event) {
  if (!drag.active || isFlipping) return;

  const rect = bookEl.getBoundingClientRect();
  const delta = event.clientX - drag.startX;
  const progress = Math.max(-1, Math.min(1, delta / (rect.width * 0.7)));

  if (!drag.direction) {
    if (Math.abs(progress) < 0.04) return;
    drag.direction = progress < 0 ? "forward" : "back";
  }

  if (drag.direction === "forward") {
    if (currentPage >= BOOK_IMAGES.length - 1) return;
    if (currentPage === 0) bookEl.classList.remove("is-cover");
    const page = pageNodes[currentPage];
    const angle = Math.max(-180, Math.min(0, progress * 180));
    page.classList.add("is-animating");
    page.style.zIndex = String(BOOK_IMAGES.length + 20);
    page.style.transition = "none";
    page.style.transform = `rotateY(${angle}deg)`;
  } else {
    if (currentPage <= 0) return;
    const page = pageNodes[currentPage - 1];
    const angle = Math.max(-180, Math.min(0, -180 + progress * 180));
    page.classList.add("is-animating");
    page.style.zIndex = String(BOOK_IMAGES.length + 20);
    page.style.transition = "none";
    page.style.transform = `rotateY(${angle}deg)`;
  }
}

function onPointerUp(event) {
  if (!drag.active) return;
  drag.active = false;
  bookEl.classList.remove("is-dragging");

  const rect = bookEl.getBoundingClientRect();
  const delta = event.clientX - drag.startX;
  const progress = delta / (rect.width * 0.7);

  if (!drag.direction) {
    // Simple click: left third = back, right third = forward.
    const localX = event.clientX - rect.left;
    if (localX > rect.width * 0.62) nextPage();
    else if (localX < rect.width * 0.38) prevPage();
    return;
  }

  if (drag.direction === "forward") {
    const page = pageNodes[currentPage];
    page.style.transition = `transform ${FLIP_MS}ms cubic-bezier(0.22, 0.8, 0.28, 1)`;
    if (progress <= -DRAG_THRESHOLD && currentPage < BOOK_IMAGES.length - 1) {
      isFlipping = true;
      page.classList.add("is-flipped");
      page.style.transform = "";
      window.setTimeout(() => finishFlip(currentPage + 1), FLIP_MS);
    } else {
      page.style.transform = "rotateY(0deg)";
      window.setTimeout(() => {
        page.classList.remove("is-animating");
        page.style.transition = "";
        page.style.transform = "";
        syncBookUI();
      }, FLIP_MS);
    }
  } else {
    const page = pageNodes[currentPage - 1];
    page.style.transition = `transform ${FLIP_MS}ms cubic-bezier(0.22, 0.8, 0.28, 1)`;
    if (progress >= DRAG_THRESHOLD && currentPage > 0) {
      isFlipping = true;
      page.classList.remove("is-flipped");
      page.style.transform = "";
      window.setTimeout(() => finishFlip(currentPage - 1), FLIP_MS);
    } else {
      page.style.transform = "rotateY(-180deg)";
      window.setTimeout(() => {
        page.classList.remove("is-animating");
        page.style.transition = "";
        page.style.transform = "";
        syncBookUI();
      }, FLIP_MS);
    }
  }

  drag.direction = null;
}

function showBook() {
  askScreen.hidden = true;
  bookScreen.hidden = false;
  noBtn.hidden = true;
  document.body.classList.add("theme-book");
  currentPage = 0;
  pageNodes.forEach((page) => {
    page.classList.remove("is-flipped", "is-animating");
    page.style.transform = "";
    page.style.transition = "";
  });
  syncBookUI();
}

function showAsk() {
  bookScreen.hidden = true;
  askScreen.hidden = false;
  document.body.classList.remove("theme-book");
  resetNoButton();
}

yesBtn.addEventListener("click", showBook);
backBtn.addEventListener("click", showAsk);
prevBtn.addEventListener("click", prevPage);
nextBtn.addEventListener("click", nextPage);

bookEl.addEventListener("pointerdown", onPointerDown);
bookEl.addEventListener("pointermove", onPointerMove);
bookEl.addEventListener("pointerup", onPointerUp);
bookEl.addEventListener("pointercancel", onPointerUp);

window.addEventListener("keydown", (event) => {
  if (bookScreen.hidden) return;
  if (event.key === "ArrowRight") nextPage();
  if (event.key === "ArrowLeft") prevPage();
});

noBtn.addEventListener("pointerenter", moveNoButton);
noBtn.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  moveNoButton(event);
});

window.addEventListener("resize", () => {
  if (noBtn.classList.contains("is-fleeing") && !noBtn.hidden) {
    placeButton(
      Number.parseFloat(noBtn.style.left) || MARGIN,
      Number.parseFloat(noBtn.style.top) || MARGIN,
    );
  }
});

window.visualViewport?.addEventListener("resize", () => {
  if (noBtn.classList.contains("is-fleeing") && !noBtn.hidden) {
    placeButton(
      Number.parseFloat(noBtn.style.left) || MARGIN,
      Number.parseFloat(noBtn.style.top) || MARGIN,
    );
  }
});

spawnHearts();
buildBook();
