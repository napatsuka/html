(() => {
  const yen = n => `${n.toLocaleString('ja-JP')}円`;

  /* ---------- header menu ---------- */
  const head = document.querySelector('.site-head');
  const toggle = head.querySelector('.menu-toggle');
  const setOpen = open => {
    head.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '閉じる' : 'メニュー';
  };
  toggle.addEventListener('click', () => setOpen(!head.classList.contains('is-open')));
  head.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  /* ---------- estimate ---------- */
  // Prices are tax-included guides. Food is per attendee; gifts are 1,100 yen each.
  const PLANS = {
    kaso:      { name: '火葬式', base: 198000, food: 0,    foodNote: '火葬式では通常ありません', gift: false, min: 1,  max: 10 },
    ichinichi: { name: '一日葬', base: 385000, food: 3300, foodNote: '精進落とし　お一人 3,300円', gift: true, min: 1,  max: 30 },
    kazoku:    { name: '家族葬', base: 528000, food: 5500, foodNote: '通夜振る舞いと精進落とし　お一人 5,500円', gift: true, min: 1,  max: 30 },
    ippan:     { name: '一般葬', base: 880000, food: 4400, foodNote: '通夜振る舞いと精進落とし　お一人 4,400円', gift: true, min: 30, max: 150 },
  };
  const CREM = { public: 45000, private: 90000 };
  const GIFT = 1100;

  const est = document.getElementById('estimate');
  if (est) {
    const $ = id => document.getElementById(id);
    const people = $('est-people');
    const calc = () => {
      const p = PLANS[est.plan.value];
      const n = Number(people.value);
      const food = p.food * n;
      const gift = p.gift ? GIFT * n : 0;
      const crem = CREM[est.crem.value];
      $('est-people-out').firstElementChild.textContent = n;
      $('r-plan').textContent = yen(p.base);
      $('r-crem').textContent = yen(crem);
      $('r-food').textContent = yen(food);
      $('r-food-note').textContent = p.foodNote;
      $('r-gift').textContent = yen(gift);
      const unit = document.createElement('small'); unit.textContent = '円';
      $('r-total').replaceChildren((p.base + crem + food + gift).toLocaleString('ja-JP'), unit);

      let hint = '';
      if (n > p.max) {
        const better = Object.values(PLANS).find(q => n >= q.min && n <= q.max);
        hint = `${p.name}の人数の目安は${p.max}名までです。${better ? `${n}名なら${better.name}が合っています。` : ''}`;
      } else if (n < p.min) {
        hint = `${p.name}は${p.min}名以上を想定しています。${n}名なら家族葬か一日葬が合っています。`;
      }
      $('est-hint').textContent = hint;
    };
    est.addEventListener('input', calc);
    est.addEventListener('change', calc);
    calc();
  }

  /* ---------- consultation form ---------- */
  const form = document.getElementById('consult-form');
  if (!form) return;
  const done = document.getElementById('consult-done');

  const setErr = (el, msg) => {
    const box = document.getElementById(`${el.name}-err`);
    if (box) box.textContent = msg || '';
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  const byPost = () => form.method.value === '資料を郵送';

  function check(el) {
    const v = (el.value || '').trim();
    switch (el.name) {
      case 'name': return setErr(el, v ? '' : 'お名前を入力してください。');
      case 'tel': return setErr(el, !v ? '電話番号を入力してください。' : (/^[+\d][\d\s-]{8,}$/.test(v) ? '' : '電話番号の形式をご確認ください（例：03-1234-5678）。'));
      case 'email': return setErr(el, !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'メールアドレスの形式をご確認ください。');
      case 'addr': return setErr(el, byPost() && !v ? '資料をお送りするご住所を入力してください。' : '');
      default: return true;
    }
  }

  const addrLabel = form.querySelector('label[for="c-addr"]');
  const syncAddr = () => {
    let tag = addrLabel.querySelector('.req');
    if (byPost() && !tag) { tag = document.createElement('span'); tag.className = 'req'; tag.textContent = '必須'; addrLabel.append(tag); }
    if (!byPost() && tag) tag.remove();
    form.addr.required = byPost();
  };
  syncAddr();

  form.addEventListener('change', e => {
    if (e.target.name === 'method') { syncAddr(); check(form.addr); }
    else if (e.target.closest('.field')) check(e.target);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let firstBad = null;
    ['name', 'tel', 'email', 'addr'].forEach(n => { if (!check(form[n]) && !firstBad) firstBad = form[n]; });
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
        status.textContent = '送信できませんでした。お手数ですが、0120-000-000 へお電話ください。';
        btn.disabled = false; return;
      }
    }

    const rows = [
      ['ご相談の方法', data.method],
      ['お名前', data.name],
      ['ご連絡先', [data.tel, data.email].filter(Boolean).join('\n')],
      ...(data.addr ? [['ご住所', data.addr]] : []),
      ['ご希望の日時', data.when || '指定なし'],
      ['ご相談内容', data.notes || '記入なし'],
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
    syncAddr();
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.err').forEach(el => (el.textContent = ''));
    form.querySelector('button[type="submit"]').disabled = false;
    document.getElementById('form-status').textContent = '一営業日以内に、担当者からご連絡します。';
    done.hidden = true;
    form.hidden = false;
    form.name.focus();
  });
})();
