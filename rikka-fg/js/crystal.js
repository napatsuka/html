// Hero snow crystal: a six-fold dendrite grows out from the centre while snow drifts past.
// Each click grows a new crystal from a new seed; the old one melts away underneath.
(() => {
  const cvs = document.getElementById('crystal');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GROW_MS = 5600, MELT_MS = 1400;

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0;
  let current = null, melting = null, flakes = [];
  let rot = 0, last = 0, visible = true;
  const pointer = { x: .5, y: .5 };

  // Small seeded PRNG so a crystal is reproducible from its seed.
  const rng = s => () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // One arm along +x, in unit lengths. d0/d1 are distances from the centre, used as the growth front.
  function arm(r) {
    const segs = [{ x1: 0, y1: 0, x2: 1, y2: 0, d0: 0, d1: 1, w: 2.4 }];
    const A = Math.PI / 3;
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const p = .16 + (i / n) * .72 + r() * .04;
      const len = Math.min((1 - p) * (.22 + r() * .38), p * .75);
      const subs = Math.floor(r() * 3);
      const qs = Array.from({ length: subs }, (_, k) => .3 + (.55 * (k + 1)) / (subs + 1));
      const subLen = qs.map(q => len * (1 - q) * (.35 + r() * .45));
      for (const s of [1, -1]) {
        const x2 = p + Math.cos(A) * len, y2 = s * Math.sin(A) * len;
        segs.push({ x1: p, y1: 0, x2, y2, d0: p, d1: p + len, w: 1.6 });
        qs.forEach((q, k) => {
          const bx = p + (x2 - p) * q, by = (y2) * q, l2 = subLen[k], d0 = p + len * q;
          segs.push({ x1: bx, y1: by, x2: bx + l2, y2: by, d0, d1: d0 + l2, w: 1 });
        });
      }
    }
    return segs;
  }

  function crystal(seed) {
    const r = rng(seed);
    const one = arm(r);
    const segs = [];
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3, c = Math.cos(a), s = Math.sin(a);
      one.forEach(g => segs.push({
        x1: g.x1 * c - g.y1 * s, y1: g.x1 * s + g.y1 * c,
        x2: g.x2 * c - g.y2 * s, y2: g.x2 * s + g.y2 * c,
        d0: g.d0, d1: g.d1, w: g.w,
      }));
    }
    // Central hexagonal plate.
    [.11, .055].forEach(rad => {
      for (let k = 0; k < 6; k++) {
        const a0 = (k * Math.PI) / 3 + Math.PI / 6, a1 = a0 + Math.PI / 3;
        segs.push({ x1: Math.cos(a0) * rad, y1: Math.sin(a0) * rad, x2: Math.cos(a1) * rad, y2: Math.sin(a1) * rad, d0: 0, d1: rad, w: 1 });
      }
    });
    const dMax = Math.max(...segs.map(g => g.d1));
    return { segs, dMax, born: performance.now() };
  }

  function makeFlakes() {
    const n = Math.round(Math.min(160, (W * H) / 9000));
    flakes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      z: Math.random(), // depth: 0 far, 1 near
      ph: Math.random() * Math.PI * 2,
    }));
  }

  function size() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cvs.clientWidth; H = cvs.clientHeight;
    cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
    const narrow = W < 760;
    cx = narrow ? W * .62 : W * .7;
    cy = narrow ? H * .3 : H * .46;
    R = narrow ? Math.min(W * .46, H * .3) : Math.min(W * .27, H * .42);
    makeFlakes();
  }

  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function drawCrystal(c, front, alpha) {
    const g = ctx;
    g.save();
    g.translate(cx + (pointer.x - .5) * -18, cy + (pointer.y - .5) * -12);
    g.rotate(rot);
    g.scale(R, R);
    g.lineCap = 'round';
    for (const pass of [0, 1]) {
      g.strokeStyle = pass ? `rgba(236,243,250,${.92 * alpha})` : `rgba(169,200,232,${.16 * alpha})`;
      g.beginPath();
      for (const s of c.segs) {
        if (front <= s.d0) continue;
        const k = Math.min(1, (front - s.d0) / (s.d1 - s.d0 || 1));
        g.moveTo(s.x1, s.y1);
        g.lineTo(s.x1 + (s.x2 - s.x1) * k, s.y1 + (s.y2 - s.y1) * k);
      }
      g.lineWidth = (pass ? 1.4 : 7) / R;
      g.stroke();
    }
    // The growth front glows while the crystal is still forming.
    if (front > 0 && front < c.dMax) {
      g.beginPath(); g.arc(0, 0, front, 0, Math.PI * 2);
      g.strokeStyle = `rgba(169,200,232,${.22 * alpha * (1 - front / c.dMax)})`;
      g.lineWidth = 1 / R; g.stroke();
    }
    g.restore();
  }

  function drawFlakes(dt, now) {
    const g = ctx;
    for (const f of flakes) {
      if (dt) {
        f.y += (10 + f.z * 34) * dt;
        f.x += Math.sin(now / 1600 + f.ph) * (4 + f.z * 10) * dt + (pointer.x - .5) * f.z * 8 * dt;
        if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        if (f.x > W + 4) f.x = -4; else if (f.x < -4) f.x = W + 4;
      }
      const r = .6 + f.z * 1.8;
      g.fillStyle = `rgba(236,243,250,${.18 + f.z * .5})`;
      g.beginPath(); g.arc(f.x, f.y, r, 0, Math.PI * 2); g.fill();
    }
  }

  function render(now, dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawFlakes(dt, now);
    if (melting) {
      const t = Math.max(0, (now - melting.gone) / MELT_MS);
      if (t >= 1) melting = null;
      else drawCrystal(melting, melting.dMax, 1 - t);
    }
    if (current) {
      const t = reduce ? 1 : Math.min(1, Math.max(0, (now - current.born) / GROW_MS));
      drawCrystal(current, easeOut(t) * current.dMax, 1);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    const dt = Math.min(.05, (now - (last || now)) / 1000);
    last = now;
    rot += dt * .018;
    render(now, dt);
  }

  function regrow() {
    if (current) { melting = current; melting.gone = performance.now(); }
    current = crystal(Math.floor(Math.random() * 1e9));
    if (reduce) { melting = null; render(performance.now(), 0); }
  }

  cvs.addEventListener('click', regrow);
  cvs.closest('.hero').addEventListener('pointermove', e => {
    const r = cvs.getBoundingClientRect();
    pointer.x = (e.clientX - r.left) / r.width; pointer.y = (e.clientY - r.top) / r.height;
  });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(cvs);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  let lastW = 0, timer;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (Math.abs(cvs.clientWidth - lastW) < 2) return;
      lastW = cvs.clientWidth; size(); if (reduce) render(performance.now(), 0);
    }, 150);
  });

  size(); lastW = cvs.clientWidth;
  current = crystal(20260402);
  if (reduce) render(performance.now(), 0);
  else requestAnimationFrame(frame);
})();
