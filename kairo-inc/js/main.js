(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- header ---------- */
  const head = document.querySelector('.site-head');
  const onScroll = () => head.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  const toggle = head.querySelector('.menu-toggle');
  const setOpen = open => {
    head.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '閉じる' : 'メニュー';
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setOpen(!head.classList.contains('is-open')));
  head.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  /* ---------- kinetic type ---------- */
  // Hero: wrap every character so it can rise in on its own delay. Screen readers get the h1's aria-label.
  const h1 = document.querySelector('[data-chars]');
  if (h1) {
    h1.setAttribute('aria-label', h1.textContent);
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach(c => {
            const s = document.createElement('span');
            s.className = 'ch'; s.textContent = c; s.style.setProperty('--i', i++);
            s.setAttribute('aria-hidden', 'true');
            frag.append(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(h1);
    const hero = h1.closest('.hero');
    const ready = () => requestAnimationFrame(() => hero.classList.add('is-ready'));
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(ready);
  }

  // Section headings: each line between <br>s slides up out of its own mask.
  document.querySelectorAll('[data-split]').forEach(h => {
    let i = 0;
    [...h.childNodes].forEach(n => {
      if (n.nodeType !== 3 || !n.textContent.trim()) return;
      const w = document.createElement('span'); w.className = 'w';
      const s = document.createElement('span'); s.textContent = n.textContent; s.style.setProperty('--i', i++);
      w.append(s); n.replaceWith(w);
    });
  });

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('[data-reveal], [data-split]').forEach(el => io.observe(el));
  const caseIo = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('is-in'); });
  }, { threshold: .35 });
  document.querySelectorAll('.case').forEach(el => caseIo.observe(el));

  /* ---------- pointer-follow highlights ---------- */
  document.querySelectorAll('.btn').forEach(b => b.addEventListener('pointermove', e => {
    const r = b.getBoundingClientRect();
    b.style.setProperty('--x', `${e.clientX - r.left}px`); b.style.setProperty('--y', `${e.clientY - r.top}px`);
  }));
  document.querySelectorAll('.chip').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`);
  }));

  /* ---------- oscilloscope ---------- */
  const scope = document.getElementById('scope');
  const todayEl = document.getElementById('today-count');
  const RATE = 2400; // sample readings per second (demo figure)
  const midnight = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const todayCount = () => Math.floor(((Date.now() - midnight()) / 1000) * RATE);
  if (todayEl) todayEl.textContent = todayCount().toLocaleString('ja-JP');
  if (scope) {
    const g = scope.getContext('2d');
    let w, h, dpr, phase = 0, visible = false, lastT = 0;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = scope.clientWidth; h = scope.clientHeight;
      scope.width = w * dpr; scope.height = h * dpr;
    };
    const wave = (x, t) => {
      const u = x / w;
      return Math.sin(u * 14 + t * 2.1) * .32 + Math.sin(u * 31 - t * 3.3) * .12 + Math.sin(u * 5 + t * .7) * .18
        + (Math.sin(u * 140 + t * 9) * Math.sin(u * 3 + t)) * .06;
    };
    const draw = (t, full) => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      g.strokeStyle = 'rgba(237,235,227,.07)'; g.lineWidth = 1;
      for (let x = 0; x <= w; x += w / 10) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, h); g.stroke(); }
      for (let y = 0; y <= h; y += h / 6) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke(); }
      g.strokeStyle = 'rgba(237,235,227,.18)'; g.beginPath(); g.moveTo(0, h / 2 + .5); g.lineTo(w, h / 2 + .5); g.stroke();
      const sweep = reduce || full ? w : ((t * 160) % (w + 80));
      [[8, 'rgba(242,178,126,.12)'], [2, 'rgba(242,178,126,.95)']].forEach(([lw, color]) => {
        g.lineWidth = lw; g.strokeStyle = color; g.lineJoin = 'round';
        g.beginPath();
        for (let x = 0; x <= Math.min(sweep, w); x += 2) {
          const y = h / 2 - wave(x, t) * h * .8;
          x ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      });
      if (!reduce && sweep < w) {
        const y = h / 2 - wave(sweep, t) * h * .8;
        const rg = g.createRadialGradient(sweep, y, 0, sweep, y, 14);
        rg.addColorStop(0, 'rgba(242,178,126,1)'); rg.addColorStop(1, 'rgba(242,178,126,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(sweep, y, 14, 0, Math.PI * 2); g.fill();
      }
    };
    const loop = now => {
      requestAnimationFrame(loop);
      if (!visible) return;
      if (now - lastT < 30) return; // ~30fps is plenty for a scope
      lastT = now;
      phase = now / 1000;
      draw(phase);
      if (todayEl) todayEl.textContent = todayCount().toLocaleString('ja-JP');
    };
    size();
    draw(0, true);
    window.addEventListener('resize', () => { size(); draw(phase, true); });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(scope);
    if (!reduce) requestAnimationFrame(loop);
  }

  /* ---------- works: vertical scroll drives a horizontal track ---------- */
  const works = document.getElementById('works');
  const track = document.getElementById('works-track');
  const bar = document.getElementById('works-bar');
  const wide = matchMedia('(min-width: 761px)');
  let travel = 0;
  const sizeWorks = () => {
    if (!wide.matches) { works.style.height = ''; track.style.transform = ''; return; }
    travel = Math.max(0, track.scrollWidth - window.innerWidth);
    works.style.height = `${window.innerHeight + travel}px`;
    moveWorks();
  };
  const moveWorks = () => {
    if (!wide.matches) return;
    const r = works.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight || 1)));
    track.style.transform = `translate3d(${-p * travel}px,0,0)`;
    bar.style.width = `${p * 100}%`;
  };

  /* ---------- process: the bus lights each pad as you scroll ---------- */
  const stepsWrap = document.getElementById('steps');
  const steps = stepsWrap ? [...stepsWrap.querySelectorAll('li')] : [];
  const moveSteps = () => {
    if (!stepsWrap) return;
    const r = stepsWrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * .85 - r.top) / (vh * .5)));
    stepsWrap.style.setProperty('--p', p);
    steps.forEach((li, i) => li.classList.toggle('is-on', p >= i / steps.length + .01));
  };

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { moveWorks(); moveSteps(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', sizeWorks);
  wide.addEventListener('change', sizeWorks);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { sizeWorks(); moveSteps(); });
  sizeWorks(); moveSteps();

  /* ---------- contact form ---------- */
  const form = document.getElementById('contact-form');
  if (!form) return;
  const done = document.getElementById('contact-done');
  const msgLabel = document.getElementById('message-label');
  const msg = form.elements.message;
  const syncTopic = () => {
    const job = form.elements.topic.value === '採用への応募';
    msgLabel.firstChild.textContent = job ? '希望する職種と、これまでの経験' : 'ご相談の内容';
    msg.placeholder = job ? '例：SREを希望しています。物流会社の社内SEを5年経験しました。' : '例：工場の設備の稼働状況を、紙ではなく画面で見られるようにしたい。';
  };
  form.addEventListener('change', e => { if (e.target.name === 'topic') syncTopic(); else if (e.target.closest('.field')) check(e.target); });

  // Role rows jump to the form with the topic and role filled in.
  document.querySelectorAll('.role').forEach(a => a.addEventListener('click', () => {
    form.querySelector('input[value="採用への応募"]').checked = true;
    syncTopic();
    if (!msg.value.trim()) msg.value = `希望する職種：${a.dataset.role}\n`;
  }));

  const setErr = (el, text) => {
    const box = document.getElementById(`${el.name}-err`);
    if (box) box.textContent = text || '';
    el.setAttribute('aria-invalid', text ? 'true' : 'false');
    return !text;
  };
  function check(el) {
    const v = (el.value || '').trim();
    switch (el.name) {
      case 'name': return setErr(el, v ? '' : 'お名前を入力してください。');
      case 'email': return setErr(el, !v ? 'メールアドレスを入力してください。' : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'メールアドレスの形式をご確認ください。'));
      case 'message': return setErr(el, v ? '' : '内容を入力してください。');
      default: return true;
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let firstBad = null;
    ['name', 'email', 'message'].forEach(n => { if (!check(form.elements[n]) && !firstBad) firstBad = form.elements[n]; });
    if (firstBad) { firstBad.focus(); return; }
    const data = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('button[type="submit"]');
    const status = document.getElementById('form-status');
    // Set data-endpoint on the form to post to a real backend (e.g. Formspree or your own API).
    if (form.dataset.endpoint) {
      btn.disabled = true; status.textContent = '送信しています…';
      try {
        const res = await fetch(form.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(res.status);
      } catch {
        status.textContent = '送信できませんでした。時間をおいて再度お試しいただくか、hello@kairo.example へメールでお送りください。';
        btn.disabled = false; return;
      }
    }
    const rows = [['ご用件', data.topic], ['会社名', data.company || '記入なし'], ['お名前', data.name], ['メール', data.email], ['内容', data.message]];
    done.querySelector('dl').replaceChildren(...rows.flatMap(([k, v]) => {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      return [dt, dd];
    }));
    form.hidden = true; done.hidden = false;
    done.querySelector('h3').focus();
  });
  done.querySelector('[data-reset]').addEventListener('click', () => {
    form.reset(); syncTopic();
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.err').forEach(el => (el.textContent = ''));
    form.querySelector('button[type="submit"]').disabled = false;
    document.getElementById('form-status').textContent = '二営業日以内に、エンジニアからお返事します。';
    done.hidden = true; form.hidden = false;
    form.elements.name.focus();
  });
})();
