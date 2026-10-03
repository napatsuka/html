// Hero circuit board: traces route themselves on a 24px grid, then signals run along them.
// The pointer acts as a probe: traces near it light up and attract more signals; a click sends a burst.
(() => {
  const cvs = document.getElementById('board');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PITCH = 24;
  const COPPER = '208,138,87';
  const HOT = '242,178,126';
  const SILK = '237,235,227';
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

  let W = 0, H = 0, DPR = 1, cols = 0, rows = 0, grid;
  let traces = [], chips = [], pulses = [], flashes = [];
  let base, lit, litCtx;
  let bootStart = 0, booted = false, last = 0, raf = 0, visible = true, spawnAcc = 0, signals = 0;
  const probe = { x: -9999, y: -9999, on: false };
  const sigEl = document.getElementById('sig-count');
  const traceEl = document.getElementById('trace-count');

  const rand = (a, b) => a + Math.random() * (b - a);
  const idx = (c, r) => r * cols + c;
  const free = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !grid[idx(c, r)];

  function placeChips() {
    chips = [];
    const n = W > 900 ? 4 : 2;
    for (let k = 0; k < n * 6 && chips.length < n; k++) {
      const w = Math.round(rand(4, 7)), h = Math.round(rand(3, 5));
      const c = Math.round(rand(cols * (W > 900 ? .5 : .15), cols - w - 3));
      const r = Math.round(W > 900 ? rand(3, rows - h - 9) : rand(3, Math.max(4, rows * .28 - h)));
      let ok = true;
      for (let y = r - 2; y <= r + h + 2 && ok; y++) for (let x = c - 3; x <= c + w + 3; x++) if (!free(x, y)) { ok = false; break; }
      if (!ok) continue;
      for (let y = r; y <= r + h; y++) for (let x = c; x <= c + w; x++) grid[idx(x, y)] = 1;
      chips.push({ c, r, w, h, ref: `U${chips.length + 3}` });
    }
  }

  // Walk from (c, r) heading `d`; turn by 45 degrees now and then, the way PCB autorouters chamfer corners.
  function route(c, r, d, maxLen) {
    const pts = [[c, r]];
    const cells = [];
    let len = 0, straight = 0;
    while (len < maxLen) {
      if (straight > 2 && Math.random() < .14) {
        const nd = (d + (Math.random() < .5 ? 1 : 7)) % 8;
        if (d % 2 === 0 || nd % 2 === 0) { d = nd; pts.push([c, r]); straight = 0; }
      }
      if (d % 2 === 1 && straight > 2) { d = (d + (Math.random() < .5 ? 1 : 7)) % 8; pts.push([c, r]); straight = 0; }
      const nc = c + DIRS[d][0], nr = r + DIRS[d][1];
      if (!free(nc, nr)) break;
      if (d % 2 === 1 && (!free(c + DIRS[d][0], r) || !free(c, r + DIRS[d][1]))) break;
      c = nc; r = nr; cells.push(idx(c, r)); grid[idx(c, r)] = 1;
      len++; straight++;
    }
    pts.push([c, r]);
    return { pts, cells, len };
  }

  function addTrace(c, r, d, min, max) {
    if (!free(c, r)) return;
    grid[idx(c, r)] = 1;
    const t = route(c, r, d, Math.round(rand(min, max)));
    if (t.len < min) { grid[idx(c, r)] = 0; t.cells.forEach(i => (grid[i] = 0)); return; }
    const pts = t.pts.map(([x, y]) => [x * PITCH + PITCH / 2, y * PITCH + PITCH / 2])
      .filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    traces.push({ pts, lens, total: lens[lens.length - 1], box: [x0, y0, x1, y1], delay: 0 });
  }

  function build() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cvs.clientWidth; H = cvs.clientHeight;
    cvs.width = Math.round(W * DPR); cvs.height = Math.round(H * DPR);
    cols = Math.ceil(W / PITCH); rows = Math.ceil(H / PITCH);
    grid = new Uint8Array(cols * rows);
    traces = []; pulses = []; flashes = [];

    placeChips();
    // Pins on both long sides of every chip fan out first.
    chips.forEach(ch => {
      for (let y = ch.r; y <= ch.r + ch.h; y++) {
        addTrace(ch.c - 1, y, 4, 4, 26);
        addTrace(ch.c + ch.w + 1, y, 0, 4, 26);
      }
      for (let x = ch.c + 1; x < ch.c + ch.w; x += 2) {
        addTrace(x, ch.r - 1, 6, 3, 18);
        addTrace(x, ch.r + ch.h + 1, 2, 3, 18);
      }
    });
    // Then fill the rest of the board.
    const target = Math.round((cols * rows) / 16);
    for (let k = 0; k < target * 6 && traces.length < target; k++) {
      addTrace(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows), [0, 2, 4, 6][Math.floor(Math.random() * 4)], 4, 30);
    }
    // Boot order: a wave spreading out from the first chip (or the right edge).
    const ox = chips[0] ? (chips[0].c + chips[0].w / 2) * PITCH : W * .75, oy = chips[0] ? (chips[0].r + chips[0].h / 2) * PITCH : H * .5;
    const far = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
    traces.forEach(t => { t.delay = (Math.hypot(t.pts[0][0] - ox, t.pts[0][1] - oy) / far) * 1100; });

    base = renderLayer(`rgba(${COPPER},.30)`, `rgba(${COPPER},.45)`, true);
    lit = renderLayer(`rgba(${HOT},.95)`, `rgba(${HOT},1)`, false);
    litCtx = document.createElement('canvas').getContext('2d');
    litCtx.canvas.width = cvs.width; litCtx.canvas.height = cvs.height;
    if (traceEl) traceEl.textContent = traces.length;
  }

  function strokePath(g, t, upto = Infinity) {
    const p = t.pts;
    g.beginPath(); g.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) {
      if (t.lens[i] <= upto) { g.lineTo(p[i][0], p[i][1]); continue; }
      const k = (upto - t.lens[i - 1]) / (t.lens[i] - t.lens[i - 1]);
      g.lineTo(p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k);
      break;
    }
    g.stroke();
  }

  function pad(g, x, y, color) {
    g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.strokeStyle = color; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fillStyle = '#0A2A22'; g.fill();
  }

  function drawChips(g) {
    chips.forEach(ch => {
      const x = ch.c * PITCH, y = ch.r * PITCH, w = (ch.w + 1) * PITCH, h = (ch.h + 1) * PITCH;
      g.fillStyle = '#134637'; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(143,176,161,.55)'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1);
      g.beginPath(); g.arc(x + 10, y + 10, 3, 0, Math.PI * 2); g.fillStyle = `rgba(${SILK},.35)`; g.fill();
      g.fillStyle = `rgba(${SILK},.55)`; g.font = '600 12px Archivo, sans-serif'; g.fillText(ch.ref, x + 8, y + h - 10);
    });
  }

  function renderLayer(stroke, padColor, withChips) {
    const g = document.createElement('canvas').getContext('2d');
    g.canvas.width = cvs.width; g.canvas.height = cvs.height;
    g.scale(DPR, DPR);
    g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = stroke;
    traces.forEach(t => strokePath(g, t));
    traces.forEach(t => { const e = t.pts[t.pts.length - 1]; pad(g, e[0], e[1], padColor); });
    if (withChips) drawChips(g);
    return g.canvas;
  }

  function pointAt(t, s) {
    const L = t.lens;
    let i = 1;
    while (i < L.length - 1 && L[i] < s) i++;
    const k = Math.min(1, Math.max(0, (s - L[i - 1]) / (L[i] - L[i - 1] || 1)));
    const a = t.pts[i - 1], b = t.pts[i];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }

  const near = (t, r) => probe.on && probe.x > t.box[0] - r && probe.x < t.box[2] + r && probe.y > t.box[1] - r && probe.y < t.box[3] + r;

  function spawn(fromProbe) {
    if (!traces.length || pulses.length > 80) return;
    let pool = traces;
    if (fromProbe) { const n = traces.filter(t => near(t, 120)); if (n.length) pool = n; }
    const t = pool[Math.floor(Math.random() * pool.length)];
    pulses.push({ t, s: 0, v: rand(180, 340), tail: rand(40, 90) });
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    const dt = Math.min(.05, (now - (last || now)) / 1000);
    last = now;
    const g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cvs.width, cvs.height);

    if (!booted) {
      const el = now - bootStart;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawChips(g);
      g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round';
      let done = true;
      traces.forEach(t => {
        const p = Math.min(1, Math.max(0, (el - t.delay) / 700));
        if (p < 1) done = false;
        if (p <= 0) return;
        const upto = t.total * (1 - Math.pow(1 - p, 3));
        g.strokeStyle = `rgba(${p < 1 ? HOT : COPPER},${p < 1 ? .9 : .3})`;
        strokePath(g, t, upto);
        if (p === 1) { const e = t.pts[t.pts.length - 1]; pad(g, e[0], e[1], `rgba(${COPPER},.45)`); }
      });
      if (done) booted = true;
      return;
    }

    g.drawImage(base, 0, 0);

    // Probe: reveal the lit layer through a soft circle around the pointer.
    if (probe.on) {
      const R = 150 * DPR, px = probe.x * DPR, py = probe.y * DPR;
      litCtx.globalCompositeOperation = 'source-over';
      litCtx.clearRect(0, 0, litCtx.canvas.width, litCtx.canvas.height);
      litCtx.drawImage(lit, 0, 0);
      litCtx.globalCompositeOperation = 'destination-in';
      const rg = litCtx.createRadialGradient(px, py, 0, px, py, R);
      rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      litCtx.fillStyle = rg; litCtx.fillRect(px - R, py - R, R * 2, R * 2);
      g.drawImage(litCtx.canvas, 0, 0);
    }

    g.setTransform(DPR, 0, 0, DPR, 0, 0);

    spawnAcc += dt * (probe.on ? 20 : 11);
    while (spawnAcc > 1) { spawnAcc--; spawn(probe.on && Math.random() < .7); }

    g.lineCap = 'round';
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.s += p.v * dt;
      const head = Math.min(p.s, p.t.total);
      const steps = 6;
      for (let k = 0; k < steps; k++) {
        const s0 = head - (p.tail * (k + 1)) / steps, s1 = head - (p.tail * k) / steps;
        if (s1 <= 0) break;
        const a = pointAt(p.t, Math.max(0, s0)), b = pointAt(p.t, s1);
        g.strokeStyle = `rgba(${HOT},${(1 - k / steps) * .9})`;
        g.lineWidth = 2.6 - k * .3;
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      }
      const h = pointAt(p.t, head);
      const glow = g.createRadialGradient(h[0], h[1], 0, h[0], h[1], 12);
      glow.addColorStop(0, `rgba(${HOT},.9)`); glow.addColorStop(1, `rgba(${HOT},0)`);
      g.fillStyle = glow; g.beginPath(); g.arc(h[0], h[1], 12, 0, Math.PI * 2); g.fill();
      if (p.s >= p.t.total) {
        flashes.push({ x: h[0], y: h[1], life: 1 });
        pulses.splice(i, 1);
        signals++;
      }
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.life -= dt * 2.2;
      if (f.life <= 0) { flashes.splice(i, 1); continue; }
      g.beginPath(); g.arc(f.x, f.y, 5 + (1 - f.life) * 14, 0, Math.PI * 2);
      g.strokeStyle = `rgba(${HOT},${f.life * .8})`; g.lineWidth = 1.5; g.stroke();
      g.beginPath(); g.arc(f.x, f.y, 4.5, 0, Math.PI * 2); g.fillStyle = `rgba(${HOT},${f.life})`; g.fill();
    }

    if (probe.on) {
      g.strokeStyle = `rgba(${SILK},.45)`; g.lineWidth = 1;
      g.beginPath(); g.arc(probe.x, probe.y, 16, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(probe.x - 24, probe.y); g.lineTo(probe.x - 8, probe.y); g.moveTo(probe.x + 8, probe.y); g.lineTo(probe.x + 24, probe.y);
      g.moveTo(probe.x, probe.y - 24); g.lineTo(probe.x, probe.y - 8); g.moveTo(probe.x, probe.y + 8); g.lineTo(probe.x, probe.y + 24); g.stroke();
    }
    if (sigEl) sigEl.textContent = signals.toLocaleString('en-US');
  }

  function drawStatic() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(base, 0, 0);
  }

  const hero = cvs.closest('.hero');
  const localPoint = e => { const r = cvs.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
  hero.addEventListener('pointermove', e => {
    const [x, y, r] = localPoint(e);
    probe.x = x; probe.y = y; probe.on = e.pointerType === 'mouse' && y >= 0 && y <= r.height;
  });
  hero.addEventListener('pointerleave', () => { probe.on = false; });
  hero.addEventListener('pointerdown', e => {
    if (reduce || e.target.closest('a, button')) return;
    const [x, y] = localPoint(e);
    probe.x = x; probe.y = y;
    const wasOn = probe.on; probe.on = true;
    for (let k = 0; k < 14; k++) spawn(true);
    probe.on = wasOn || e.pointerType === 'mouse';
  });

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(cvs);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  let resizeTimer;
  let lastW = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (Math.abs(cvs.clientWidth - lastW) < 2 && reduce) return;
      if (Math.abs(cvs.clientWidth - lastW) < 2 && booted) return; // ignore mobile toolbar height changes
      lastW = cvs.clientWidth;
      build(); booted = reduce; bootStart = performance.now();
      if (reduce) drawStatic();
    }, 200);
  });

  const start = () => {
    build(); lastW = cvs.clientWidth;
    if (reduce) { booted = true; drawStatic(); return; }
    bootStart = performance.now();
    raf = requestAnimationFrame(frame);
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
})();
