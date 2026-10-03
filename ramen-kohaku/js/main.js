(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = id => document.getElementById(id);
  const TAU = Math.PI * 2;

  /* ---------- header ---------- */
  const head = $('head');
  const menuBtn = head.querySelector('.menu-btn');
  const setOpen = open => {
    head.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('.t').textContent = open ? '閉じる' : 'メニュー';
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setOpen(!head.classList.contains('is-open')));
  head.querySelectorAll('.gnav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && head.classList.contains('is-open')) { setOpen(false); menuBtn.focus(); } });
  const onScrollHead = () => head.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScrollHead, { passive: true });
  onScrollHead();

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in');
    io.unobserve(en.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-in], [data-wipe]').forEach(el => io.observe(el));

  /* =====================================================================
     The bowl: a bowl of shoyu ramen seen from above, drawn on a canvas.
     Everything inside the soup is in "units": the soup's radius is 1.
     ===================================================================== */
  const LAYERS = ['tare', 'soup', 'oil', 'noodles', 'chashu', 'menma', 'negi', 'egg'];

  /* The meander (雷紋) drawn around a ring, as on the rim of a ramen bowl. */
  function meanderRing(g, rOut, rIn, lw, color) {
    const band = rOut - rIn;
    const cells = Math.round((TAU * (rOut + rIn) / 2) / band);
    const da = TAU / cells;
    const P = [[0, 6], [6, 6], [6, 0], [0, 0], [0, 4], [4, 4], [4, 2], [2, 2]];
    const at = (a0, px, py) => {
      const a = a0 + ((px + .5) / 7) * da;
      const r = rOut - ((py + .5) / 7) * band;
      return [Math.cos(a) * r, Math.sin(a) * r];
    };
    g.strokeStyle = color;
    g.lineWidth = lw;
    g.lineJoin = 'miter'; g.lineCap = 'square';
    g.beginPath();
    for (let c = 0; c < cells; c++) {
      const a0 = c * da;
      const seg = (p, q) => {
        for (let s = 0; s <= 6; s++) {
          const t = s / 6;
          const [x, y] = at(a0, p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t);
          s === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
      };
      for (let i = 0; i < P.length - 1; i++) seg(P[i], P[i + 1]);
      seg([6, 6], [7, 6]);
    }
    g.stroke();
  }

  function Bowl(canvas, { place, dark = false }) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0, S = 0;
    let bowlCv, noodleCv, dropCv, tops = {};
    const target = Object.fromEntries(LAYERS.map(k => [k, 0]));
    const val = Object.fromEntries(LAYERS.map(k => [k, 0]));
    const ptr = { x: 9, y: 9, vx: 0, vy: 0, seen: 0, down: false };
    const ripples = [];
    let drops = [];
    let running = false, visible = true, last = 0, raf = 0, idleSplit = 0;

    // ---- deterministic randomness, so the bowl looks the same after a resize
    const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    const offscreen = (w, h) => {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
      return c;
    };

    /* ---- static bowl: shadow, porcelain, the meander on the rim, inner wall ---- */
    function drawBowl() {
      bowlCv = offscreen(W * dpr, H * dpr);
      const g = bowlCv.getContext('2d');
      g.scale(dpr, dpr);
      g.translate(cx, cy);

      // shadow
      g.save();
      g.filter = `blur(${Math.round(R * .06)}px)`;
      g.fillStyle = dark ? 'rgba(0,0,0,.55)' : 'rgba(43,26,16,.26)';
      g.beginPath(); g.arc(R * .05, R * .08, R * .99, 0, TAU); g.fill();
      g.restore();

      // porcelain
      let gr = g.createRadialGradient(-R * .35, -R * .4, R * .1, 0, 0, R);
      gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(.75, '#F3F3EF'); gr.addColorStop(1, '#DADBD5');
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(43,26,16,.12)'; g.lineWidth = 1;
      g.stroke();

      // the meander band
      meanderRing(g, R * .955, R * .885, Math.max(1, R * .0042), '#A9361F');
      g.lineWidth = Math.max(1, R * .003);
      [R * .97, R * .87].forEach(r => { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); });

      // inner wall, sloping down to the soup
      const wall = R * .845;
      gr = g.createRadialGradient(0, 0, S * .98, 0, 0, wall);
      gr.addColorStop(0, '#C9C9C1'); gr.addColorStop(.35, '#E4E4DE'); gr.addColorStop(1, '#F8F8F5');
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, wall, 0, TAU); g.fill();
      // light comes from the upper left, so the upper-left wall is in shade
      const lg = g.createLinearGradient(-wall, -wall, wall, wall);
      lg.addColorStop(0, 'rgba(60,40,20,.16)'); lg.addColorStop(.5, 'rgba(60,40,20,0)'); lg.addColorStop(1, 'rgba(255,255,255,.25)');
      g.fillStyle = lg;
      g.beginPath(); g.arc(0, 0, wall, 0, TAU); g.fill();
      // rim highlight
      g.strokeStyle = 'rgba(255,255,255,.9)';
      g.lineWidth = R * .012;
      g.beginPath(); g.arc(0, 0, R * .985, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
    }

    /* ---- noodles: thin straight noodles, folded neatly into the soup ---- */
    function drawNoodles() {
      const k = S * dpr;
      noodleCv = offscreen(2 * k, 2 * k);
      const g = noodleCv.getContext('2d');
      g.translate(k, k); g.scale(k, k);
      const rnd = rng(7);
      const bundle = (ox, oy, rot, rx, ry, n, lift) => {
        g.save();
        g.translate(ox, oy); g.rotate(rot);
        g.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const v = -1 + (2 * (i + .5)) / n + (rnd() - .5) * .02;
          const half = rx * Math.sqrt(Math.max(0, 1 - v * v)) * (.92 + rnd() * .1);
          const y0 = v * ry;
          const ph = rnd() * TAU, amp = .004 + rnd() * .005;
          const path = new Path2D();
          for (let s = 0; s <= 24; s++) {
            const x = -half + (2 * half * s) / 24;
            const y = y0 + Math.sin(x * 11 + ph) * amp + x * x * .06;
            s === 0 ? path.moveTo(x, y) : path.lineTo(x, y);
          }
          const w = .019 + rnd() * .004;
          g.strokeStyle = `rgba(110,70,20,${.35 + lift})`; g.lineWidth = w * 1.45; g.stroke(path);
          const l = 78 + rnd() * 8;
          g.strokeStyle = `hsl(${42 + rnd() * 4}, ${62 + rnd() * 8}%, ${l}%)`; g.lineWidth = w; g.stroke(path);
          g.save(); g.translate(-w * .15, -w * .2);
          g.strokeStyle = 'rgba(255,250,225,.55)'; g.lineWidth = w * .3; g.stroke(path);
          g.restore();
        }
        g.restore();
      };
      bundle(-.06, .16, -.42, .66, .34, 46, 0);
      bundle(.04, -.02, -.32, .5, .2, 22, .1);  // the fold, lying on top
    }

    /* ---- one oil droplet, drawn once and scaled ---- */
    function drawDrop() {
      const s = 96;
      dropCv = offscreen(s, s);
      const g = dropCv.getContext('2d');
      const r = s / 2 - 2;
      g.translate(s / 2, s / 2);
      // Oil on broth is flat: a pale gold disc, a thin darker rim, and only a faint glint.
      const gr = g.createRadialGradient(-r * .25, -r * .3, r * .05, 0, 0, r);
      gr.addColorStop(0, 'rgba(255,232,165,.6)');
      gr.addColorStop(.7, 'rgba(246,206,118,.42)');
      gr.addColorStop(1, 'rgba(232,176,78,.5)');
      g.fillStyle = gr;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(122,70,14,.42)'; g.lineWidth = s * .028;
      g.beginPath(); g.arc(0, 0, r - s * .016, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,250,230,.45)'; g.lineWidth = s * .03; g.lineCap = 'round';
      g.beginPath(); g.arc(0, 0, r * .7, Math.PI * 1.15, Math.PI * 1.35); g.stroke();
    }

    /* ---- toppings: each on its own small canvas so it can drop in ---- */
    function topping(cxu, cyu, size, draw, seed) {
      const k = S * dpr, px = size * k;
      const c = offscreen(px * 2, px * 2);
      const g = c.getContext('2d');
      g.translate(px, px); g.scale(k, k);
      draw(g, rng(seed));
      return { cv: c, x: cxu, y: cyu, size };
    }
    function blob(g, rx, ry, rnd, wob = .06) {
      const p = new Path2D();
      const a = [rnd() * TAU, rnd() * TAU, rnd() * TAU];
      for (let s = 0; s <= 48; s++) {
        const t = (s / 48) * TAU;
        const f = 1 + Math.sin(t * 2 + a[0]) * wob + Math.sin(t * 3 + a[1]) * wob * .6 + Math.sin(t * 5 + a[2]) * wob * .3;
        const x = Math.cos(t) * rx * f, y = Math.sin(t) * ry * f;
        s === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
      }
      p.closePath();
      return p;
    }
    function chashuSlice(g, rnd, rot) {
      g.rotate(rot);
      const shape = blob(g, .25, .17, rnd, .07);
      g.save(); g.translate(.012, .02); g.fillStyle = 'rgba(40,20,5,.35)'; g.filter = `blur(${S * dpr * .012}px)`; g.fill(shape); g.restore();
      const gr = g.createRadialGradient(-.04, -.03, .02, 0, 0, .26);
      gr.addColorStop(0, '#F2C3B6'); gr.addColorStop(.55, '#E2A291'); gr.addColorStop(1, '#C47E66');
      g.fillStyle = gr; g.fill(shape);
      g.save(); g.clip(shape);
      // a few soft seams of fat, not stripes
      g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const y = -.09 + i * .08 + (rnd() - .5) * .04;
        g.strokeStyle = `rgba(255,236,226,${.18 + rnd() * .16})`;
        g.lineWidth = .012 + rnd() * .018;
        g.beginPath();
        g.moveTo(-.24, y + (rnd() - .5) * .05);
        g.bezierCurveTo(-.08, y + (rnd() - .5) * .1, .06, y + (rnd() - .5) * .1, .24, y + (rnd() - .5) * .06);
        g.stroke();
      }
      // the seared edge
      g.strokeStyle = 'rgba(150,72,38,.75)'; g.lineWidth = .03; g.stroke(shape);
      g.strokeStyle = 'rgba(90,40,16,.45)'; g.lineWidth = .01; g.stroke(shape);
      g.restore();
      // sheen
      g.fillStyle = 'rgba(255,255,255,.18)';
      g.beginPath(); g.ellipse(-.07, -.06, .1, .035, -.3, 0, TAU); g.fill();
    }
    function drawToppings() {
      tops = {
        chashu: [
          topping(.5, -.04, .34, (g, r) => chashuSlice(g, r, 1.15), 11),
          topping(.3, -.36, .34, (g, r) => chashuSlice(g, r, .42), 12),
        ],
        menma: [topping(-.56, -.22, .26, (g, rnd) => {
          for (let i = 0; i < 4; i++) {
            g.save();
            g.translate((i - 1.5) * .055, (rnd() - .5) * .04);
            g.rotate(-1.05 + (rnd() - .5) * .18);
            const L = .2 + rnd() * .05, w = .045 + rnd() * .012;
            g.fillStyle = 'rgba(40,20,5,.3)'; g.fillRect(-L + .008, -w / 2 + .01, L * 2, w);
            const gr = g.createLinearGradient(0, -w / 2, 0, w / 2);
            gr.addColorStop(0, '#D7AE6E'); gr.addColorStop(1, '#9C6E33');
            g.fillStyle = gr;
            g.beginPath(); g.roundRect(-L, -w / 2, L * 2, w, w * .45); g.fill();
            g.strokeStyle = 'rgba(110,70,25,.5)'; g.lineWidth = .004;
            for (let f = 0; f < 3; f++) { const y = -w / 3 + f * w / 3; g.beginPath(); g.moveTo(-L * .9, y); g.lineTo(L * .9, y + (rnd() - .5) * .006); g.stroke(); }
            g.restore();
          }
        }, 21)],
        egg: [topping(.2, .54, .22, g => {
          g.rotate(-.35);
          g.fillStyle = 'rgba(40,20,5,.3)';
          g.beginPath(); g.ellipse(.012, .02, .17, .135, 0, 0, TAU); g.fill();
          let gr = g.createRadialGradient(0, 0, .06, 0, 0, .17);
          gr.addColorStop(0, '#F6EEDD'); gr.addColorStop(.75, '#EAD6B4'); gr.addColorStop(1, '#B9874E');
          g.fillStyle = gr;
          g.beginPath(); g.ellipse(0, 0, .17, .135, 0, 0, TAU); g.fill();
          gr = g.createRadialGradient(-.02, -.02, .005, 0, 0, .09);
          gr.addColorStop(0, '#F7BE55'); gr.addColorStop(.7, '#E58E21'); gr.addColorStop(1, '#C9701A');
          g.fillStyle = gr;
          g.beginPath(); g.arc(.01, 0, .088, 0, TAU); g.fill();
          g.fillStyle = 'rgba(255,255,255,.55)';
          g.beginPath(); g.ellipse(-.025, -.035, .03, .012, -.5, 0, TAU); g.fill();
        }, 31)],
        negi: [topping(-.12, -.16, .2, (g, rnd) => {
          for (let i = 0; i < 34; i++) {
            const a = rnd() * TAU, d = Math.sqrt(rnd()) * .15;
            const x = Math.cos(a) * d, y = Math.sin(a) * d * .8;
            const r = .016 + rnd() * .012;
            const white = rnd() < .25;
            g.fillStyle = 'rgba(30,40,10,.25)';
            g.beginPath(); g.arc(x + .004, y + .006, r, 0, TAU); g.fill();
            g.fillStyle = white ? '#EEF3DA' : `hsl(${82 + rnd() * 14}, ${42 + rnd() * 16}%, ${50 + rnd() * 12}%)`;
            g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
            g.fillStyle = white ? 'rgba(220,230,190,.9)' : 'rgba(225,240,190,.85)';
            g.beginPath(); g.arc(x, y, r * .55, 0, TAU); g.fill();
          }
        }, 41)],
      };
    }

    /* ---- oil droplets ---- */
    function seedDrops() {
      const rnd = rng(3);
      drops = [];
      for (let i = 0; i < 90; i++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * .88;
        drops.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: .007 + .048 * rnd() ** 3, vx: 0, vy: 0 });
      }
    }

    function step(k) {
      const n = drops.length;
      const pAge = performance.now() - ptr.seen;
      const stirring = pAge < 120;
      const pSpeed = Math.hypot(ptr.vx, ptr.vy);
      for (let i = 0; i < n; i++) {
        const d = drops[i];
        d.vx += (-d.y * .00003 + (Math.random() - .5) * .00012) * k;
        d.vy += (d.x * .00003 + (Math.random() - .5) * .00012) * k;
        if (stirring) {
          const dx = d.x - ptr.x, dy = d.y - ptr.y, dist = Math.hypot(dx, dy);
          if (dist < .3) {
            const f = (1 - dist / .3) ** 2;
            d.vx += ptr.vx * f * .16 * k + dx * f * .002 * k;
            d.vy += ptr.vy * f * .16 * k + dy * f * .002 * k;
          }
        }
        const damp = Math.pow(.955, k);
        d.vx *= damp; d.vy *= damp;
        d.x += d.vx * k; d.y += d.vy * k;
        const lim = .965 - d.r, dd = Math.hypot(d.x, d.y);
        if (dd > lim) {
          const nx = d.x / dd, ny = d.y / dd;
          d.x = nx * lim; d.y = ny * lim;
          const dot = d.vx * nx + d.vy * ny;
          if (dot > 0) { d.vx -= 1.6 * dot * nx; d.vy -= 1.6 * dot * ny; }
        }
      }
      // touching droplets merge; very close ones nudge apart
      for (let i = 0; i < drops.length; i++) {
        const a = drops[i];
        for (let j = i + 1; j < drops.length; j++) {
          const b = drops[j];
          const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), sum = a.r + b.r;
          if (dist >= sum) continue;
          const area = a.r * a.r + b.r * b.r;
          if (dist < sum * .72 && area < .062 * .062) {
            const wa = a.r * a.r / area, wb = 1 - wa;
            a.x = a.x * wa + b.x * wb; a.y = a.y * wa + b.y * wb;
            a.vx = a.vx * wa + b.vx * wb; a.vy = a.vy * wa + b.vy * wb;
            a.r = Math.sqrt(area);
            drops.splice(j, 1); j--;
          } else {
            const push = (sum - dist) * .08 * k / (dist || 1);
            a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
          }
        }
      }
      // a quick stroke of the spoon breaks large droplets apart
      if (stirring && pSpeed > .01) {
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          if (d.r < .022 || Math.hypot(d.x - ptr.x, d.y - ptr.y) > .14) continue;
          split(i, ptr.vx, ptr.vy);
        }
      }
      // keep the surface lively when nobody touches it
      idleSplit += k;
      if (idleSplit > 150 && drops.length < 70) {
        idleSplit = 0;
        let big = 0;
        drops.forEach((d, i) => { if (d.r > drops[big].r) big = i; });
        if (drops[big].r > .03) split(big, (Math.random() - .5) * .004, (Math.random() - .5) * .004);
      }
    }
    function split(i, vx, vy) {
      const d = drops[i];
      const parts = 2 + (Math.random() < .4 ? 1 : 0);
      const r = d.r / Math.sqrt(parts);
      drops.splice(i, 1);
      for (let p = 0; p < parts; p++) {
        const a = Math.random() * TAU;
        drops.push({ x: d.x + Math.cos(a) * r, y: d.y + Math.sin(a) * r, r, vx: vx * .6 + Math.cos(a) * .003, vy: vy * .6 + Math.sin(a) * .003 });
      }
    }

    /* ---- one frame ---- */
    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bowlCv, 0, 0, W, H);
      ctx.save();
      ctx.translate(cx, cy);

      // tare: a dark pool before the soup goes in
      if (val.tare > .002 && val.soup < .999) {
        const r = S * .34 * val.tare;
        const gr = ctx.createRadialGradient(-r * .3, -r * .3, r * .1, 0, 0, r);
        gr.addColorStop(0, '#5A2E12'); gr.addColorStop(1, '#2A1407');
        ctx.globalAlpha = 1 - val.soup;
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(0, S * .05, r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // soup
      const sr = S * (1 - (1 - val.soup) ** 3);
      if (val.soup > .002) {
        const gr = ctx.createRadialGradient(-S * .2, -S * .25, S * .05, 0, 0, sr);
        gr.addColorStop(0, '#E2AA4A'); gr.addColorStop(.55, '#C3862A'); gr.addColorStop(.9, '#93561A'); gr.addColorStop(1, '#6E3D10');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(0, 0, sr, 0, TAU); ctx.fill();
      }
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, Math.max(sr, 1), 0, TAU); ctx.clip();

      // noodles, just under the surface
      if (val.noodles > .002) {
        const sc = 1 + (1 - val.noodles) * .05;
        ctx.globalAlpha = val.noodles;
        ctx.drawImage(noodleCv, -S * sc, -S * sc, 2 * S * sc, 2 * S * sc);
        ctx.globalAlpha = .26 * val.noodles * val.soup;
        ctx.fillStyle = '#B97A22';
        ctx.fillRect(-S, -S, 2 * S, 2 * S);
        ctx.globalAlpha = 1;
      }

      // oil
      if (val.oil > .002) {
        ctx.globalAlpha = val.oil;
        for (const d of drops) {
          const r = d.r * S;
          ctx.drawImage(dropCv, d.x * S - r, d.y * S - r, r * 2, r * 2);
        }
        ctx.globalAlpha = 1;
      }

      // ripples from a tap
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        const t = (now - rp.t) / 1400;
        if (t >= 1) { ripples.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(255,236,190,${(1 - t) * .5})`;
        ctx.lineWidth = S * .008 * (1 - t) + 1;
        ctx.beginPath(); ctx.arc(rp.x * S, rp.y * S, S * (.03 + t * .4), 0, TAU); ctx.stroke();
      }

      // the edge of the soup
      ctx.restore();
      if (val.soup > .002) {
        ctx.strokeStyle = 'rgba(80,40,8,.55)'; ctx.lineWidth = S * .014;
        ctx.beginPath(); ctx.arc(0, 0, sr - S * .006, 0, TAU); ctx.stroke();
      }

      // toppings drop in
      const order = [['menma', val.menma], ['chashu', val.chashu], ['egg', val.egg], ['negi', val.negi]];
      for (const [key, v] of order) {
        if (v < .002) continue;
        for (const t of tops[key]) {
          const e = 1 - (1 - v) ** 3;
          const sc = 1 + (1 - e) * .25;
          const s = t.size * S * sc;
          ctx.globalAlpha = clamp(v * 1.6, 0, 1);
          ctx.drawImage(t.cv, t.x * S - s, t.y * S - s - (1 - e) * S * .08, s * 2, s * 2);
        }
      }
      ctx.globalAlpha = 1;

      // the lamp over the counter, reflected on the surface
      if (val.soup > .3) {
        ctx.save();
        ctx.globalAlpha = (val.soup - .3) / .7;
        ctx.translate(-S * .38 + ptr.lx * S * .03, -S * .46 + ptr.ly * S * .03);
        ctx.rotate(-.62);
        ctx.scale(1, .42);
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, S * .32);
        gr.addColorStop(0, 'rgba(255,248,225,.42)'); gr.addColorStop(.5, 'rgba(255,240,200,.12)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(0, 0, S * .32, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    ptr.lx = 0; ptr.ly = 0;
    function frame(now) {
      raf = 0;
      const k = clamp((now - last) / 16.667, 0, 3);
      last = now;
      let busy = false;
      for (const key of LAYERS) {
        const d = target[key] - val[key];
        if (Math.abs(d) > .001) { val[key] += d * (1 - Math.pow(.92, k)); busy = true; }
        else val[key] = target[key];
      }
      if (val.oil > .01 && !reduce) { step(k); busy = true; }
      if (ripples.length) busy = true;
      ptr.lx += (clamp(ptr.x, -1, 1) - ptr.lx) * .05 * k;
      ptr.ly += (clamp(ptr.y, -1, 1) - ptr.ly) * .05 * k;
      ptr.vx *= .8; ptr.vy *= .8;
      draw(now);
      if (busy && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else running = false;
    }
    function wake() {
      if (running || !visible) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      W = r.width; H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ({ cx, cy, R } = place(W, H));
      S = R * .8;
      drawBowl(); drawNoodles(); drawDrop(); drawToppings();
      draw(performance.now());
      wake();
    }

    /* ---- input: stir with a pointer, tap to make a ripple ---- */
    const toUnits = e => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left - cx) / S, (e.clientY - r.top - cy) / S];
    };
    canvas.addEventListener('pointermove', e => {
      const [x, y] = toUnits(e);
      const now = performance.now();
      if (now - ptr.seen < 100) {
        ptr.vx = ptr.vx * .5 + (x - ptr.x) * .5;
        ptr.vy = ptr.vy * .5 + (y - ptr.y) * .5;
      }
      ptr.x = x; ptr.y = y; ptr.seen = now;
      if (Math.hypot(x, y) < 1) { canvas.dispatchEvent(new CustomEvent('stir')); wake(); }
    });
    canvas.addEventListener('pointerdown', e => {
      const [x, y] = toUnits(e);
      if (Math.hypot(x, y) > 1 || val.soup < .5) return;
      ripples.push({ x, y, t: performance.now() });
      drops.forEach(d => {
        const dx = d.x - x, dy = d.y - y, dist = Math.hypot(dx, dy) || 1;
        if (dist < .35) { const f = (1 - dist / .35) * .012; d.vx += dx / dist * f; d.vy += dy / dist * f; }
      });
      canvas.dispatchEvent(new CustomEvent('stir'));
      wake();
    });

    new ResizeObserver(() => resize()).observe(canvas);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
    seedDrops();

    return {
      set(next, instant) {
        Object.assign(target, next);
        if (instant || reduce) Object.assign(val, target);
        if (W) { draw(performance.now()); wake(); }
      },
    };
  }

  /* ---------- top: a real bowl of shoyu, with a surface you can touch ----------
     The photo is cropped to the soup alone and drawn with WebGL, so a fingertip
     sends ripples across it and a little steam drifts up. Without WebGL (or with
     reduced motion) the same crop is shown as a plain image. */
  const heroWrap = $('hero-bowl');
  if (heroWrap) {
    const hero = document.querySelector('.hero');
    const img = $('soup-img'), glCv = $('soup-gl'), ringCv = $('ring');
    // Where the soup sits in the photo (measured on the 1200 × 770 version): centre and radius.
    const PH = { w: 1200, h: 770, cx: 513, cy: 383, r: 236 };
    let L = { cx: 0, cy: 0, r: 0 }, W = 0, H = 0;

    const place = () => {
      W = heroWrap.clientWidth; H = heroWrap.clientHeight;
      if (W >= 900 && W / H > 1.15) L = { r: Math.min(H * .38, W * .27), cx: W * .7, cy: H * .54 };
      else { const r = Math.min(W * .4, H * .25); L = { r, cx: W / 2, cy: 76 + r * 1.16 }; }
      // the plain image, scaled so its soup lands in the circle
      const s = L.r / PH.r;
      Object.assign(img.style, {
        width: `${PH.w * s}px`, left: `${L.cx - PH.cx * s}px`, top: `${L.cy - PH.cy * s}px`,
        clipPath: `circle(${L.r}px at ${PH.cx * s}px ${PH.cy * s}px)`,
      });
      drawRing();
    };

    // The meander ring around the window, like the rim of a ramen bowl.
    const drawRing = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ringCv.width = W * dpr; ringCv.height = H * dpr;
      const g = ringCv.getContext('2d');
      g.scale(dpr, dpr); g.translate(L.cx, L.cy);
      const rIn = L.r * 1.075, rOut = L.r * 1.145;
      // the window sits a little proud of the page
      g.save();
      g.shadowColor = 'rgba(43,26,16,.38)'; g.shadowBlur = L.r * .14; g.shadowOffsetY = L.r * .05;
      g.fillStyle = '#2B1A10';
      g.beginPath(); g.arc(0, 0, L.r * .995, 0, TAU); g.fill();
      g.restore();
      meanderRing(g, rOut, rIn, Math.max(1, L.r * .005), '#A9361F');
      g.lineWidth = Math.max(1, L.r * .0035);
      [L.r * 1.03, L.r * 1.17].forEach(r => { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); });
    };

    const gl = !reduce && glCv.getContext('webgl', { premultipliedAlpha: true, antialias: false });
    const ripples = [];   // [x, y, startTime, strength] in the soup's own units (radius = 1)
    let ready = false, t0 = 0, raf = 0, visible = true, U = {}, dpr = 1;

    if (gl) {
      const vs = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;
      const fs = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;       // canvas size, device px
uniform vec3 uCircle;    // centre and radius of the window, device px (y down)
uniform vec2 uC, uR;     // soup centre and radius in texture coordinates
uniform float uTime, uOpen;
uniform vec4 uRip[10];
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1)), f.x), f.y);
}
vec3 hsv(vec3 c){
  vec4 K = vec4(0., -1. / 3., 2. / 3., -1.);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6. * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= .5; } return v; }
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float rad = uCircle.z * (.82 + .18 * uOpen);
  vec2 p = (px - uCircle.xy) / uCircle.z;
  float d = length(px - uCircle.xy) / rad;
  if (d > 1.02) { gl_FragColor = vec4(0.); return; }

  // ripples: rings travelling outward, fading with time and distance
  vec2 off = vec2(0.); float slope = 0.;
  for (int i = 0; i < 10; i++) {
    vec4 r = uRip[i];
    if (r.w <= 0.) continue;
    float age = uTime - r.z;
    if (age < 0. || age > 3.) continue;
    vec2 q = p - r.xy; float dist = length(q) + 1e-4;
    float x = dist - age * .42;
    float env = exp(-x * x * 90.) * exp(-age * 1.5) * r.w;
    float w = sin(x * 56.);
    off += q / dist * w * env * .015;
    slope += cos(x * 56.) * env * dot(q / dist, normalize(vec2(-.55, -.85)));
  }
  // the surface is never quite still
  off += .0018 * vec2(sin(p.y * 7. + uTime * .9), cos(p.x * 6. - uTime * .7));

  float zoom = 1. + .14 * (1. - uOpen);
  // Only the broth moves: golden, saturated pixels. Chashu, egg and negi stay put.
  vec3 base = hsv(texture2D(uTex, uC + p * uR / zoom).rgb);
  float liquid = smoothstep(.05, .085, base.x) * smoothstep(.17, .13, base.x) * smoothstep(.38, .6, base.y);
  off *= liquid; slope *= liquid;
  vec3 col = texture2D(uTex, uC + (p + off) * uR / zoom).rgb;
  col += vec3(1., .95, .84) * max(slope, 0.) * .34;      // light from the lamp catches the crests
  col *= 1. - max(-slope, 0.) * .1;

  // steam
  vec2 sp = p * 1.6 + vec2(0., uTime * .09);
  float st = fbm(sp + fbm(sp * .7 + uTime * .03) * 1.4);
  col = mix(col, vec3(1.), smoothstep(.56, .9, st) * .16 * uOpen);

  // depth at the edge of the window
  col *= 1. - smoothstep(.72, 1., d) * .28;
  float a = 1. - smoothstep(1. - 2. / rad, 1., d);
  gl_FragColor = vec4(col * a, a);
}`;
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'a');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        ['uTex', 'uRes', 'uCircle', 'uC', 'uR', 'uTime', 'uOpen', 'uRip'].forEach(n => (U[n] = gl.getUniformLocation(prog, n)));
        const tex = gl.createTexture();
        const upload = () => {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.uniform1i(U.uTex, 0);
          gl.uniform2f(U.uC, PH.cx / PH.w, PH.cy / PH.h);
          gl.uniform2f(U.uR, PH.r / PH.w, PH.r / PH.h);
          ready = true; t0 = performance.now();
          heroWrap.classList.add('gl-on');
          // a ladle of soup lands in the middle as the window opens
          setTimeout(() => addRipple(0, .05, 1.1), 700);
          loop();
        };
        const tryUpload = () => { try { upload(); } catch (e) { /* tainted image: keep the plain photo */ } };
        if (img.complete && img.naturalWidth) tryUpload(); else img.addEventListener('load', tryUpload, { once: true });
      }
    }

    const sizeGL = () => {
      if (!gl) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      glCv.width = Math.round(W * dpr); glCv.height = Math.round(H * dpr);
      gl.viewport(0, 0, glCv.width, glCv.height);
    };
    const now = () => (performance.now() - t0) / 1000;
    const addRipple = (x, y, s) => {
      if (ripples.length >= 10) ripples.shift();
      ripples.push([x, y, now(), s]);
    };
    function loop() {
      raf = 0;
      if (!ready || !visible || document.hidden) return;
      const t = now();
      gl.uniform2f(U.uRes, glCv.width, glCv.height);
      gl.uniform3f(U.uCircle, L.cx * dpr, L.cy * dpr, L.r * dpr);
      gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uOpen, 1 - (1 - clamp(t / 1.6, 0, 1)) ** 3);
      const arr = new Float32Array(40);
      ripples.forEach((r, i) => arr.set(r, i * 4));
      gl.uniform4fv(U.uRip, arr);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    }

    // touch the surface: dragging leaves a trail of small ripples, a tap drops a big one
    let lastRip = { x: 9, y: 9, t: 0 };
    const units = e => {
      const r = heroWrap.getBoundingClientRect();
      return [(e.clientX - r.left - L.cx) / L.r, (e.clientY - r.top - L.cy) / L.r];
    };
    const hint = $('bowl-hint');
    const touched = () => { if (!hint.classList.contains('is-gone')) setTimeout(() => hint.classList.add('is-gone'), 1600); };
    heroWrap.addEventListener('pointermove', e => {
      if (!ready) return;
      const [x, y] = units(e);
      if (Math.hypot(x, y) > 1) return;
      const t = performance.now(), moved = Math.hypot(x - lastRip.x, y - lastRip.y);
      if (moved > .07 || (moved > .015 && t - lastRip.t > 90)) {
        addRipple(x, y, clamp(moved * 6, .25, .7));
        lastRip = { x, y, t };
        touched();
      }
    });
    heroWrap.addEventListener('pointerdown', e => {
      if (!ready) return;
      const [x, y] = units(e);
      if (Math.hypot(x, y) > 1) return;
      addRipple(x, y, 1.2);
      touched();
    });

    new ResizeObserver(() => { place(); sizeGL(); }).observe(heroWrap);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && ready && !raf) loop(); }).observe(heroWrap);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && ready && !raf) loop(); });
    place(); sizeGL();
    requestAnimationFrame(() => hero.classList.add('is-on'));
  }

  /* ---------- 一杯ができるまで: the bowl is built as the steps scroll by ---------- */
  const buildCv = document.querySelector('.build .bowl');
  if (buildCv) {
    const bowl = Bowl(buildCv, {
      dark: true,
      place(W, H) {
        const R = Math.min(W, H) * (W < 600 ? .44 : .43);
        return { R, cx: W / 2, cy: H / 2 };
      },
    });
    const steps = [...document.querySelectorAll('.step')];
    const ticks = [...$('build-ticks').children];
    const GROUPS = { tare: ['tare'], soup: ['soup'], oil: ['oil'], noodles: ['noodles'], chashu: ['chashu'], finish: ['menma', 'negi', 'egg'] };
    let now = -2;
    const show = i => {
      if (i === now) return;
      now = i;
      const next = Object.fromEntries(LAYERS.map(k => [k, 0]));
      steps.forEach((s, j) => {
        s.classList.toggle('is-now', j === i);
        ticks[j].classList.toggle('on', j <= i);
        if (j <= i) GROUPS[s.dataset.layer].forEach(k => (next[k] = 1));
      });
      bowl.set(next);
    };
    const pick = () => {
      const mid = window.innerHeight * (window.innerWidth < 900 ? .72 : .5);
      let i = -1;
      steps.forEach((s, j) => { if (s.getBoundingClientRect().top < mid) i = j; });
      show(i);
    };
    let tick = false;
    window.addEventListener('scroll', () => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(() => { pick(); tick = false; });
    }, { passive: true });
    pick();
  }

  /* ---------- お品書き: the ticket machine ---------- */
  const kmButtons = $('km-buttons');
  if (kmButtons && window.MENU) {
    const MENU = window.MENU;
    const CAT = { soba: 'そば', top: 'のせもの', rice: 'ご飯', drink: '飲みもの' };
    const count = {};
    const tickets = $('tickets');
    const yen = n => n.toLocaleString('ja-JP');
    const btnOf = {};
    let lastCat = '';
    MENU.forEach(m => {
      if (m.c !== lastCat) {
        lastCat = m.c;
        kmButtons.append(Object.assign(document.createElement('p'), { className: 'km-cat', textContent: CAT[m.c] }));
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'km-btn' + (m.sig ? ' sig' : '');
      b.dataset.c = m.c;
      b.innerHTML = `<span class="nm"></span><span class="pr">${yen(m.price)}<small>円</small></span><span class="lamp"></span><span class="qty">0</span>`;
      b.querySelector('.nm').textContent = m.name;
      b.setAttribute('aria-label', `${m.name}　${yen(m.price)}円。押すと食券が一枚出ます`);
      b.addEventListener('click', () => add(m));
      kmButtons.append(b);
      btnOf[m.id] = b;
    });
    const sync = () => {
      let sum = 0, n = 0;
      MENU.forEach(m => {
        const c = count[m.id] || 0;
        sum += c * m.price; n += c;
        const b = btnOf[m.id];
        b.classList.toggle('is-on', c > 0);
        b.querySelector('.qty').textContent = c;
      });
      $('km-sum').textContent = yen(sum);
      $('tray-count').textContent = `${n}枚`;
      $('tray-empty').hidden = n > 0;
      $('km-clear').disabled = n === 0;
    };
    const add = m => {
      if ((count[m.id] || 0) >= 9) return;
      count[m.id] = (count[m.id] || 0) + 1;
      const b = btnOf[m.id];
      b.classList.add('is-press');
      setTimeout(() => b.classList.remove('is-press'), 140);
      const li = document.createElement('li');
      li.className = 'ticket';
      const t = document.createElement('button');
      t.type = 'button';
      t.style.setProperty('--tilt', `${((Math.random() - .5) * 2.4).toFixed(2)}deg`);
      t.innerHTML = `<span class="stamp">琥珀</span><span class="nm"></span><span class="pr">${yen(m.price)}円</span><span class="x">取り消す</span>`;
      t.querySelector('.nm').textContent = m.name;
      t.setAttribute('aria-label', `${m.name}の食券。押すと取り消します`);
      t.addEventListener('click', () => remove(li, m));
      li.append(t);
      tickets.prepend(li);
      sync();
    };
    const remove = (li, m) => {
      count[m.id]--;
      sync();
      const gone = () => li.remove();
      if (reduce) gone();
      else { li.classList.add('is-out'); setTimeout(gone, 380); }
      btnOf[m.id].focus();
    };
    $('km-clear').addEventListener('click', () => {
      Object.keys(count).forEach(k => (count[k] = 0));
      tickets.replaceChildren();
      sync();
    });
    sync();
  }

  /* ---------- 店舗とご予約 ---------- */
  const form = $('reserve-form');
  if (form) {
    const done = $('reserve-done');
    const WD = ['日', '月', '火', '水', '木', '金', '土'];
    const LUNCH = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30'];
    const DINNER = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
    const ONLINE = 4;   // half of the eight seats can be booked online
    const pad = n => String(n).padStart(2, '0');
    const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const label = d => `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`;
    // Demo availability: a stable number per date and time. Replace with the real booking API.
    const seatsLeft = (day, time) => {
      let h = 0;
      for (const ch of day + time) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return h % 7 < 2 ? 0 : h % (ONLINE + 1);
    };

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i + 1); return d; });
    let day = null, time = null;
    const party = () => Number(form.party.value);

    const dates = $('dates');
    days.forEach(d => {
      const closed = d.getDay() === 2;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'date' + (d.getDay() === 6 ? ' sat' : d.getDay() === 0 ? ' sun' : '');
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.disabled = closed;
      b.dataset.day = iso(d);
      b.innerHTML = `<span class="w">${closed ? '定休' : WD[d.getDay()]}</span><span class="d">${d.getDate()}</span><span class="m">${d.getMonth() + 1}月</span>`;
      b.setAttribute('aria-label', closed ? `${label(d)}　定休日` : label(d));
      b.addEventListener('click', () => pickDay(d, b));
      dates.append(b);
    });

    const slots = $('slots');
    const renderSlots = () => {
      slots.replaceChildren();
      if (!day) { slots.append(Object.assign(document.createElement('p'), { className: 'part', textContent: '先に日にちを選んでください。' })); return; }
      [['昼の部', LUNCH], ['夜の部', DINNER]].forEach(([name, list]) => {
        slots.append(Object.assign(document.createElement('p'), { className: 'part', textContent: name }));
        list.forEach(t => {
          const left = seatsLeft(iso(day), t);
          const ok = left >= party();
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'slot' + (ok && left <= 2 ? ' few' : '');
          b.disabled = !ok;
          b.setAttribute('aria-pressed', String(t === time && ok));
          b.innerHTML = `<b>${t}</b><span>${left === 0 ? '満席' : ok ? `残り${left}席` : `${left}席のみ`}</span>`;
          b.addEventListener('click', () => { time = t; $('slot-err').textContent = ''; renderSlots(); summary(); slots.querySelector('[aria-pressed="true"]').focus(); });
          slots.append(b);
        });
      });
      if (time && seatsLeft(iso(day), time) < party()) { time = null; summary(); }
    };
    const pickDay = (d, b) => {
      day = d; time = null;
      dates.querySelectorAll('.date').forEach(x => x.setAttribute('aria-checked', String(x === b)));
      $('slot-day').textContent = label(d);
      $('slot-err').textContent = '';
      renderSlots(); summary();
    };
    const summary = () => {
      $('r-summary').textContent = !day ? '日にちと時間を選んでください。'
        : !time ? `${label(day)}　時間を選んでください。`
        : `${label(day)} ${time}〜　${party()}名`;
    };
    form.party.addEventListener('change', () => { renderSlots(); summary(); });
    [form.elements.name, form.email].forEach(el => el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') setErr(el, ''); }));
    renderSlots();

    const setErr = (el, text) => {
      $(`${el.id}-err`).textContent = text || '';
      el.setAttribute('aria-invalid', text ? 'true' : 'false');
      return !text;
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      let bad = null;
      if (!day || !time) {
        $('slot-err').textContent = !day ? '日にちと時間を選んでください。' : '時間を選んでください。';
        bad = !day ? dates.querySelector('.date:not(:disabled)') : slots.querySelector('.slot:not(:disabled)');
      }
      const name = form.elements.name.value.trim(), email = form.email.value.trim();
      if (!setErr(form.elements.name, name ? '' : 'お名前を入力してください。')) bad = bad || form.elements.name;
      if (!setErr(form.email, !email ? 'メールアドレスを入力してください。' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'メールアドレスの形式をご確認ください。')) bad = bad || form.email;
      if (bad) { bad.focus(); return; }
      // Set data-endpoint on the form to send this to a real booking system.
      const rows = [['日時', `${label(day)} ${time}〜`], ['人数', `${party()}名`], ['お名前', name], ['メール', email]];
      done.querySelector('dl').replaceChildren(...rows.flatMap(([k, v]) => [
        Object.assign(document.createElement('dt'), { textContent: k }),
        Object.assign(document.createElement('dd'), { textContent: v }),
      ]));
      form.hidden = true; done.hidden = false;
      done.querySelector('h3').focus();
    });
    done.querySelector('[data-reset]').addEventListener('click', () => {
      form.reset(); day = null; time = null;
      dates.querySelectorAll('.date').forEach(x => x.setAttribute('aria-checked', 'false'));
      $('slot-day').textContent = '';
      form.querySelectorAll('.err').forEach(el => (el.textContent = ''));
      form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
      renderSlots(); summary();
      done.hidden = true; form.hidden = false;
      dates.querySelector('.date:not(:disabled)').focus();
    });
  }
})();
