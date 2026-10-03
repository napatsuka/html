(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- intro veil: once per visit ---------- */
  const veil = document.getElementById('veil');
  let seen = false;
  try { seen = sessionStorage.getItem('shijima-veil') === '1'; sessionStorage.setItem('shijima-veil', '1'); } catch {}
  const startHero = () => document.dispatchEvent(new Event('veil:done'));
  if (reduce || seen) { veil.classList.add('is-done'); requestAnimationFrame(startHero); }
  else {
    veil.classList.add('is-run');
    setTimeout(() => veil.classList.add('is-out'), 1500);
    setTimeout(() => { veil.classList.add('is-done'); }, 2600);
    setTimeout(startHero, 1700);
  }

  /* ---------- cursor ---------- */
  const cursor = document.getElementById('cursor');
  if (fine && !reduce) {
    const label = cursor.querySelector('span');
    let x = -100, y = -100, cx = -100, cy = -100;
    window.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cursor.classList.add('is-on'); }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
    const tick = () => {
      cx += (x - cx) * .22; cy += (y - cy) * .22;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(tick);
    };
    tick();
    document.addEventListener('pointerover', e => {
      const big = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button, label, input, select, textarea');
      cursor.classList.toggle('is-big', !!big && !link);
      cursor.classList.toggle('is-link', !!link);
      label.textContent = big && !link ? big.dataset.cursor : '';
    });
  }

  /* ---------- header ---------- */
  const head = document.getElementById('head');
  const hero = document.getElementById('top');
  let lastY = window.scrollY;
  const onHeader = () => {
    const y = window.scrollY;
    const pastHero = y > hero.offsetHeight - 120;
    head.classList.toggle('is-solid', y > 30);
    head.classList.toggle('is-hidden', pastHero && y > lastY && !head.classList.contains('is-open'));
    lastY = y;
  };
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

  /* ---------- a day at Shijima ---------- */
  const MOMENTS = [
    { t: '05:30', h: 5.5,  name: '朝霧',   line: '川から霧が立ちのぼり、谷がゆっくりと目を覚ます。', accent: '#8FA9B8' },
    { t: '07:30', h: 7.5,  name: '朝餉',   line: '土鍋で炊いたご飯と、川魚の干物。湯気の向こうに、朝の光。', accent: '#C2A06A' },
    { t: '11:00', h: 11,   name: '渓流',   line: '宿の裏から、川沿いの小径へ。水の色が、刻々と変わる。', accent: '#87A47C' },
    { t: '16:00', h: 16,   name: '湯浴み', line: '陽が傾くころ、露天の湯へ。聞こえるのは、川の音だけ。', accent: '#C98E5E' },
    { t: '18:30', h: 18.5, name: '夕餉',   line: '木曽の山と川の恵みを、八つの皿で。', accent: '#B86B4E' },
    { t: '22:00', h: 22,   name: '星',     line: '灯りを落とすと、谷の上に星があふれる。', accent: '#8F9CCB' },
  ];
  const imgs = [...document.querySelectorAll('.day-img')];
  const stops = [...document.querySelectorAll('.dial-stop')];
  const track = document.querySelector('.dial-track');
  const moment = document.getElementById('moment');
  const mTime = document.getElementById('m-time'), mName = document.getElementById('m-name'), mLine = document.getElementById('m-line');
  const auto = document.getElementById('autoplay');
  const autoBar = auto.querySelector('i');
  let cur = -1, swapTimer;

  // Which moment is it now in Japan?
  const jstHour = () => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = k => Number(p.find(x => x.type === k).value);
    return g('hour') + g('minute') / 60;
  };
  const nowIndex = () => {
    const h = jstHour();
    let i = MOMENTS.length - 1;
    for (let k = 0; k < MOMENTS.length; k++) if (h >= MOMENTS[k].h) i = k;
    return h < MOMENTS[0].h ? MOMENTS.length - 1 : i; // before dawn it is still starlight
  };

  const go = (i, instant) => {
    if (i === cur) return;
    cur = i;
    const m = MOMENTS[i];
    imgs.forEach((f, k) => f.classList.toggle('is-on', k === i));
    stops.forEach((s, k) => s.setAttribute('aria-pressed', String(k === i)));
    track.style.setProperty('--pos', stops[i].style.getPropertyValue('--x'));
    root.style.setProperty('--accent', m.accent);
    const write = () => { mTime.textContent = m.t; mTime.setAttribute('datetime', m.t); mName.textContent = m.name; mLine.textContent = m.line; };
    clearTimeout(swapTimer);
    if (instant || reduce) { write(); return; }
    moment.classList.add('is-swap');
    swapTimer = setTimeout(() => { write(); moment.classList.remove('is-swap'); }, 450);
  };

  // Autoplay: advance through the day, pausing whenever the visitor takes the dial.
  const DWELL = 7000;
  let playing = !reduce, t0 = 0, heroVisible = true;
  const setPlaying = on => {
    playing = on; t0 = performance.now();
    auto.setAttribute('aria-pressed', String(on));
    document.getElementById('autoplay-label').textContent = on ? '自動で進む' : '止めています';
    autoBar.style.setProperty('--t', 0);
  };
  const loop = now => {
    requestAnimationFrame(loop);
    if (!playing || !heroVisible) { t0 = now - (Number(autoBar.style.getPropertyValue('--t')) || 0) * DWELL; return; }
    const t = (now - t0) / DWELL;
    autoBar.style.setProperty('--t', clamp(t, 0, 1).toFixed(3));
    if (t >= 1) { t0 = now; go((cur + 1) % MOMENTS.length); }
  };
  stops.forEach((s, k) => s.addEventListener('click', () => { go(k); setPlaying(false); }));
  auto.addEventListener('click', () => setPlaying(!playing));
  document.getElementById('dial').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const k = (cur + (e.key === 'ArrowRight' ? 1 : -1) + MOMENTS.length) % MOMENTS.length;
    go(k); setPlaying(false); stops[k].focus();
  });
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; }).observe(hero);

  go(nowIndex(), true);
  if (reduce) { auto.hidden = true; }
  document.addEventListener('veil:done', () => { t0 = performance.now(); requestAnimationFrame(loop); }, { once: true });

  /* ---------- statement fills in as you read ---------- */
  const st = document.getElementById('statement');
  let chars = [];
  if (st && !reduce) {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...n.textContent].forEach(c => { const s = document.createElement('span'); s.className = 'c'; s.textContent = c; frag.append(s); chars.push(s); });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    st.setAttribute('aria-label', st.textContent);
    walk(st);
    chars.forEach(c => c.setAttribute('aria-hidden', 'true'));
  }
  const fillStatement = () => {
    if (!chars.length) return;
    const r = st.getBoundingClientRect(), vh = window.innerHeight;
    const p = clamp((vh * .85 - r.top) / (r.height + vh * .35), 0, 1);
    const n = chars.length, head = p * (n + 8);
    chars.forEach((c, i) => c.style.setProperty('--o', (.14 + .86 * clamp((head - i) / 8, 0, 1)).toFixed(3)));
  };

  /* ---------- reveal + parallax ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('is-in');
    if (en.target.matches('.ph')) setTimeout(() => en.target.classList.add('is-settled'), 2300);
    io.unobserve(en.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('[data-reveal], [data-fade]').forEach(el => io.observe(el));
  const para = [...document.querySelectorAll('.ph[data-speed]')];
  const parallax = () => {
    if (reduce) return;
    const vh = window.innerHeight;
    para.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const off = (r.top + r.height / 2 - vh / 2) * Number(el.dataset.speed);
      el.style.setProperty('--py', `${off.toFixed(1)}px`);
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onHeader(); fillStatement(); parallax(); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onHeader(); fillStatement(); parallax();

  /* ---------- rooms: drag, buttons, counter ---------- */
  const rt = document.getElementById('rooms-track');
  const rooms = [...rt.querySelectorAll('.room')];
  const count = document.getElementById('room-count');
  const pad = n => String(n).padStart(2, '0');
  const nearest = () => {
    const left = rt.getBoundingClientRect().left;
    let best = 0, d = Infinity;
    rooms.forEach((r, i) => { const dd = Math.abs(r.getBoundingClientRect().left - left - parseFloat(getComputedStyle(rt).scrollPaddingLeft || 0)); if (dd < d) { d = dd; best = i; } });
    return best;
  };
  const toRoom = i => {
    const target = rooms[clamp(i, 0, rooms.length - 1)];
    rt.scrollTo({ left: target.offsetLeft - rooms[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  };
  rt.addEventListener('scroll', () => { count.textContent = `${pad(nearest() + 1)} / ${pad(rooms.length)}`; }, { passive: true });
  document.getElementById('room-prev').addEventListener('click', () => toRoom(nearest() - 1));
  document.getElementById('room-next').addEventListener('click', () => toRoom(nearest() + 1));
  rt.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); toRoom(nearest() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); toRoom(nearest() - 1); }
  });
  let drag = null;
  rt.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: rt.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 4) { drag.moved = true; rt.classList.add('is-drag'); }
    rt.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved; drag = null;
    rt.classList.remove('is-drag');
    if (moved) toRoom(nearest());
  });

  /* ---------- reservation ---------- */
  const form = document.getElementById('reserve-form');
  const done = document.getElementById('reserve-done');
  const yen = n => n.toLocaleString('ja-JP');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minD = new Date(today); minD.setDate(minD.getDate() + 1);
  const maxD = new Date(2027, 2, 31);
  form.date.min = iso(minD); form.date.max = iso(maxD);
  const roomInput = () => form.querySelector('input[name="room"]:checked');
  const roomName = r => r.closest('label').querySelector('b').textContent;

  const setErr = (id, el, text) => {
    document.getElementById(id).textContent = text || '';
    if (el) el.setAttribute('aria-invalid', text ? 'true' : 'false');
    return !text;
  };
  const checkRoom = () => {
    const r = roomInput(), g = Number(form.guests.value);
    const lo = Number(r.dataset.min), hi = Number(r.dataset.max);
    if (g < lo) return setErr('room-err', null, `「${roomName(r)}」は${lo}名さまからのお部屋です。`);
    if (g > hi) return setErr('room-err', null, `「${roomName(r)}」は${hi}名さままでのお部屋です。人数か客室を変えてください。`);
    return setErr('room-err', null, '');
  };
  const estimate = () => {
    const r = roomInput(), g = Number(form.guests.value), n = Number(form.nights.value);
    const per = Number(r.dataset.price);
    const ok = g >= Number(r.dataset.min) && g <= Number(r.dataset.max);
    document.getElementById('est-total').replaceChildren(ok ? yen(per * g * n) : '—', Object.assign(document.createElement('small'), { textContent: ok ? '円' : '' }));
    document.getElementById('est-detail').textContent = `${roomName(r)}　お一人さま ${yen(per)}円 × ${g}名 × ${n}泊（税込・一泊二食）`;
  };
  form.addEventListener('change', () => { checkRoom(); estimate(); });
  estimate();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = el => el.value.trim();
    let bad = null;
    const d = form.date.value ? new Date(form.date.value + 'T00:00') : null;
    if (!setErr('date-err', form.date, !d ? 'チェックインの日を選んでください。' : (d < minD || d > maxD ? `${iso(minD)}から2027-03-31までの日付を選んでください。` : '')) && !bad) bad = form.date;
    if (!setErr('email-err', form.email, !v(form.email) ? 'メールアドレスを入力してください。' : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v(form.email)) ? '' : 'メールアドレスの形式をご確認ください。')) && !bad) bad = form.email;
    if (!setErr('name-err', form.elements.name, v(form.elements.name) ? '' : 'お名前を入力してください。') && !bad) bad = form.elements.name;
    if (!checkRoom() && !bad) bad = roomInput();
    if (bad) { bad.focus(); return; }
    // Set data-endpoint on the form to send this to a real backend.
    const r = roomInput();
    const rows = [
      ['チェックイン', `${form.date.value}　${form.nights.value}泊`],
      ['客室・人数', `${roomName(r)}　${form.guests.value}名`],
      ['料金の目安', `${document.getElementById('est-total').textContent}`],
      ['お名前', v(form.elements.name)],
      ['メール', v(form.email)],
      ['ご要望', v(form.notes) || 'なし'],
    ];
    done.querySelector('dl').replaceChildren(...rows.flatMap(([k, val]) => [Object.assign(document.createElement('dt'), { textContent: k }), Object.assign(document.createElement('dd'), { textContent: val })]));
    form.hidden = true; done.hidden = false;
    done.querySelector('h3').focus();
  });
  done.querySelector('[data-reset]').addEventListener('click', () => {
    form.reset(); form.querySelectorAll('.err').forEach(el => (el.textContent = ''));
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    estimate(); done.hidden = true; form.hidden = false; form.date.focus();
  });
})();
