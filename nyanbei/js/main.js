(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STICKERS = window.STICKERS || [];
  const byN = n => STICKERS.findIndex(s => s.n === n);
  const src = n => `images/stickers/${n}.png`;
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- menu ---------- */
  const head = document.querySelector('.site-head');
  const toggle = head.querySelector('.menu-toggle');
  const setOpen = open => {
    head.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'とじる' : 'メニュー';
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setOpen(!head.classList.contains('is-open')));
  head.querySelectorAll('.gnav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  /* ---------- hero: bouncy title, talking cat ---------- */
  const h1 = document.querySelector('[data-chars]');
  if (h1) {
    h1.setAttribute('aria-label', h1.textContent.trim());
    let i = 0;
    [...h1.childNodes].forEach(n => {
      if (n.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      [...n.textContent].forEach(c => {
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = c; s.style.setProperty('--i', i++); s.setAttribute('aria-hidden', 'true');
        frag.append(s);
      });
      n.replaceWith(frag);
    });
    h1.querySelector('small').setAttribute('aria-hidden', 'true');
  }
  const hero = document.querySelector('.hero');
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
    .then(() => requestAnimationFrame(() => hero.classList.add('is-ready')));

  const LINES = ['飲もう！', '乾杯！', 'なんでやねん！', '秒で行く！！', '全然酔ってへん', 'もう一杯だけ…', 'おつかれさん！', 'オスシー！'];
  const cat = document.getElementById('cat');
  const bubble = document.getElementById('bubble');
  let line = 0;
  cat.addEventListener('click', () => {
    line = (line + 1) % LINES.length;
    bubble.textContent = LINES[line];
    bubble.classList.remove('is-pop'); void bubble.offsetWidth; bubble.classList.add('is-pop');
  });

  /* ---------- pop in on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-pop]').forEach(el => io.observe(el));

  /* ---------- omikuji ---------- */
  const RANKS = [['大吉', 15], ['中吉', 25], ['小吉', 25], ['吉', 20], ['末吉', 15]];
  const MSG = {
    drink: ['今夜は乾杯日和。いい一杯に出会えそう。', '誘われたら、迷わず「飲もう！」と返して。'],
    tipsy: ['飲みすぎ注意報。お水も一緒にどうぞ。', '今日は早めに帰ると、明日の自分が喜ぶよ。'],
    hello: ['あいさつから、いいことが始まる日。', '「ありがとう」を、いつもより一回多く。'],
    feel: ['思いきりツッコむと、すっきりする日。', '笑っていれば、だいたいなんとかなる。'],
    food: ['おいしいものを食べると運気が上がるよ。', '今日はお寿司が呼んでいる。'],
    dash: ['思い立ったら秒で行こう。チャンスは足が速い。', '急ぐときほど、足もとをよく見てね。'],
  };
  const LUCKY = {
    drink: ['ラッキーなお酒：日本酒の熱燗', 'ラッキーなお酒：よく冷えたビール'],
    tipsy: ['ラッキーアイテム：しじみのお味噌汁', 'ラッキーアイテム：お水を一杯'],
    hello: ['ラッキーワード：おつかれさま', 'ラッキーワード：またねー'],
    feel: ['ラッキーワード：なんでやねん', 'ラッキーアイテム：お気に入りの毛布'],
    food: ['ラッキーごはん：サーモン', 'ラッキーごはん：分厚いステーキ'],
    dash: ['ラッキーな乗りもの：バイク', 'ラッキーな乗りもの：戦闘機'],
  };
  const drawRank = () => {
    let r = Math.random() * 100;
    for (const [name, w] of RANKS) { if ((r -= w) < 0) return name; }
    return '吉';
  };
  const drawBtn = document.getElementById('draw');
  const boxArt = document.getElementById('box-art');
  const result = document.getElementById('result');
  let lastN = null;
  drawBtn.addEventListener('click', () => {
    drawBtn.disabled = true;
    boxArt.classList.remove('is-shake'); void boxArt.offsetWidth;
    if (!reduce) boxArt.classList.add('is-shake');
    setTimeout(() => {
      let s;
      do { s = pick(STICKERS); } while (STICKERS.length > 1 && s.n === lastN);
      lastN = s.n;
      const rank = drawRank();
      const els = [
        Object.assign(document.createElement('p'), { className: 'rank', textContent: rank }),
        Object.assign(document.createElement('img'), { src: src(s.n), alt: `スタンプ「${s.cap}」`, width: 370, height: 320 }),
        Object.assign(document.createElement('p'), { className: 'msg', textContent: pick(MSG[s.cat]) }),
        Object.assign(document.createElement('p'), { className: 'lucky', textContent: pick(LUCKY[s.cat]) }),
      ];
      result.classList.remove('is-empty', 'is-new'); void result.offsetWidth;
      result.replaceChildren(...els);
      result.classList.add('is-new');
      drawBtn.textContent = 'もう一回引く';
      drawBtn.disabled = false;
    }, reduce ? 0 : 600);
  });

  /* ---------- sticker filter ---------- */
  const grid = document.getElementById('grid');
  const items = [...grid.children];
  const tabs = document.querySelectorAll('.tabs button');
  tabs.forEach(t => t.addEventListener('click', () => {
    const f = t.dataset.filter;
    tabs.forEach(b => b.setAttribute('aria-pressed', String(b === t)));
    let k = 0;
    items.forEach(li => {
      const show = f === 'all' || li.dataset.cat === f;
      li.hidden = !show;
      li.classList.remove('is-filter-in');
      if (show) { li.style.setProperty('--k', k++); void li.offsetWidth; li.classList.add('is-filter-in'); }
    });
  }));

  /* ---------- lightbox ---------- */
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbCap = document.getElementById('lb-cap');
  const lbCount = document.getElementById('lb-count');
  let list = STICKERS, at = 0, opener = null;
  const visibleList = () => items.filter(li => !li.hidden).map(li => STICKERS[byN(li.querySelector('button').dataset.n)]);
  const show = () => {
    const s = list[at];
    lbImg.src = src(s.n); lbImg.alt = `スタンプ「${s.cap}」`;
    lbCap.textContent = s.cap;
    lbCount.textContent = `${at + 1} / ${list.length}`;
  };
  const open = (n, fromList) => {
    list = fromList || STICKERS;
    at = Math.max(0, list.findIndex(s => s.n === n));
    opener = document.activeElement;
    show();
    if (!lb.open) lb.showModal();
  };
  grid.addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b) open(b.dataset.n, visibleList()); });
  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => open(b.dataset.open)));
  lb.addEventListener('click', e => {
    if (e.target === lb || e.target.closest('[data-close]')) { lb.close(); return; }
    const step = e.target.closest('[data-step]');
    if (step) { at = (at + Number(step.dataset.step) + list.length) % list.length; show(); }
  });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      at = (at + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length; show();
    }
  });
  lb.addEventListener('close', () => { if (opener) opener.focus(); });

  /* ---------- share links + back to top ---------- */
  const here = location.href.split('#')[0];
  const text = 'お酒とツッコミが大好きな黒猫「にゃん兵衛」 #にゃん兵衛';
  document.getElementById('share-x').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(here)}`;
  document.getElementById('share-line').href = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(here)}`;

  const toTop = document.getElementById('to-top');
  const onScroll = () => toTop.classList.toggle('is-on', window.scrollY > window.innerHeight);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
