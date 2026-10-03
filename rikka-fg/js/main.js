(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- menu ---------- */
  const head = document.querySelector('.site-head');
  const toggle = head.querySelector('.menu-toggle');
  const setOpen = open => {
    head.style.setProperty('--head-h', `${head.getBoundingClientRect().height}px`);
    head.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '閉じる' : 'メニュー';
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setOpen(!head.classList.contains('is-open')));
  head.querySelectorAll('.gnav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  /* ---------- hero intro ---------- */
  const hero = document.querySelector('.hero');
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
    .then(() => requestAnimationFrame(() => hero.classList.add('is-ready')));

  /* ---------- figures count up when they come into view ---------- */
  const fmt = (v, dec) => v.toLocaleString('ja-JP', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const countUp = el => {
    const to = Number(el.dataset.count), dec = Number(el.dataset.dec || 0);
    if (reduce) { el.textContent = fmt(to, dec); return; }
    const t0 = performance.now(), dur = 1800;
    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = fmt(to * e, dec);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      en.target.querySelectorAll('[data-count]').forEach(countUp);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('[data-reveal]').forEach(el => {
    el.querySelectorAll('[data-count]').forEach(c => { if (!reduce) c.textContent = fmt(0, Number(c.dataset.dec || 0)); });
    io.observe(el);
  });

  /* ---------- history: the line grows as you scroll ---------- */
  const tl = document.getElementById('timeline');
  const items = tl ? [...tl.querySelectorAll('li')] : [];
  const moveTimeline = () => {
    if (!tl) return;
    const r = tl.getBoundingClientRect(), vh = window.innerHeight;
    const vertical = window.matchMedia('(max-width: 1080px)').matches;
    const p = vertical
      ? Math.min(1, Math.max(0, (vh * .7 - r.top) / r.height))
      : Math.min(1, Math.max(0, (vh * .85 - r.top) / (vh * .55)));
    tl.style.setProperty('--p', p.toFixed(4));
    items.forEach((li, i) => {
      const at = vertical ? li.offsetTop / r.height : i / items.length;
      li.classList.toggle('is-on', p >= at + .005);
    });
  };
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { moveTimeline(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', moveTimeline);
  moveTimeline();

  /* ---------- related links: the fill starts where the pointer enters ---------- */
  document.querySelectorAll('.links a').forEach(a => {
    const at = e => {
      const r = a.getBoundingClientRect();
      a.style.setProperty('--mx', `${e.clientX - r.left}px`);
      a.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    a.addEventListener('pointerenter', at);
    a.addEventListener('pointerleave', at);
  });
})();
