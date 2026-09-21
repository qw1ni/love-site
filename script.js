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

const heartsRoot = document.getElementById("hearts");
const askScreen = document.getElementById("ask-screen");
const storyScreen = document.getElementById("story-screen");
const yesBtn = document.getElementById("yes-btn");
const noBtn = document.getElementById("no-btn");
const backBtn = document.getElementById("back-btn");
const noHome = document.getElementById("no-home");

const MARGIN = 12;
const COOLDOWN_MS = 180;

let moveLocked = false;

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

function showStory() {
  askScreen.hidden = true;
  storyScreen.hidden = false;
  noBtn.hidden = true;
}

function showAsk() {
  storyScreen.hidden = true;
  askScreen.hidden = false;
  resetNoButton();
}

yesBtn.addEventListener("click", showStory);
backBtn.addEventListener("click", showAsk);

noBtn.addEventListener("pointerenter", moveNoButton);
noBtn.addEventListener("pointerdown", (event) => {
  // Mobile / trackpad: jump before a click can land.
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
