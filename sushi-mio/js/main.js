(() => {
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ja';
  const T = {
    ja: {
      required: 'ご入力ください。',
      sitting: 'お時間をお選びください。',
      sunday: '日曜日は定休日です。別の日をお選びください。',
      range: (a, b) => `${a}から${b}までの日付をお選びください。`,
      rangeHint: (a, b) => `${a}から${b}まで受付中です。日曜は定休日です。`,
      tel: '電話番号の形式をご確認ください（例：090-1234-5678）。',
      email: 'メールアドレスの形式をご確認ください。',
      agree: 'お取り消しの規定へのご同意が必要です。',
      sameDate: '第一希望と別の日付をお選びください。',
      sending: '送信しています…',
      failed: '送信できませんでした。通信環境をご確認のうえ、もう一度お試しいただくか、お電話でご予約ください。',
      seatCaption: (n, t) => t ? `${t}の回に${n}席をお取りします。` : 'お時間を選ぶと、お取りする席がカウンターに灯ります。',
      fmtDate: d => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`,
      people: n => `${n}名様`,
      none: 'なし',
    },
    en: {
      required: 'Please fill in this field.',
      sitting: 'Please choose a seating.',
      sunday: 'We are closed on Sundays. Please choose another date.',
      range: (a, b) => `Please choose a date between ${a} and ${b}.`,
      rangeHint: (a, b) => `Open for ${a} to ${b}. Closed on Sundays.`,
      tel: 'Please check the phone number, including the country code.',
      email: 'Please check the email address.',
      agree: 'Please agree to the cancellation policy.',
      sameDate: 'Please choose a date different from your first choice.',
      sending: 'Sending…',
      failed: 'Your request could not be sent. Please check your connection and try again, or call us.',
      seatCaption: (n, t) => t ? `We will hold ${n} ${n > 1 ? 'seats' : 'seat'} at the ${t} seating.` : 'Choose a seating to see your seats at the counter.',
      fmtDate: d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }),
      people: n => `${n} ${n > 1 ? 'guests' : 'guest'}`,
      none: 'None',
    },
  }[lang];

  /* ---------- header ---------- */
  const head = document.querySelector('.site-head');
  const onScroll = () => head.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = head.querySelector('.menu-toggle');
  const labels = { open: toggle.textContent, close: lang === 'en' ? 'Close' : '閉じる' };
  const setOpen = open => {
    toggle.textContent = open ? labels.close : labels.open;
    head.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setOpen(!head.classList.contains('is-open')));
  head.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  /* ---------- reservation form ---------- */
  const form = document.getElementById('reserve-form');
  if (!form) return;
  const done = document.getElementById('reserve-done');

  // Bookings open on the 1st of each month for up to the end of the month after next.
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minD = new Date(today); minD.setDate(minD.getDate() + 1);
  const maxD = new Date(today.getFullYear(), today.getMonth() + 3, 0);
  const parse = v => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };

  ['date', 'date2'].forEach(n => { form[n].min = iso(minD); form[n].max = iso(maxD); });
  const rangeHint = document.getElementById('date-range');
  if (rangeHint) rangeHint.textContent = T.rangeHint(T.fmtDate(minD), T.fmtDate(maxD));

  // Light seats for the chosen seating and party size.
  const caption = document.getElementById('seat-caption');
  const lightSeats = () => {
    const n = Number(form.party.value) || 0;
    const chosen = form.querySelector('input[name="sitting"]:checked');
    form.querySelectorAll('.sitting').forEach(s => {
      const on = chosen && s.contains(chosen);
      s.querySelectorAll('.row i').forEach((i, idx) => i.classList.toggle('is-on', on && idx < n));
    });
    caption.textContent = T.seatCaption(n, chosen ? chosen.value : '');
  };
  form.addEventListener('change', e => {
    if (e.target.name === 'sitting' || e.target.name === 'party') lightSeats();
    if (e.target.closest('.field')) validateField(e.target);
  });
  lightSeats();

  const errEl = el => document.getElementById(`${el.name}-err`);
  const setErr = (el, msg) => {
    const box = errEl(el);
    if (box) box.textContent = msg || '';
    if (el.type !== 'radio' && el.type !== 'checkbox') el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };

  function checkDate(el, requiredField) {
    if (!el.value) return requiredField ? T.required : '';
    const d = parse(el.value);
    if (d < minD || d > maxD) return T.range(T.fmtDate(minD), T.fmtDate(maxD));
    if (d.getDay() === 0) return T.sunday;
    if (el.name === 'date2' && el.value === form.date.value) return T.sameDate;
    return '';
  }

  function validateField(el) {
    const v = (el.value || '').trim();
    switch (el.name) {
      case 'date': return setErr(el, checkDate(el, true));
      case 'date2': return setErr(el, checkDate(el, false));
      case 'tel': return setErr(el, !v ? T.required : (/^[+\d][\d\s-]{8,}$/.test(v) ? '' : T.tel));
      case 'email': return setErr(el, !v ? T.required : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : T.email));
      default: return el.required ? setErr(el, v ? '' : T.required) : true;
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let firstBad = null;
    form.querySelectorAll('.field input, .field select, .field textarea').forEach(el => {
      if (!validateField(el) && !firstBad) firstBad = el;
    });
    const sitting = form.querySelector('input[name="sitting"]:checked');
    document.getElementById('sitting-err').textContent = sitting ? '' : T.sitting;
    if (!sitting && !firstBad) firstBad = form.querySelector('input[name="sitting"]');
    const agreeOk = form.agree.checked;
    document.getElementById('agree-err').textContent = agreeOk ? '' : T.agree;
    if (!agreeOk && !firstBad) firstBad = form.agree;
    if (firstBad) { firstBad.focus(); return; }

    const data = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('button[type="submit"]');
    const status = document.getElementById('form-status');

    // Set data-endpoint on the form to post to a real backend (e.g. Formspree or your own API).
    const endpoint = form.dataset.endpoint;
    if (endpoint) {
      btn.disabled = true; status.textContent = T.sending;
      try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(res.status);
      } catch {
        status.textContent = T.failed; btn.disabled = false; return;
      }
    }

    const summary = done.querySelector('dl');
    const rows = [
      [form.dataset.lDate, `${T.fmtDate(parse(data.date))}　${data.sitting}`],
      [form.dataset.lDate2, data.date2 ? T.fmtDate(parse(data.date2)) : T.none],
      [form.dataset.lParty, T.people(Number(data.party))],
      [form.dataset.lName, data.kana ? `${data.name}（${data.kana}）` : data.name],
      [form.dataset.lContact, `${data.tel}\n${data.email}`],
      [form.dataset.lNotes, data.notes || T.none],
    ];
    summary.replaceChildren(...rows.flatMap(([k, v]) => {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v; dd.style.whiteSpace = 'pre-line';
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
    document.getElementById('form-status').textContent = '';
    lightSeats();
    done.hidden = true;
    form.hidden = false;
    form.date.focus();
  });
})();
