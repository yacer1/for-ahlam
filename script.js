/* =========================================================
   EDIT ME — dialogue, letter, music, timings
   ========================================================= */
const DIALOGUE = {
  hi: "Hi!",
  sorry: "I’m sorry I couldn’t come in person, so I made this for you instead.",
  wish: "Make a wish ✨",
};

// (The letters now live in letters.js — edit the text there.)

// Put the song file in assets/audio/ and match the name here.
const MUSIC_SRC = "music.mp3"; // "We Fell in Love in October"
const MUSIC_VOLUME = 0.35;

const T = { // milliseconds
  typeSpeed: 45, bubbleHold: 1800, foxMove: 1300, candleStagger: 450,
  extinguishStagger: 280, smokeWait: 1800, letterOpen: 1100,
};

/* ========================================================= */
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stage = $("#stage"), fox = $("#fox"), bubble = $("#bubble"), bubbleText = $("#bubble-text");
const hint = $("#hint"), cakeWrap = $("#cake-wrap"), cake = $("#cake"), wish = $("#wish");
const envelopes = [...document.querySelectorAll(".envelope")], overlay = $("#letter-overlay"), musicBtn = $("#music-btn");
const candles = [...document.querySelectorAll(".candle")];
let busy = true; // blocks clicks while a sequence is running

/* ---- fox state system: idle | waving | sad | happy | transition ---- */
const setState = (s) => (fox.dataset.state = s);

/* ---- speech bubble ---- */
async function say(text) {
  bubbleText.textContent = "";
  bubble.classList.add("show");
  for (const ch of text) { bubbleText.textContent += ch; await sleep(T.typeSpeed); }
}
const hideBubble = () => bubble.classList.remove("show");

/* ---- music (starts after first interaction, quietly) ---- */
const music = new Audio(MUSIC_SRC);
music.loop = true; music.volume = 0; music.preload = "auto";
let muted = false, musicStarted = false;
function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  music.play().then(() => fade(muted ? 0 : MUSIC_VOLUME)).catch(() => (musicStarted = false));
}
function fade(to) {
  clearInterval(fade.t);
  fade.t = setInterval(() => {
    music.volume = Math.max(0, Math.min(1, music.volume + Math.sign(to - music.volume) * 0.02));
    if (Math.abs(music.volume - to) < 0.02) { music.volume = to; clearInterval(fade.t); }
  }, 60);
}
let musicMissing = false;
music.addEventListener("error", () => { musicMissing = true; musicBtn.classList.add("needs-file"); musicBtn.title = "Choose your song file"; });
$("#music-file").addEventListener("change", (e) => {
  const f = e.target.files[0]; if (!f) return;
  music.src = URL.createObjectURL(f); musicMissing = false; musicStarted = false;
  musicBtn.classList.remove("needs-file"); startMusic();
});
musicBtn.addEventListener("click", () => {
  if (musicMissing) { $("#music-file").click(); return; }
  muted = !muted; musicBtn.classList.toggle("muted", muted);
  if (!musicStarted) startMusic(); else fade(muted ? 0 : MUSIC_VOLUME);
});
document.addEventListener("pointerdown", startMusic, { once: true });

/* ---- ambient sparkles ---- */
const sp = $("#sparkles");
for (let i = 0; i < 22; i++) {
  const s = document.createElement("span");
  s.style.cssText = `left:${Math.random() * 100}%;--s:${2 + Math.random() * 5}px;--d:${9 + Math.random() * 10}s;--delay:${-Math.random() * 12}s;--x:${-40 + Math.random() * 80}px`;
  sp.appendChild(s);
}

/* ---- text on the outside of the envelopes ---- */
envelopes.forEach((env) => (env.querySelector(".env-label").textContent = LETTERS[+env.dataset.i].label));

/* ---- letter content (rebuilt each time an envelope opens) ---- */
function renderLetter(i) {
  const L = LETTERS[i], body = $("#letter-body");
  $("#letter-title").textContent = L.title;
  body.innerHTML = "";
  L.text.trim().split(/\n\s*\n/).forEach((t) => {
    const p = document.createElement("p"); p.textContent = t.trim(); body.appendChild(p);
  });
  $("#letter-sign").textContent = L.sign;
  $("#letter").scrollTop = 0;
}

/* =========================================================
   SCENES
   ========================================================= */
async function scene1() {                      // Fox says Hi
  setState("waving");
  await sleep(900);
  await say(DIALOGUE.hi);
  hint.classList.add("show");
  busy = false;
}

$("#fox-btn").addEventListener("click", async () => {   // Scene 2 + 3
  if (busy) return; busy = true;
  hint.classList.remove("show");
  setState("transition"); hideBubble(); await sleep(500);
  setState("sad");
  await sleep(600);
  await say(DIALOGUE.sorry);
  await sleep(T.bubbleHold);
  hideBubble(); await sleep(500);

  stage.dataset.scene = "cake";                 // fox slides aside, cake floats up
  setState("happy");
  cakeWrap.classList.add("show");
  await sleep(T.foxMove);
  for (const c of candles) { c.classList.add("lit"); await sleep(T.candleStagger); }
  await sleep(500);
  wish.textContent = DIALOGUE.wish;
  wish.classList.add("show");
  cake.classList.add("clickable");
  stage.dataset.scene = "wish";
  busy = false;
});

cake.addEventListener("click", async (e) => {           // Scene 4
  if (busy || stage.dataset.scene !== "wish") return;
  if (!e.target.closest(".candle") && e.target.id !== "candle-hit") return;
  busy = true;
  cake.classList.remove("clickable");
  wish.classList.remove("show"); wish.classList.add("gone");
  blowWind();                                           // air gust sweeps over the flames
  cake.classList.add("blowing");
  await sleep(550);
  for (const c of candles) { c.classList.remove("lit"); c.classList.add("out"); await sleep(T.extinguishStagger); }
  cake.classList.remove("blowing");
  stage.dataset.scene = "out";
  FX.celebrate();                                       // confetti + fireworks
  await sleep(T.smokeWait);
  envelopes.forEach((e) => e.classList.add("show"));    // Scene 5
  busy = false;
});

envelopes.forEach((env) => env.addEventListener("click", async () => {
  if (busy) return; busy = true;
  current = env;
  env.classList.add("open");
  renderLetter(+env.dataset.i);
  await sleep(T.letterOpen);
  overlay.classList.add("show"); overlay.setAttribute("aria-hidden", "false");
  FX.pop();                                             // soft confetti when a letter opens
}));
let current = null;
$("#letter-close").addEventListener("click", () => {
  overlay.classList.remove("show"); overlay.setAttribute("aria-hidden", "true");
  current.classList.add("read");
  busy = false;
});

/* ---- wind gust: curved streaks sweeping left → right across the candles ---- */
function blowWind() {
  const ns = "http://www.w3.org/2000/svg", g = document.createElementNS(ns, "g");
  for (let i = 0; i < 8; i++) {
    const p = document.createElementNS(ns, "path"), y = 12 + i * 11, w = 50 + Math.random() * 50;
    p.setAttribute("d", `M0 ${y} q${w / 4} -8 ${w / 2} 0 t${w / 2} 0 q10 -6 18 -2`);
    p.setAttribute("class", "gust"); p.style.animationDelay = `${i * 60}ms`; g.appendChild(p);
  }
  cake.appendChild(g); setTimeout(() => g.remove(), 1800);
}

/* ---- loading state: wait for fonts + page, then begin ---- */
Promise.race([Promise.all([document.fonts.ready, new Promise((r) => addEventListener("load", r))]), sleep(3500)]).then(async () => {
  await sleep(400);
  $("#loader").classList.add("done");
  scene1();
});
