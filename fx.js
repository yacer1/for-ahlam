/* =========================================================
   FIREWORKS + CONFETTI  (canvas) — customize here
   ========================================================= */
const FX_COLORS = ["#ff6f91", "#ffc75f", "#fff3b0", "#9fd8f0", "#c9b5ea", "#ff9671", "#ffffff"];
const FX_FIREWORK_COUNT = 6;      // rockets per celebration
const FX_FIREWORK_SPACING = 650;  // ms between rockets
const FX_CONFETTI_PER_CANNON = 90;

const FX = (() => {
  const cv = document.getElementById("fx"), ctx = cv.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W, H, dpr, confetti = [], sparks = [], rockets = [], running = false, last = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = () => FX_COLORS[(Math.random() * FX_COLORS.length) | 0];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize); resize();

  /* confetti cannon: shoots paper pieces in a cone, they flutter down */
  function cannon(x, y, angleDeg, count = FX_CONFETTI_PER_CANNON, power = 1) {
    for (let i = 0; i < count; i++) {
      const a = (angleDeg + rnd(-28, 28)) * Math.PI / 180, v = rnd(380, 900) * power * Math.min(1, H / 700 + .3);
      confetti.push({ x, y, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, w: rnd(6, 12), h: rnd(4, 8),
        rot: rnd(0, 6.28), vr: rnd(-9, 9), ph: rnd(0, 6.28), vp: rnd(4, 9), col: pick(), life: 0, max: rnd(3.2, 5) });
    }
    start();
  }

  function rocket(x, ty) {
    rockets.push({ x, y: H + 10, vx: rnd(-20, 20), vy: -rnd(620, 760), ty, col: pick() }); start();
  }
  function explode(x, y, col) {
    const n = 70, big = rnd(180, 330);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + rnd(-.05, .05), v = big * rnd(.55, 1);
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: Math.random() < .25 ? "#fff" : col, life: 0, max: rnd(1.1, 1.7), trail: [] });
    }
  }

  function start() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }

  function loop(t) {
    const dt = Math.min(.033, (t - last) / 1000); last = t;
    ctx.clearRect(0, 0, W, H);

    // rockets
    ctx.globalCompositeOperation = "lighter";
    rockets = rockets.filter((r) => {
      r.vy += 380 * dt; r.x += r.vx * dt; r.y += r.vy * dt;
      ctx.fillStyle = "#ffe9b0"; ctx.beginPath(); ctx.arc(r.x, r.y, 2.4, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(255,220,150,.5)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - r.vx * .05, r.y - r.vy * .05); ctx.stroke();
      if (r.vy >= -60 || r.y <= r.ty) { explode(r.x, r.y, r.col); return false; }
      return true;
    });

    // sparks with trails + glow
    sparks = sparks.filter((s) => {
      s.life += dt; if (s.life > s.max) return false;
      s.vx *= .985; s.vy = s.vy * .985 + 150 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      s.trail.push(s.x, s.y); if (s.trail.length > 12) s.trail.splice(0, 2);
      const k = 1 - s.life / s.max;
      ctx.strokeStyle = s.col; ctx.globalAlpha = k; ctx.lineWidth = 2.2 * k + .4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(s.trail[0], s.trail[1]);
      for (let i = 2; i < s.trail.length; i += 2) ctx.lineTo(s.trail[i], s.trail[i + 1]);
      ctx.stroke(); return true;
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";

    // confetti
    confetti = confetti.filter((c) => {
      c.life += dt; if (c.life > c.max || c.y > H + 30) return false;
      const drag = Math.pow(.12, dt);                     // air resistance
      c.vx *= drag; c.vy = c.vy * drag + 420 * dt;        // gentle gravity
      c.vy = Math.min(c.vy, 230);         // terminal velocity → flutter
      c.x += c.vx * dt + Math.sin(c.life * 3 + c.ph) * 18 * dt; c.y += c.vy * dt;
      c.rot += c.vr * dt; c.ph += c.vp * dt;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.scale(1, Math.cos(c.ph));
      ctx.globalAlpha = Math.min(1, (c.max - c.life) * 1.5); ctx.fillStyle = c.col;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); ctx.restore();
      return true;
    });
    ctx.globalAlpha = 1;

    if (confetti.length || sparks.length || rockets.length) requestAnimationFrame(loop);
    else { running = false; ctx.clearRect(0, 0, W, H); }
  }

  function fireworks(n = FX_FIREWORK_COUNT) {
    if (reduce) return;
    for (let i = 0; i < n; i++) setTimeout(() => rocket(rnd(W * .12, W * .88), rnd(H * .12, H * .42)), i * FX_FIREWORK_SPACING);
  }

  /* big moment: cannons from both bottom corners + fireworks */
  function celebrate() {
    if (reduce) return;
    cannon(0, H, 62); cannon(W, H, 118);
    setTimeout(() => { cannon(W * .15, H, 75, 50, .9); cannon(W * .85, H, 105, 50, .9); }, 450);
    fireworks();
  }
  /* small moment: soft pop from the middle */
  function pop() { if (!reduce) cannon(W / 2, H * .7, 90, 60, .8); }

  return { celebrate, pop, fireworks, cannon };
})();
