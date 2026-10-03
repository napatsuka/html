(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = id => document.getElementById(id);
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  // Scroll-linked handlers registered by each feature below; run together once per frame.
  const onScrollFns = [];
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScrollFns.forEach(fn => fn()); ticking = false; });
  };

  /* ---------- menu ---------- */
  const head = $('head');
  const menuBtn = head.querySelector('.menu-btn');
  const setOpen = open => {
    head.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'CLOSE' : 'MENU';
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setOpen(!head.classList.contains('is-open')));
  head.querySelectorAll('.gnav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in');
    io.unobserve(en.target);
  }), { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('[data-in], [data-wipe]').forEach(el => io.observe(el));

  /* ---------- top: the noren lifts, then sways ---------- */
  function initHero(hero) {
    const panels = [...hero.querySelectorAll('.noren-panel')];
    const sway = panels.map(() => ({ a: 0, v: 0 }));
    let swaying = false;
    const swayLoop = () => {
      let busy = false;
      sway.forEach((s, i) => {
        s.v += -0.035 * s.a - 0.06 * s.v;   // spring back, with damping
        s.a = clamp(s.a + s.v, -9, 9);
        if (Math.abs(s.a) > .01 || Math.abs(s.v) > .01) busy = true;
        panels[i].style.setProperty('--sway', `${s.a.toFixed(3)}deg`);
      });
      swaying = busy;
      if (busy) requestAnimationFrame(swayLoop);
    };
    const kick = (i, f) => { sway[i].v += f; if (!swaying) { swaying = true; requestAnimationFrame(swayLoop); } };

    fontsReady.then(() => requestAnimationFrame(() => {
      hero.classList.add('is-open');
      if (!reduce) setTimeout(() => panels.forEach((_, i) => kick(i, (i - 1) * .9 + (i === 1 ? .5 : 0))), 800);
    }));

    if (!reduce) {
      hero.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        panels.forEach((p, i) => {
          const r = p.getBoundingClientRect();
          if (e.clientY > r.bottom + 40) return;   // only when the cursor brushes the cloth
          const d = Math.abs(e.clientX - (r.left + r.width / 2));
          kick(i, clamp(e.movementX, -40, 40) * .012 * Math.exp(-d / (r.width * .7)));
        });
      });
      onScrollFns.push(() => hero.style.setProperty('--sp', clamp(window.scrollY / hero.offsetHeight, 0, 1).toFixed(3)));
    }
  }

  /* ---------- top: chapter list shows its photo beside the cursor ---------- */
  function initChapters(list, float) {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let x = 0, y = 0, fx = 0, fy = 0, raf = 0;
    const follow = () => {
      fx += (x - fx) * .18; fy += (y - fy) * .18;
      float.style.setProperty('--hx', `${fx.toFixed(1)}px`);
      float.style.setProperty('--hy', `${fy.toFixed(1)}px`);
      raf = Math.abs(x - fx) + Math.abs(y - fy) > .5 ? requestAnimationFrame(follow) : 0;
    };
    const place = e => {
      x = e.clientX + 32; y = e.clientY - float.offsetHeight / 2;
      if (x + float.offsetWidth > window.innerWidth - 16) x = e.clientX - float.offsetWidth - 32;
      if (!raf) raf = requestAnimationFrame(follow);
    };
    list.querySelectorAll('a').forEach(a => {
      a.addEventListener('pointerenter', e => {
        const src = a.querySelector('.thumb img');
        const img = new Image();
        img.src = src.currentSrc || src.src; img.alt = '';
        float.replaceChildren(img);
        if (!float.classList.contains('is-on')) { place(e); fx = x; fy = y; follow(); }
        float.classList.add('is-on');
      });
      a.addEventListener('pointermove', place);
      a.addEventListener('pointerleave', () => float.classList.remove('is-on'));
    });
  }

  /* ---------- omakase: one piece per stretch of scroll ---------- */
  function initOmakase(serve) {
    const PIECES = window.OMAKASE || [];
    const neta = $('neta'), ticks = $('ticks'), detail = $('detail'), plate = $('plate'), rim = $('rim');

    // Plate rim: a ring of small waves.
    const R = 217, N = 40;
    let d = '';
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const cx = Math.cos(t) * R, cy = Math.sin(t) * R, tx = -Math.sin(t), ty = Math.cos(t);
      [12, 7].forEach(r => {
        d += `M${(cx - tx * r).toFixed(1)} ${(cy - ty * r).toFixed(1)}A${r} ${r} 0 0 0 ${(cx + tx * r).toFixed(1)} ${(cy + ty * r).toFixed(1)}`;
      });
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    rim.append(path);

    let cur = 0, swapTimer;
    serve.style.setProperty('--n', PIECES.length);
    PIECES.forEach(() => ticks.append(document.createElement('i')));
    const tickEls = [...ticks.children];
    const sizeClass = k => (k.length >= 3 ? 'l3' : k.length === 2 ? 'l2' : '');

    const show = (i, first) => {
      const p = PIECES[i];
      $('nth').textContent = p.n;
      tickEls.forEach((t, k) => { t.classList.toggle('on', k < i); t.classList.toggle('now', k === i); });
      plate.style.setProperty('--rot', `${i * -24}deg`);

      // The old character lifts away while the new one is set down on the plate.
      const next = document.createElement('span');
      next.textContent = p.k;
      next.className = sizeClass(p.k);
      if (first || reduce) neta.replaceChildren(next);
      else {
        [...neta.children].forEach(old => { old.classList.add('out'); setTimeout(() => old.remove(), 900); });
        next.classList.add('in-start');
        neta.append(next);
        void next.offsetWidth;
        next.classList.remove('in-start');
      }

      const write = () => {
        $('d-yomi').textContent = p.y;
        $('d-origin').textContent = p.o; $('d-waza').textContent = p.w; $('d-note').textContent = p.note;
      };
      clearTimeout(swapTimer);
      if (first || reduce) { write(); return; }
      detail.classList.add('swap');
      swapTimer = setTimeout(() => { write(); detail.classList.remove('swap'); }, 320);
    };
    show(0, true);

    onScrollFns.push(() => {
      const r = serve.getBoundingClientRect();
      const p = clamp(-r.top / ((r.height - window.innerHeight) || 1), 0, .9999);
      const i = Math.floor(p * PIECES.length);
      if (i !== cur) { cur = i; show(i); }
    });
  }

  /* ---------- shari photo drifts slower than the page ---------- */
  function initShari(ph) {
    if (reduce) return;
    onScrollFns.push(() => {
      const r = ph.getBoundingClientRect();
      ph.style.setProperty('--py', `${((r.top + r.height / 2 - window.innerHeight / 2) * -.12).toFixed(1)}px`);
    });
  }

  /* ---------- reservation ---------- */
  function initReserve(form, done) {
    const pad = n => String(n).padStart(2, '0');
    const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const minD = new Date(today); minD.setDate(minD.getDate() + 1);
    const maxD = new Date(today); maxD.setMonth(maxD.getMonth() + 2);
    form.date.min = iso(minD); form.date.max = iso(maxD);
    const part = () => form.querySelector('input[name="part"]:checked');
    const syncTimes = () => {
      form.time.replaceChildren(...part().dataset.times.split(',').map(t => Object.assign(document.createElement('option'), { value: t, textContent: `${t}〜` })));
    };
    syncTimes();
    form.addEventListener('change', e => { if (e.target.name === 'part') syncTimes(); });

    const setErr = (el, text) => {
      $(`${el.name}-err`).textContent = text || '';
      el.setAttribute('aria-invalid', text ? 'true' : 'false');
      return !text;
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = el => el.value.trim();
      let bad = null;
      const d = form.date.value ? new Date(`${form.date.value}T00:00`) : null;
      const dateMsg = !d ? 'ご希望日を選んでください。'
        : d < minD || d > maxD ? `${iso(minD)}から${iso(maxD)}までの日付を選んでください。`
        : d.getDay() === 0 ? '日曜日は定休日です。別の日を選んでください。' : '';
      if (!setErr(form.date, dateMsg)) bad = bad || form.date;
      if (!setErr(form.elements.name, v(form.elements.name) ? '' : 'お名前を入力してください。')) bad = bad || form.elements.name;
      const em = v(form.email);
      if (!setErr(form.email, !em ? 'メールアドレスを入力してください。' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) ? '' : 'メールアドレスの形式をご確認ください。')) bad = bad || form.email;
      if (bad) { bad.focus(); return; }
      // Set data-endpoint on the form to send this to a real backend.
      const pr = Number(part().dataset.price) * Number(form.party.value);
      const rows = [
        ['ご希望日時', `${form.date.value}　${part().value} ${form.time.value}〜`],
        ['人数', `${form.party.value}名`],
        ['おまかせ', `${part().closest('label').querySelector('b').textContent}　計 ${pr.toLocaleString('ja-JP')}円（目安）`],
        ['お名前', v(form.elements.name)],
        ['メール', em],
        ['ご要望', v(form.notes) || 'なし'],
      ];
      done.querySelector('dl').replaceChildren(...rows.flatMap(([k, val]) => [
        Object.assign(document.createElement('dt'), { textContent: k }),
        Object.assign(document.createElement('dd'), { textContent: val }),
      ]));
      form.hidden = true; done.hidden = false;
      done.querySelector('h3').focus();
    });
    done.querySelector('[data-reset]').addEventListener('click', () => {
      form.reset(); syncTimes();
      form.querySelectorAll('.err').forEach(el => (el.textContent = ''));
      form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
      done.hidden = true; form.hidden = false; form.date.focus();
    });
  }

  /* ---------- wire up whatever this page has ---------- */
  const hero = document.querySelector('.hero');
  if (hero) initHero(hero);
  if ($('chapters') && $('hover-img')) initChapters($('chapters'), $('hover-img'));
  if ($('serve')) initOmakase($('serve'));
  const shari = document.querySelector('.shari .ph');
  if (shari) initShari(shari);
  if ($('reserve-form')) initReserve($('reserve-form'), $('reserve-done'));

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
