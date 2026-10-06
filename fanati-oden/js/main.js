(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = id => document.getElementById(id);
  const yen = n => n.toLocaleString('ja-JP');
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

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

  // Open 17:00 to 29:00 (5 a.m.), every day. Shown in Osaka time wherever the visitor is.
  const openNow = $('open-now');
  const syncOpen = () => {
    const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
    const open = h >= 17 || h < 5;
    openNow.classList.toggle('is-open', open);
    openNow.textContent = open ? '営業中　朝5時まで' : '本日17時から';
  };
  syncOpen();
  setInterval(syncOpen, 60000);

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in');
    io.unobserve(en.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-in], [data-wipe]').forEach(el => io.observe(el));

  /* ---------- top: the neon sign lights up, and now and then a letter hums ---------- */
  const sign = document.querySelector('.neon-sign');
  if (sign) {
    const main = sign.querySelector('.ns-main');
    const chars = [...main.textContent].map(ch => Object.assign(document.createElement('span'), { className: 'c', textContent: ch }));
    main.replaceChildren(...chars);
    if (!reduce) {
      fontsReady.then(() => requestAnimationFrame(() => sign.classList.add('is-lit')));
      const hum = () => {
        const c = chars[Math.floor(Math.random() * chars.length)];
        c.classList.remove('hum'); void c.offsetWidth; c.classList.add('hum');
        setTimeout(() => c.classList.remove('hum'), 600);
        setTimeout(hum, 4000 + Math.random() * 6000);
      };
      setTimeout(hum, 4500);
    }
  }

  /* ---------- top: the subtitles wipe like a karaoke screen ---------- */
  const kara = $('karaoke');
  if (kara) {
    const lines = [...kara.querySelectorAll('.k-text')];
    const dots = [...kara.querySelectorAll('.k-dots i')];
    const setP = (el, p) => el.style.setProperty('--p', `${(p * 100).toFixed(2)}%`);
    if (reduce) lines.forEach(l => setP(l, 1));
    else {
      // Each line is sung a syllable at a time: the wipe moves in small steps, not a smooth slide.
      const sing = (el, ms) => new Promise(done => {
        const n = el.dataset.text.length, t0 = performance.now();
        const step = now => {
          const t = clamp((now - t0) / ms, 0, 1);
          const k = t * n, i = Math.floor(k), f = k - i;
          setP(el, Math.min(1, (i + Math.min(1, f * 1.8)) / n));
          t < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      });
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const loop = async () => {
        await fontsReady;
        await wait(1400);
        for (;;) {
          lines.forEach(l => setP(l, 0));
          dots.forEach(d => d.classList.remove('off'));
          for (const d of dots) { await wait(520); d.classList.add('off'); }
          await sing(lines[0], 2400);
          await wait(260);
          await sing(lines[1], 2300);
          await wait(2600);
        }
      };
      loop();
    }
  }

  /* ---------- top: the intro is "sung" line by line as it scrolls through ---------- */
  const singEl = document.querySelector('[data-sing]');
  if (singEl) {
    const parts = singEl.innerHTML.split(/<br\s*\/?>/i).map(s => s.trim());
    singEl.setAttribute('aria-label', singEl.textContent);
    singEl.replaceChildren(...parts.flatMap((txt, i) => {
      const s = Object.assign(document.createElement('span'), { className: 'ln', textContent: txt });
      s.setAttribute('aria-hidden', 'true');
      return i ? [document.createElement('br'), s] : [s];
    }));
    const lns = [...singEl.querySelectorAll('.ln')];
    const weights = lns.map(l => l.textContent.length);
    const sum = weights.reduce((a, b) => a + b, 0);
    const update = () => {
      const r = singEl.getBoundingClientRect(), vh = window.innerHeight;
      const p = reduce ? 1 : clamp((vh * .82 - r.top) / (r.height + vh * .3), 0, 1);
      let acc = 0;
      lns.forEach((l, i) => {
        const a = acc / sum, b = (acc + weights[i]) / sum;
        l.style.setProperty('--p', `${(clamp((p - a) / (b - a), 0, 1) * 100).toFixed(1)}%`);
        acc += weights[i];
      });
    };
    let ticking = false;
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- top: the shop's own film plays while it is on screen ---------- */
  const reel = $('reel');
  if (reel) {
    const playBtn = $('reel-play'), soundBtn = $('reel-sound');
    let wanted = !reduce;   // the visitor's choice; reduced motion starts paused
    const sync = () => {
      const paused = reel.paused;
      playBtn.textContent = paused ? '再生する' : '一時停止';
      playBtn.setAttribute('aria-pressed', String(!paused));
      soundBtn.textContent = reel.muted ? '音を出す' : '音を消す';
      soundBtn.setAttribute('aria-pressed', String(!reel.muted));
    };
    const tryPlay = () => reel.play().catch(() => {}).finally(sync);
    playBtn.addEventListener('click', () => { wanted = reel.paused; wanted ? tryPlay() : (reel.pause(), sync()); });
    soundBtn.addEventListener('click', () => { reel.muted = !reel.muted; if (!reel.muted) { wanted = true; tryPlay(); } sync(); });
    new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { if (wanted) tryPlay(); }
      else { reel.pause(); sync(); }
    }), { threshold: .35 }).observe(reel);
    reel.addEventListener('play', sync); reel.addEventListener('pause', sync);
    sync();
  }

  /* ---------- menu: take oden from the pot into your bowl ---------- */
  const cellsEl = $('cells');
  if (cellsEl && window.ODEN) {
    const { items, price, mori } = window.ODEN;
    const count = {};
    const btnOf = {};
    const cells = items.map(name => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cell';
      b.innerHTML = '<span class="nm"></span><span class="pr"></span><span class="qty">0</span>';
      b.querySelector('.nm').textContent = name;
      b.querySelector('.pr').textContent = `${price}円`;
      b.setAttribute('aria-label', `${name}　${price}円。押すとお椀に入ります`);
      b.addEventListener('click', () => add(name));
      btnOf[name] = b;
      return b;
    });
    // fill out the last row with compartments of plain dashi
    const cols = () => (matchMedia('(max-width: 560px)').matches ? 3 : 4);
    const dashi = () => Array.from({ length: (cols() - (items.length % cols())) % cols() }, () => {
      const d = document.createElement('div');
      d.className = 'cell dashi'; d.setAttribute('aria-hidden', 'true');
      d.innerHTML = '<span class="nm">だし</span><span class="pr"></span>';
      return d;
    });
    const layout = () => cellsEl.replaceChildren(...cells, ...dashi());
    layout();
    matchMedia('(max-width: 560px)').addEventListener('change', layout);

    const picked = $('picked'), tip = $('bowl-tip');
    const sync = () => {
      const n = Object.values(count).reduce((a, b) => a + b, 0);
      items.forEach(name => {
        const c = count[name] || 0;
        btnOf[name].classList.toggle('on', c > 0);
        btnOf[name].querySelector('.qty').textContent = c;
      });
      $('b-count').textContent = `${n}品`;
      $('b-total').textContent = yen(n * price);
      $('bowl-empty').hidden = n > 0;
      $('b-clear').disabled = n === 0;
      tip.classList.toggle('deal', n >= mori.n);
      if (n === 0) tip.textContent = `${mori.n}品えらぶと、五種盛り合わせ（${yen(mori.price)}円）と同じ数に。`;
      else if (n < mori.n) tip.textContent = `あと${mori.n - n}品で、五種盛り合わせ（${yen(mori.price)}円）と同じ数に。`;
      else {
        tip.replaceChildren(document.createTextNode('五品なら、五種盛り合わせ（'), Object.assign(document.createElement('b'), { textContent: `${yen(mori.price)}円` }),
          document.createTextNode(`）にすると${yen(mori.n * price - mori.price)}円お得です。中身はお店でご相談ください。`));
      }
    };
    const add = name => {
      if ((count[name] || 0) >= 9) return;
      count[name] = (count[name] || 0) + 1;
      const b = btnOf[name];
      b.classList.add('dip'); setTimeout(() => b.classList.remove('dip'), 160);
      const li = document.createElement('li');
      const chip = document.createElement('button');
      chip.type = 'button'; chip.textContent = name;
      chip.setAttribute('aria-label', `${name}をお椀から戻す`);
      chip.addEventListener('click', () => { count[name]--; li.remove(); sync(); btnOf[name].focus(); });
      li.append(chip); picked.append(li);
      sync();
      if (!reduce) puff(b);
    };
    $('b-clear').addEventListener('click', () => { Object.keys(count).forEach(k => (count[k] = 0)); picked.replaceChildren(); sync(); });
    sync();

    /* steam rising off the pot */
    const cv = $('steam'), pot = $('pot');
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, raf = 0, visible = false;
    const puffs = [];
    const size = () => {
      const r = cv.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
    };
    const spawn = (x, y, big) => puffs.push({ x, y, r: (big ? 26 : 14) + Math.random() * 18, vx: (Math.random() - .5) * .25, vy: -(.35 + Math.random() * .45), a: 0, life: 0, max: 160 + Math.random() * 120, big });
    function puff(cell) {
      const pr = cv.getBoundingClientRect(), cr = cell.getBoundingClientRect();
      for (let i = 0; i < 5; i++) spawn(cr.left - pr.left + cr.width * (.3 + Math.random() * .4), cr.top - pr.top + cr.height * .5, true);
      wake();
    }
    const frame = () => {
      raf = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (Math.random() < .35) {
        const c = cellsEl.children[Math.floor(Math.random() * cellsEl.children.length)];
        if (c) {
          const pr = cv.getBoundingClientRect(), cr = c.getBoundingClientRect();
          spawn(cr.left - pr.left + Math.random() * cr.width, cr.top - pr.top + cr.height * (.3 + Math.random() * .5), false);
        }
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life++; p.x += p.vx + Math.sin((p.life + p.r) * .03) * .25; p.y += p.vy; p.r += .22;
        const t = p.life / p.max;
        const a = (t < .2 ? t / .2 : 1 - (t - .2) / .8) * (p.big ? .2 : .1);
        if (t >= 1) { puffs.splice(i, 1); continue; }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (!raf && visible && !reduce) raf = requestAnimationFrame(frame); };
    if (!reduce) {
      new ResizeObserver(size).observe(cv);
      new IntersectionObserver(es => { visible = es[0].isIntersecting; wake(); }).observe(pot);
      document.addEventListener('visibilitychange', wake);
      size();
    }
  }
})();
