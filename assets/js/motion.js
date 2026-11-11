/* ================================================================
   motion.js — koreografi transisi antarhalaman.
   Urutan (mengikuti video referensi):
   1. Konten lama memudar + blur, panel kaca sempat kosong.
   2. Judul & kontrol muncul dari blur ke tajam.
   3. Kartu masuk satu per satu (kiri→kanan, atas→bawah).
   4. Isi kartu (baris tabel, daftar) menyusul berurutan.
   5. Angka menghitung naik, batang grafik tumbuh, cincin terisi.
   6. Indikator menu di sidebar meluncur ke menu aktif.
   Semua dimatikan bila pengguna memilih "kurangi gerakan".
   ================================================================ */
const Motion = (() => {
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => innerWidth < 640;
  const EASE = 'cubic-bezier(.2, .8, .2, 1)';
  // Wadah yang dibuka: anak-anaknya dianimasikan satu per satu.
  const EXPAND = '.stats, .cols, .grid-cards, .tlist, .qlist, .settings, .review, .absen-grid, .tsec, .editor, .exam, .reader, .result, .detail-grid';
  // Isi kartu yang menyusul setelah kartunya muncul.
  const INNER = 'tbody > tr, .kpis > .kpi, .people > li, .todo > li, .mini-list > li, .counts > *, .chips-row > *, .opsi > *, .opsi-ed > *, .legend > *, .hero-actions > *, .rv-opsi > li';
  // Angka yang dihitung naik.
  const NUM = '[data-count], .kpi b, .nilai, .bar-v, .count b, .count-chip b, .ring span b, .ring > span, .trow-stat b, .pk-total b';

  function targets(root) {
    const out = [];
    const walk = el => { for (const c of el.children) { if (c.matches(EXPAND)) walk(c); else out.push(c); } };
    walk(root);
    return out;
  }

  /** Masukkan elemen secara berurutan: blur → tajam, naik sedikit. */
  function enter(root, { base = 60, step = 80, max = 28 } = {}) {
    if (reduced() || !root) return;
    const blur = small() ? 6 : 14;
    targets(root).filter(el => !el.classList.contains('view-ghost')).slice(0, max).forEach((el, i) => {
      const d = base + Math.min(i, 14) * step;
      el.animate([
        { opacity: 0, filter: `blur(${blur}px)`, transform: 'translateY(18px) scale(.985)' },
        { opacity: 1, filter: 'blur(0px)', transform: 'none' }
      ], { duration: 760, delay: d, easing: EASE, fill: 'backwards' });
      $$(INNER, el).forEach((c, j) => {
        const k = Math.min(j, 14), soft = j < 14 && !small();
        c.animate([
          { opacity: 0, transform: 'translateY(10px)', ...(soft ? { filter: 'blur(6px)' } : {}) },
          { opacity: 1, transform: 'none', ...(soft ? { filter: 'blur(0px)' } : {}) }
        ], { duration: 560, delay: d + 180 + k * 48, easing: EASE, fill: 'backwards' });
      });
      count(el, d + 180);
    });
  }

  /** Pindahkan konten lama ke "bayangan" yang lalu memudar + blur. */
  function leave(v) {
    if (reduced() || !v.firstElementChild) return null;
    const g = document.createElement('div');
    g.className = 'view view-ghost'; g.setAttribute('aria-hidden', 'true'); g.inert = true;
    g.append(...v.childNodes);
    g.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
    return g;
  }
  function dropGhost(v, g) {
    if (!g) return;
    v.appendChild(g);
    const a = g.animate([
      { opacity: 1, filter: 'blur(0px)', transform: 'none' },
      { opacity: 0, filter: `blur(${small() ? 6 : 12}px)`, transform: 'scale(.985)' }
    ], { duration: 240, easing: 'ease-in', fill: 'forwards' });
    a.finished.then(() => g.remove(), () => g.remove());
  }

  /** Angka berjalan dari 0 ke nilai akhir. */
  function count(root, delay = 0) {
    if (reduced()) return;
    [root, ...$$(NUM, root)].filter(el => el.matches(NUM)).forEach(el => {
      const tn = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.nodeValue));
      if (!tn) return;
      const m = tn.nodeValue.match(/^(\D*?)(\d{1,7})(.*)$/s);
      if (!m) return;
      const end = Number(m[2]); if (!end) return;
      const t0 = performance.now() + delay, dur = 950, fmt = n => m[1] + n + m[3];
      tn.nodeValue = fmt(0);
      const step = t => {
        if (!tn.isConnected) return;
        const p = Math.max(0, Math.min(1, (t - t0) / dur));
        tn.nodeValue = fmt(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /** Satu kartu muncul ulang (mis. pindah nomor soal). */
  function pop(el) {
    if (reduced() || !el) return;
    el.animate([{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(12px) scale(.99)' }, { opacity: 1, filter: 'blur(0px)', transform: 'none' }], { duration: 480, easing: EASE });
    $$(INNER, el).forEach((c, j) => c.animate([{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 90 + j * 45, easing: EASE, fill: 'backwards' }));
  }

  /** Indikator kaca di sidebar meluncur ke menu aktif. */
  function moveIndicator(instant) {
    const ind = $('.nav-ind'), a = $('.nav a.active');
    if (!ind || !a) { if (ind) ind.style.opacity = 0; return; }
    if (instant || reduced()) ind.style.transition = 'none';
    ind.style.transform = `translateY(${a.offsetTop}px)`;
    ind.style.height = a.offsetHeight + 'px';
    ind.style.opacity = 1;
    if (instant || reduced()) { void ind.offsetWidth; ind.style.transition = ''; }
  }

  /** Masuknya kerangka aplikasi setelah login. */
  function shell() {
    if (reduced()) return;
    const main = $('.main'), side = $$('.side .brand, .side-label, .nav a, .side-foot');
    main && main.animate([{ opacity: 0, transform: 'scale(.97)', filter: 'blur(16px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { duration: 700, easing: EASE });
    side.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateX(-14px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { duration: 520, delay: 80 + i * 45, easing: EASE, fill: 'backwards' }));
  }

  /** Masuknya halaman login. */
  function login() {
    if (reduced()) return;
    const items = $$('.login-hero > *, .login-card > *');
    items.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(16px)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { duration: 620, delay: 60 + i * 55, easing: EASE, fill: 'backwards' }));
    const card = $('.login-card');
    card && card.animate([{ opacity: 0, transform: 'translateY(24px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: EASE, fill: 'backwards' });
  }

  return { enter, leave, dropGhost, count, pop, moveIndicator, shell, login };
})();
