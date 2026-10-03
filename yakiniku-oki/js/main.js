(() => {
  /* ---------- header ---------- */
  const head = document.querySelector('.site-head');
  const onScroll = () => head.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = head.querySelector('.menu-toggle');
  const openLabel = toggle.textContent;
  const setOpen = open => {
    head.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '閉じる' : openLabel;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setOpen(!head.classList.contains('is-open')));
  head.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  /* ---------- cut chart ---------- */
  // Yields are rough figures for one heifer with a carcass of about 450kg.
  const CUTS = [
    { id: 'tan', name: 'タン', reading: 'たん', kg: 1.5,
      taste: '根元の「タン元」は脂が多く、歯切れよく、噛むほどに甘みが出ます。',
      how: '厚切りを片面ずつ。表面に肉汁が浮いたら返し、塩とレモンで。' },
    { id: 'kataroce', name: '肩ロース', reading: 'かたろーす', kg: 10,
      taste: '赤身と脂の釣り合いがよい部位。芯の「ザブトン」はとりわけサシが細かく入ります。',
      how: '薄切りをさっと炙る焼きしゃぶで。' },
    { id: 'misuji', name: 'ミスジ', reading: 'みすじ', kg: 2,
      taste: '肩甲骨の内側にある希少部位。中央の筋を境に、きめ細かなサシが流れます。',
      how: '片面十秒ずつ。焼きすぎると脂が逃げてしまいます。' },
    { id: 'ribroce', name: 'リブロース', reading: 'りぶろーす', kg: 12,
      taste: '霜降りがもっとも美しく入る部位。脂の甘みとコクが強く出ます。',
      how: '卵黄にくぐらせる焼きすきで。' },
    { id: 'sirloin', name: 'サーロイン', reading: 'さーろいん', kg: 12,
      taste: '柔らかさと香りを兼ね備えた、ステーキの王様。',
      how: '厚めに切り、炭のいちばん強いところで表面を焼き固めます。' },
    { id: 'hire', name: 'ヒレ', reading: 'ひれ', kg: 8,
      taste: '脂が少なく、もっとも柔らかい部位。中心の約1kgだけがシャトーブリアンになります。',
      how: '厚切りを焼き手が全面焼き、少し休ませてからお出しします。' },
    { id: 'rump', name: 'ランプ', reading: 'らんぷ', kg: 6,
      taste: '赤身の旨みが濃く、脂はあっさり。',
      how: '中はレアに。わさび醤油で。' },
    { id: 'ichibo', name: 'イチボ', reading: 'いちぼ', kg: 2,
      taste: 'お尻の先端の希少部位。赤身と脂がしっかり混じった、濃い味わいです。',
      how: '両面をこんがりと焼き、塩で。' },
    { id: 'momo', name: 'もも', reading: 'もも', kg: 30,
      taste: 'うちもも、そともも、シンタマを合わせた赤身の部位。シンタマの一部、トモサンカクは一頭から約1kgです。',
      how: '薄切りでさっと。ユッケや炙りにも使います。' },
    { id: 'sankakubara', name: '三角バラ', reading: 'さんかくばら', kg: 5,
      taste: '肋骨まわりの、いわゆる特上カルビ。濃厚な脂の甘みがあります。',
      how: '網の端で脂を落としながら、焼き色をしっかりと。' },
    { id: 'tomobara', name: 'ともバラ', reading: 'ともばら', kg: 20,
      taste: 'カルビ、カイノミ、ササミが取れる部位。カイノミは一頭から約1kgです。',
      how: 'タレで。焼き色がついたらすぐに返します。' },
    { id: 'harami', name: 'ハラミ', reading: 'はらみ', kg: 2,
      taste: '横隔膜の筋肉。分類は内臓ですが、赤身のような味わいと柔らかさがあります。',
      how: '中火でじっくり。肉汁が浮いてきたら食べごろです。' },
  ];
  const MAX_KG = 30;
  const svg = document.querySelector('.cow');
  if (svg) {
    const list = document.getElementById('cut-list');
    const $ = id => document.getElementById(id);
    list.replaceChildren(...CUTS.map(c => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.cut = c.id; b.textContent = c.name;
      b.setAttribute('aria-pressed', 'false');
      li.append(b);
      return li;
    }));

    const select = id => {
      const c = CUTS.find(x => x.id === id);
      if (!c) return;
      svg.querySelectorAll('[data-cut]').forEach(el => el.classList.toggle('is-active', el.dataset.cut === id));
      svg.querySelectorAll('.label').forEach(el => el.classList.toggle('on-oki', el.dataset.for === id && id !== 'harami'));
      list.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cut === id)));
      $('cd-reading').textContent = c.reading;
      $('cd-name').textContent = c.name;
      $('cd-kg').textContent = `約${c.kg}kg`;
      $('cd-bar').style.width = `${(c.kg / MAX_KG) * 100}%`;
      $('cd-taste').textContent = c.taste;
      $('cd-how').textContent = c.how;
    };

    svg.addEventListener('click', e => { const t = e.target.closest('[data-cut]'); if (t) select(t.dataset.cut); });
    svg.addEventListener('keydown', e => {
      const t = e.target.closest('[data-cut]');
      if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(t.dataset.cut); }
    });
    list.addEventListener('click', e => { const b = e.target.closest('button'); if (b) select(b.dataset.cut); });
    select('misuji');
  }

  /* ---------- reservation form ---------- */
  const form = document.getElementById('reserve-form');
  if (!form) return;
  const done = document.getElementById('reserve-done');
  const CLOSED_DAY = 1; // Monday

  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = v => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmt = d => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minD = new Date(today); minD.setDate(minD.getDate() + 1);
  const maxD = new Date(today); maxD.setMonth(maxD.getMonth() + 2);
  form.date.min = iso(minD); form.date.max = iso(maxD);
  document.getElementById('date-range').textContent = `${fmt(minD)}から${fmt(maxD)}まで受付中です。月曜は定休日です。`;

  const setErr = (el, msg) => {
    const box = document.getElementById(`${el.name}-err`);
    if (box) box.textContent = msg || '';
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };

  function check(el) {
    const v = (el.value || '').trim();
    switch (el.name) {
      case 'date': {
        if (!v) return setErr(el, 'ご希望日を選んでください。');
        const d = parse(v);
        if (d < minD || d > maxD) return setErr(el, `${fmt(minD)}から${fmt(maxD)}までの日付を選んでください。`);
        if (d.getDay() === CLOSED_DAY) return setErr(el, '月曜は定休日です。別の日を選んでください。');
        return setErr(el, '');
      }
      case 'time': return setErr(el, v ? '' : 'お時間を選んでください。');
      case 'room': {
        const opt = el.selectedOptions[0];
        if (!opt || !opt.dataset.min) return setErr(el, '');
        const n = Number(form.party.value), lo = Number(opt.dataset.min), hi = Number(opt.dataset.max);
        return setErr(el, n < lo || n > hi ? `「${opt.value}」は${lo}〜${hi}名様のお部屋です。人数か個室を変えてください。` : '');
      }
      case 'tel': return setErr(el, !v ? '電話番号を入力してください。' : (/^[+\d][\d\s-]{8,}$/.test(v) ? '' : '電話番号の形式をご確認ください（例：090-1234-5678）。'));
      case 'email': return setErr(el, !v ? 'メールアドレスを入力してください。' : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'メールアドレスの形式をご確認ください。'));
      case 'name': return setErr(el, v ? '' : 'お名前を入力してください。');
      default: return true;
    }
  }

  form.addEventListener('change', e => {
    if (e.target.name === 'party') check(form.room);
    else if (e.target.closest('.field')) check(e.target);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let firstBad = null;
    ['date', 'time', 'room', 'name', 'tel', 'email'].forEach(n => { if (!check(form[n]) && !firstBad) firstBad = form[n]; });
    const agreeErr = document.getElementById('agree-err');
    agreeErr.textContent = form.agree.checked ? '' : 'お取り消しの規定へのご同意が必要です。';
    if (!form.agree.checked && !firstBad) firstBad = form.agree;
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
        status.textContent = '送信できませんでした。通信環境をご確認のうえもう一度お試しいただくか、お電話でご予約ください。';
        btn.disabled = false; return;
      }
    }

    const rows = [
      ['ご希望日時', `${fmt(parse(data.date))}　${data.time}`],
      ['人数', `${data.party}名様`],
      ['個室', data.room || '指定なし'],
      ['コース', data.course],
      ['お名前', data.name],
      ['ご連絡先', `${data.tel}\n${data.email}`],
      ['ご要望', data.notes || 'なし'],
    ];
    done.querySelector('dl').replaceChildren(...rows.flatMap(([k, v]) => {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      return [dt, dd];
    }));
    form.hidden = true;
    done.hidden = false;
    done.querySelector('h3').focus();
  });

  done.querySelector('[data-reset]').addEventListener('click', () => {
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.err').forEach(el => (el.textContent = ''));
    form.querySelector('button[type="submit"]').disabled = false;
    document.getElementById('form-status').textContent = '送信の時点では、ご予約はまだ確定していません。';
    done.hidden = true;
    form.hidden = false;
    form.date.focus();
  });
})();
