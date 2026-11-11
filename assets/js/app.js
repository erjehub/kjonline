/* ================================================================
   app.js — inti aplikasi: login, kerangka tampilan, navigasi,
   dan fungsi bantu data yang dipakai halaman guru & siswa.
   ================================================================ */
/** Ganti angka ini setiap kali memperbarui aplikasi (juga ?v= di index.html). */
const APP_VERSI = '2026.11.11-5';
const App = { user: null, route: '', sub: {}, actions: {}, timers: [] };
const Pages = { admin: {}, siswa: {} };
const D = () => Store.db;
const SET = () => Store.db.pengaturan;
const isAdmin = () => App.user && App.user.role === 'admin';
const parse = (t, fb = null) => { try { return JSON.parse(t); } catch { return fb; } };

const ROUTES = {
  admin: [['beranda', 'Beranda', 'home'], ['materi', 'Materi', 'book'], ['tugas', 'Tugas & Soal', 'clipboard'], ['penilaian', 'Penilaian', 'award'], ['siswa', 'Data Siswa', 'users'], ['absensi', 'Absensi', 'calendar'], ['pengaturan', 'Pengaturan', 'sliders']],
  siswa: [['beranda', 'Beranda', 'home'], ['absen', 'Absen Harian', 'check'], ['materi', 'Materi', 'book'], ['tugas', 'Tugas', 'clipboard'], ['nilai', 'Nilai Saya', 'award']]
};

/* ---------------- Bantu data ---------------- */
const HADIR = ['Hadir', 'Terlambat'];
const STATUS_ABSEN = ['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alpa'];
const statusCls = s => ({ Hadir: 'ok', Terlambat: 'warn', Izin: 'info', Sakit: 'violet', Alpa: 'bad' }[s] || 'mute');
const pill = (text, cls) => `<span class="pill ${cls}">${esc(text)}</span>`;
const absenPill = s => s ? pill(s, statusCls(s)) : pill('Belum absen', 'mute');

const absenOf = sid => D().absensi[sid] || [];
const recAbsen = (sid, tgl) => absenOf(sid).find(r => r.tanggal === tgl);
const jawabanOf = sid => D().jawaban[sid] || [];
const recJawab = (sid, tid) => jawabanOf(sid).find(j => j.tugasId === tid);
const tugasById = id => D().tugas.find(t => t.id === id);
const siswaById = nisn => D().siswa.find(s => s.nisn === nisn);
const untuk = (item, s) => !item.kelas || item.kelas === 'Semua' || item.kelas === s.kelas;
const targetSiswa = t => D().siswa.filter(s => untuk(t, s));
/* ---------------- Data siswa (NISN = kunci utama) ---------------- */
const KELAS = ['X TJKT 1', 'X TJKT 2', 'XI TJKT 1', 'XI TJKT 2', 'XII TJKT 1', 'XII TJKT 2'];
const kelasUrut = k => { const i = KELAS.indexOf(k); return i < 0 ? 99 : i; };
const daftarKelas = () => [...KELAS, ...[...new Set(D().siswa.map(s => s.kelas))].filter(k => k && !KELAS.includes(k)).sort()];
const kelasOptions = (sel = '', { semua = false, kosong = '' } = {}) =>
  (kosong ? `<option value="" ${sel ? '' : 'selected'} disabled>${esc(kosong)}</option>` : '') +
  (semua ? `<option value="Semua" ${sel === 'Semua' ? 'selected' : ''}>Semua kelas</option>` : '') +
  [...daftarKelas(), ...(sel && sel !== 'Semua' && !daftarKelas().includes(sel) ? [sel] : [])].map(k => `<option ${k === sel ? 'selected' : ''}>${esc(k)}</option>`).join('');
const ttl = s => [s.tempatLahir, s.tanggalLahir ? fmtTgl(s.tanggalLahir, { day: 'numeric', month: 'long', year: 'numeric' }) : ''].filter(Boolean).join(', ');
/** Rapikan kapitalisasi bila diketik semua huruf kecil / semua kapital. */
function rapikanTeks(t) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  if (t !== t.toLowerCase() && t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s.'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}
/** Ubah tanggal "14/03/2010", "14-03-2010" atau "2010-03-14" menjadi "2010-03-14". */
function tanggalISO(t) {
  t = String(t || '').trim(); let m;
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  if ((m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  return '';
}
/** Periksa data siswa. Mengembalikan pesan kesalahan, atau '' bila valid. */
function cekDataSiswa(v, { baru = true } = {}) {
  if (!/^\d{10}$/.test(v.nisn)) return 'NISN harus 10 digit angka.';
  if (baru && D().siswa.some(s => s.nisn === v.nisn)) return `NISN ${v.nisn} sudah terdaftar. Silakan masuk, atau hubungi guru bila lupa sandi.`;
  if (v.nama.length < 3) return 'Nama lengkap minimal 3 huruf.';
  if (!/^[\p{L} .,'-]+$/u.test(v.nama)) return 'Nama lengkap hanya boleh berisi huruf, spasi, titik, atau tanda petik.';
  if (v.tempatLahir.length < 2) return 'Tempat lahir wajib diisi.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.tanggalLahir) || isNaN(toDate(v.tanggalLahir))) return 'Tanggal lahir belum valid.';
  const umur = (Date.now() - toDate(v.tanggalLahir)) / 31557600000;
  if (umur < 10 || umur > 30) return 'Periksa kembali tanggal lahir.';
  if (!v.kelas) return 'Pilih kelas.';
  return '';
}
/** Susun data siswa dengan urutan kolom tetap, diurutkan per kelas lalu nama. */
function rapikanSiswa(list) {
  return (list || []).filter(s => s && s.nisn).map(s => ({
    nisn: String(s.nisn), nama: s.nama, tempatLahir: s.tempatLahir || '', tanggalLahir: s.tanggalLahir || '', kelas: s.kelas,
    passHash: s.passHash, sumber: s.sumber || 'guru', dibuat: s.dibuat || new Date().toISOString(), ...(s.diubah ? { diubah: s.diubah } : {})
  })).sort((a, b) => kelasUrut(a.kelas) - kelasUrut(b.kelas) || String(a.kelas).localeCompare(b.kelas) || a.nama.localeCompare(b.nama, 'id'));
}
const registrasiTerbuka = () => SET().registrasiTerbuka !== false;
const daftarMapel = () => [...new Set([...D().materi, ...D().tugas].map(x => x.mapel).filter(Boolean))].sort();
const me = () => isAdmin() ? SET().admin : siswaById(App.user.id);

/** Rekap absensi siswa dalam rentang tanggal (prefix 'YYYY-MM' atau semua). */
function rekapAbsen(sid, prefix = '') {
  const r = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0 };
  for (const a of absenOf(sid)) if (a.tanggal.startsWith(prefix) && r[a.status] != null) r[a.status]++;
  const total = Object.values(r).reduce((a, b) => a + b, 0);
  r.total = total; r.persen = total ? Math.round((r.Hadir + r.Terlambat) / total * 100) : null;
  return r;
}

/** Hitung nilai tugas: PG otomatis, esai dari kata kunci atau koreksi guru. */
function hitungNilai(t, j) {
  let total = 0, dapat = 0, perluKoreksi = false; const detail = {};
  if (!t || !j) return { nilai: null, detail, perluKoreksi };
  if (t.mode === 'link') return { nilai: j.status === 'dinilai' ? Number(j.nilai) : null, detail, perluKoreksi: j.status !== 'dinilai' };
  const koreksi = j.koreksi || {}, jw = j.jawaban || {};
  for (const q of t.soal || []) {
    const b = Number(q.bobot) || 1; total += b; let s = 0;
    if (q.tipe === 'pg') {
      const ok = jw[q.id] !== undefined && jw[q.id] !== null && Number(jw[q.id]) === Number(q.kunci);
      s = ok ? b : 0; detail[q.id] = { skor: s, benar: ok };
    } else if (koreksi[q.id] != null && koreksi[q.id] !== '') {
      s = Math.max(0, Math.min(b, Number(koreksi[q.id]))); detail[q.id] = { skor: s, manual: true };
    } else if ((q.kataKunci || []).length) {
      const txt = norm(jw[q.id]); const hit = q.kataKunci.filter(k => txt.includes(norm(k)));
      s = round1(b * hit.length / q.kataKunci.length); detail[q.id] = { skor: s, hit, otomatis: true };
    } else { perluKoreksi = true; detail[q.id] = { skor: 0, pending: true }; }
    dapat += s;
  }
  return { nilai: total ? Math.round(dapat / total * 100) : 0, detail, perluKoreksi, total, dapat: round1(dapat) };
}
function statusJ(t, j) {
  if (!j) return 'belum';
  if (j.status === 'dinilai') return 'dinilai';
  if (t && t.mode === 'link') return 'menunggu';
  return hitungNilai(t, j).perluKoreksi ? 'menunggu' : 'otomatis';
}
const STATUS_J = { belum: ['Belum mengumpulkan', 'mute'], menunggu: ['Perlu dikoreksi', 'warn'], otomatis: ['Dinilai otomatis', 'info'], dinilai: ['Sudah dinilai', 'ok'] };
const statusJPill = st => pill(STATUS_J[st][0], STATUS_J[st][1]);
function nilaiBadge(n) {
  if (n == null || isNaN(n)) return '<span class="nilai none">—</span>';
  return `<span class="nilai ${n >= SET().kkm ? 'lulus' : 'remed'}">${n}</span>`;
}
function semuaJawaban() {
  const out = [];
  for (const [sid, list] of Object.entries(D().jawaban)) for (const j of list || []) { const t = tugasById(j.tugasId); if (t && siswaById(sid)) out.push({ sid, j, t }); }
  return out;
}
function acakUrut(arr, seed) {
  let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rnd() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a;
}
const datalist = (id, items) => `<datalist id="${id}">${items.map(x => `<option value="${esc(x)}"></option>`).join('')}</datalist>`;

/* ---------------- Alat tampilan ---------------- */
/** Tampilkan isi halaman. Transisi penuh hanya saat berpindah layar (App.pageChange). */
function view(html, anim = true) {
  const v = $('#view'); if (!v) return;
  const go = anim && App.pageChange;
  const ghost = go ? Motion.leave(v) : null;
  v.innerHTML = html;
  if (go) { Motion.dropGhost(v, ghost); Motion.enter(v, { base: ghost ? 150 : 60 }); }
}
/** Kunci layar: berubah bila menu atau sub-tampilan berubah. */
const screenKey = (r, s = App.sub) => [r, s.edit ? 'edit' : '', s.kerjakan || '', s.hasil || '', s.baca || '', s.tab || '', s.tid || '', s.tgl || '', s.bulan || ''].join('|');
function clearTimers() { App.timers.forEach(clearInterval); App.timers = []; }
async function busy(el, fn) {
  if (el) { el.disabled = true; el.classList.add('is-busy'); }
  try { return await fn(); }
  catch (e) {
    console.error(e); UI.toast(e.message || 'Terjadi kesalahan.', 'bad', 5000);
    if (e.code === 'SESI' && App.user) keluar();
  }
  finally { if (el && el.isConnected) { el.disabled = false; el.classList.remove('is-busy'); } }
}
function val(id, root = document) { const el = root.querySelector('#' + id); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : ''; }
function formErr(root, msg) { const e = root.querySelector('.form-err'); if (e) { e.textContent = msg; e.hidden = !msg; } else if (msg) UI.toast(msg, 'bad'); return !msg; }

/** Keluar dari akun (juga dipakai saat sesi perantara berakhir). */
function keluar() {
  App.user = null; App.sub = {}; App.lastKey = ''; Store.local.del('sesi'); Store.sesi.clear();
  if (Store.mode() === 'proxy') Store.load().catch(() => { }).finally(() => { location.hash = ''; route(); });
  else { location.hash = ''; route(); }
}
const pakaiPerantara = () => Store.mode() === 'proxy';

/* ---------------- Klik terpusat (data-act) ---------------- */
const Global = {
  logout: async () => {
    if (!(await UI.confirm({ title: 'Keluar dari akun?', msg: 'Anda perlu masuk lagi untuk membuka aplikasi.', ok: 'Keluar', danger: false }))) return;
    keluar();
  },
  openSide: () => document.body.classList.add('side-open'),
  closeSide: () => document.body.classList.remove('side-open'),
  togglePw: el => { const i = el.parentElement.querySelector('input'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.innerHTML = icon(show ? 'eyeoff' : 'eye'); },
  reload: el => busy(el, async () => { await Store.load(); route(); UI.toast('Data terbaru dimuat'); }),
  gantiSandi: () => dialogGantiSandi()
};
document.addEventListener('click', e => {
  const a = e.target.closest('.nav a');
  if (a) {
    Global.closeSide();
    // Menu yang sama diklik lagi: kembali ke tampilan utama menu itu.
    if (a.dataset.route === App.route) { e.preventDefault(); App.sub = {}; route(); window.scrollTo(0, 0); return; }
  }
  const el = e.target.closest('[data-act]'); if (!el) return;
  const m = el.closest('.modal'), name = el.dataset.act;
  const fn = (m ? m._actions && m._actions[name] : App.actions[name]) || Global[name];
  if (fn) { e.preventDefault(); fn(el, e); }
});
window.addEventListener('hashchange', () => { App.sub = App.pendingSub || {}; App.pendingSub = null; route(); window.scrollTo(0, 0); });
/** Pindah menu sekaligus membuka sub-tampilan, tanpa transisi ganda. */
function goTo(r, sub = {}) { if (location.hash.slice(1) === r) { App.sub = sub; route(); window.scrollTo(0, 0); } else { App.pendingSub = sub; location.hash = r; } }
window.addEventListener('focus', () => {
  if (!['github', 'proxy'].includes(Store.mode()) || !App.user || Date.now() - Store.lastLoad < 60000) return;
  if (App.sub.kerjakan || document.querySelector('.modal-wrap')) return;
  Store.load().then(route).catch(() => { });
});

/* ---------------- Sesi ---------------- */
function restoreSession() {
  if (pakaiPerantara()) {
    const u = Store.sesi.token && Store.sesi.user;
    App.user = u ? (u.role === 'admin' ? { role: 'admin' } : { role: 'siswa', id: u.id }) : null;
    return;
  }
  const s = parse(Store.local.get('sesi'));
  if (!s) return;
  if (s.role === 'admin') App.user = { role: 'admin' };
  else if (s.role === 'siswa' && siswaById(s.id)) App.user = { role: 'siswa', id: s.id };
}
function cekLogin(u, p) {
  const set = SET(), un = u.trim().toLowerCase();
  if (un === String(set.admin.username).toLowerCase()) return hashPass('admin', p) === set.admin.passHash ? { role: 'admin' } : null;
  const s = siswaById(u.trim());
  return s && hashPass(s.nisn, p) === s.passHash ? { role: 'siswa', id: s.nisn } : null;
}

/* ---------------- Layar masuk ---------------- */
function skyScene() {
  return `<div class="sky-scene" aria-hidden="true"><span class="sun"></span><span class="cloud c1"></span><span class="cloud c2"></span><span class="cloud c3"></span><span class="cloud c4"></span></div>`;
}
function renderLogin() {
  document.body.classList.remove('side-open');
  const set = SET(), mode = Store.mode(), c = Store.conn(), contoh = D().siswa[0];
  $('#app').innerHTML = `
  <div class="login">${skyScene()}
    <div class="login-wrap">
      <section class="login-hero">
        <div class="brand big">${icon('cap')}<span>${esc(set.namaAplikasi)}</span></div>
        <h1>Belajar dari mana saja, hadir setiap hari.</h1>
        <p class="login-school">${esc(set.sekolah)} · Tahun ajaran ${esc(set.tahunAjaran)}</p>
        <ul class="hero-points">
          <li>${icon('book')}<span>Materi tulisan, video, dan dokumen dalam satu tempat</span></li>
          <li>${icon('clipboard')}<span>Soal pilihan ganda &amp; esai, dikoreksi otomatis</span></li>
          <li>${icon('calendar')}<span>Absensi harian tercatat dengan jam masuk</span></li>
        </ul>
      </section>
      <form class="login-card" id="loginForm" autocomplete="on" novalidate>
        <h2>Masuk</h2>
        <p class="muted">Siswa masuk dengan NISN. Guru masuk dengan username.</p>
        <label class="field"><span>NISN atau username guru</span><input id="lg-user" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="mis. 0081234567" required></label>
        <label class="field"><span>Kata sandi</span><div class="pw"><input id="lg-pass" type="password" autocomplete="current-password" required><button type="button" class="icon-btn" data-act="togglePw" aria-label="Tampilkan sandi">${icon('eye')}</button></div></label>
        <p class="form-err" hidden></p>
        <button class="btn primary block lg" type="submit">Masuk ${icon('right')}</button>
        ${registrasiTerbuka() ? `<div class="or"><span>siswa baru?</span></div>
        <a class="btn reg block lg" href="#daftar" id="toRegister">${icon('user')} Daftar akun siswa</a>` : ''}
        ${mode === 'demo'
          ? `<div class="demo-hint"><p><b>Mode demo.</b> Data tersimpan di browser ini saja. Ketuk akun contoh untuk mengisi:</p>
             <div class="demo-acc"><button type="button" class="chip-btn" data-act="fill" data-u="erje" data-p="erje123">${icon('user')} Guru · erje</button>${contoh ? `<button type="button" class="chip-btn" data-act="fill" data-u="${esc(contoh.nisn)}" data-p="siswa123">${icon('user')} Siswa · ${esc(contoh.nisn)}</button>` : ''}</div></div>`
          : mode === 'proxy' ? `<div class="conn-note">${icon('cloud')}<span>Terhubung ke server ${esc(set.sekolah)}</span></div>`
          : `<div class="conn-note">${icon('git')}<span>Data tersimpan di <b>${esc(c.owner)}/${esc(c.repo)}</b></span></div>`}
        <p class="versi">Versi ${APP_VERSI}</p>
      </form>
    </div>
  </div>`;
  App.actions = { fill: el => { $('#lg-user').value = el.dataset.u; $('#lg-pass').value = el.dataset.p; } };
  Motion.login();
  if (App.nisnBaru) { $('#lg-user').value = App.nisnBaru; App.nisnBaru = ''; $('#lg-pass').focus(); }
  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, u = val('lg-user'), p = $('#lg-pass').value;
    if (!u || !p) return formErr(f, 'Isi NISN dan kata sandi.');
    if (pakaiPerantara()) {
      formErr(f, '');
      return busy(f.querySelector('[type=submit]'), async () => {
        try { const su = await Store.masuk(u, p); await Store.load(); masukSebagai(su.role === 'admin' ? { role: 'admin' } : { role: 'siswa', id: su.id }); }
        catch (er) { f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); formErr(f, er.message); }
      });
    }
    const user = cekLogin(u, p);
    if (!user) {
      f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
      return formErr(f, /^\d+$/.test(u) && !siswaById(u) ? 'NISN belum terdaftar. Tekan "Daftar akun siswa" untuk membuat akun.' : 'NISN/username atau kata sandi salah.');
    }
    masukSebagai(user);
  });
}
function masukSebagai(user) {
  App.user = user; Store.local.set('sesi', JSON.stringify(user));
  if (location.hash !== '#beranda') location.hash = 'beranda'; else route();
}

/* ---------------- Layar registrasi siswa ---------------- */
function renderRegister() {
  document.body.classList.remove('side-open');
  const set = SET(), buka = registrasiTerbuka();
  $('#app').innerHTML = `
  <div class="login">${skyScene()}
    <div class="login-wrap reg-wrap">
      <section class="login-hero">
        <div class="brand big">${icon('cap')}<span>${esc(set.namaAplikasi)}</span></div>
        <h1>Buat akun siswa.</h1>
        <p class="login-school">${esc(set.sekolah)} · Tahun ajaran ${esc(set.tahunAjaran)}</p>
        <ol class="hero-steps">
          <li><b>1</b><span>Isi data diri sesuai rapor. NISN ada di kartu pelajar atau rapor.</span></li>
          <li><b>2</b><span>Pilih kelas dan buat kata sandi.</span></li>
          <li><b>3</b><span>Masuk dengan <b>NISN</b> dan kata sandi.</span></li>
        </ol>
      </section>
      ${buka ? `<form class="login-card reg-card" id="regForm" autocomplete="off" novalidate>
        <div class="reg-head"><a class="icon-btn" href="#masuk" aria-label="Kembali ke halaman masuk">${icon('left')}</a><h2>Daftar akun siswa</h2></div>
        <p class="muted">Pastikan data benar. NISN tidak bisa diubah setelah terdaftar.</p>
        <label class="field"><span>NISN <em class="count-hint" id="rg-count">0/10</em></span><input id="rg-nisn" inputmode="numeric" placeholder="10 digit angka" autocomplete="off"></label>
        <p class="hint nisn-hint" id="rg-nisn-hint" hidden></p>
        <label class="field"><span>Nama lengkap</span><input id="rg-nama" autocomplete="name" placeholder="sesuai rapor"></label>
        <div class="row2">
          <label class="field"><span>Tempat lahir</span><input id="rg-tempat" placeholder="mis. Makassar"></label>
          <label class="field"><span>Tanggal lahir</span><input id="rg-tgl" type="date" max="${ymd()}"></label>
        </div>
        <label class="field"><span>Kelas</span><select id="rg-kelas"><option value="" selected disabled>Pilih kelas</option>${KELAS.map(k => `<option>${esc(k)}</option>`).join('')}</select></label>
        <div class="row2">
          <label class="field"><span>Kata sandi</span><div class="pw"><input id="rg-pass" type="password" autocomplete="new-password" placeholder="min. 6 karakter"><button type="button" class="icon-btn" data-act="togglePw" aria-label="Tampilkan sandi">${icon('eye')}</button></div></label>
          <label class="field"><span>Ulangi kata sandi</span><input id="rg-pass2" type="password" autocomplete="new-password"></label>
        </div>
        <p class="form-err" hidden></p>
        <button class="btn primary block lg" type="submit">${icon('check')} Buat akun</button>
        <p class="center muted small">Sudah punya akun? <a href="#masuk">Masuk</a></p>
      </form>`
      : `<div class="login-card"><div class="reg-head"><a class="icon-btn" href="#masuk" aria-label="Kembali">${icon('left')}</a><h2>Pendaftaran ditutup</h2></div>
        <p class="muted">Guru sedang menutup pendaftaran akun mandiri. Minta guru menambahkan akunmu, lalu masuk dengan NISN.</p>
        <a class="btn primary block lg" href="#masuk">Kembali ke halaman masuk</a></div>`}
    </div>
  </div>`;
  App.actions = {};
  Motion.login();
  const f = $('#regForm'); if (!f) return;
  const nisn = $('#rg-nisn'), hint = $('#rg-nisn-hint');
  nisn.addEventListener('input', () => {
    const v = nisn.value.replace(/\D/g, '').slice(0, 10); if (v !== nisn.value) nisn.value = v;
    $('#rg-count').textContent = `${v.length}/10`; $('#rg-count').classList.toggle('done', v.length === 10);
    const ada = v.length === 10 && !pakaiPerantara() && siswaById(v);
    hint.hidden = !ada;
    if (ada) hint.innerHTML = `${icon('alert')} NISN ini sudah terdaftar. <a href="#masuk" data-act="keMasuk">Masuk saja</a>.`;
  });
  App.actions.keMasuk = () => { App.nisnBaru = nisn.value; location.hash = 'masuk'; };
  f.addEventListener('submit', e => {
    e.preventDefault();
    const v = { nisn: nisn.value.trim(), nama: rapikanTeks(val('rg-nama')), tempatLahir: rapikanTeks(val('rg-tempat')), tanggalLahir: val('rg-tgl'), kelas: val('rg-kelas') };
    const p1 = $('#rg-pass').value, p2 = $('#rg-pass2').value;
    const salah = cekDataSiswa(v, { baru: !pakaiPerantara() }) || (p1.length < 6 ? 'Kata sandi minimal 6 karakter.' : p1 !== p2 ? 'Ulangan kata sandi tidak sama.' : '');
    if (salah) { f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); return formErr(f, salah); }
    formErr(f, '');
    busy(f.querySelector('[type=submit]'), async () => {
      if (pakaiPerantara()) {
        try { await Store.daftar(v, p1); } catch (er) { return formErr(f, er.message); }
        return registerSukses(v);
      }
      try {
        await Store.update('siswa.json', l => {
          if ((l || []).some(x => x.nisn === v.nisn)) throw new Error(`NISN ${v.nisn} sudah terdaftar. Silakan masuk, atau hubungi guru bila lupa sandi.`);
          return rapikanSiswa([...(l || []), { ...v, passHash: hashPass(v.nisn, p1), sumber: 'mandiri', dibuat: new Date().toISOString() }]);
        }, `registrasi siswa: ${v.nama} (${v.nisn})`);
      } catch (er) { return formErr(f, er.message); }
      registerSukses(v);
    });
  });
}
function registerSukses(v) {
  const card = $('#regForm'); if (!card) return;
  const box = document.createElement('div');
  box.className = 'login-card reg-card reg-done';
  box.innerHTML = `<div class="done-ic">${icon('check')}</div>
    <h2>Akun berhasil dibuat</h2>
    <p class="muted">Simpan NISN dan kata sandimu. Gunakan keduanya setiap kali masuk.</p>
    <dl class="biodata">
      <div><dt>NISN</dt><dd class="mono">${esc(v.nisn)}</dd></div><div><dt>Kelas</dt><dd>${esc(v.kelas)}</dd></div>
      <div class="wide"><dt>Nama lengkap</dt><dd>${esc(v.nama)}</dd></div>
      <div class="wide"><dt>Tempat, tanggal lahir</dt><dd>${esc(ttl(v))}</dd></div>
    </dl>
    <button class="btn primary block lg" data-act="masukBaru">Masuk ke kelas ${icon('right')}</button>`;
  card.replaceWith(box);
  Motion.pop(box);
  App.actions.masukBaru = el => pakaiPerantara()
    ? busy(el, async () => { await Store.load(); masukSebagai({ role: 'siswa', id: v.nisn }); })
    : masukSebagai({ role: 'siswa', id: v.nisn });
}

/* ---------------- Layar hubungkan perangkat (mode GitHub) ---------------- */
function renderSetup(error) {
  if (pakaiPerantara()) return renderSetupProxy(error);
  const c = Store.conn(), noData = error && error.code === 'NO_DATA';
  $('#app').innerHTML = `
  <div class="login">${skyScene()}
    <div class="login-wrap single">
      <form class="login-card wide" id="setupForm" novalidate>
        <div class="brand">${icon('cap')}<span>Kelas Langit</span></div>
        <h2>${noData ? 'Siapkan data awal' : 'Hubungkan perangkat ini'}</h2>
        ${noData
          ? `<p class="muted">Repositori <b>${esc(c.owner)}/${esc(c.repo)}</b> sudah terhubung, tetapi belum ada data. Tekan tombol di bawah untuk membuat file data awal. Akun guru awal: <b>erje</b> / <b>erje123</b> (segera ganti setelah masuk).</p>
             <button type="button" class="btn primary block lg" data-act="init">${icon('upload')} Buat data awal di GitHub</button>`
          : `<p class="muted">Data aplikasi tersimpan di GitHub. Buka <b>link aktivasi</b> dari guru, atau tempel token akses di bawah. Cukup sekali untuk setiap perangkat.</p>
             ${error ? `<div class="alert bad">${icon('alert')}<span>${esc(error.message)}</span></div>` : ''}
             <div class="row2">
               <label class="field"><span>Pemilik (owner)</span><input id="st-owner" value="${esc(c.owner)}" placeholder="username GitHub"></label>
               <label class="field"><span>Repositori data</span><input id="st-repo" value="${esc(c.repo)}" placeholder="kelas-langit-data"></label>
             </div>
             <div class="row2">
               <label class="field"><span>Branch</span><input id="st-branch" value="${esc(c.branch)}"></label>
               <label class="field"><span>Folder data</span><input id="st-path" value="${esc(c.path)}"></label>
             </div>
             <label class="field"><span>Token akses GitHub</span><div class="pw"><input id="st-token" type="password" placeholder="github_pat_…" autocomplete="off" value="${esc(c.token || '')}"><button type="button" class="icon-btn" data-act="togglePw" aria-label="Tampilkan token">${icon('eye')}</button></div></label>
             <p class="form-err" hidden></p>
             <button class="btn primary block lg" type="submit">${icon('link')} Hubungkan</button>`}
        <button type="button" class="btn ghost block" data-act="demo">Coba mode demo saja</button>
      </form>
    </div>
  </div>`;
  App.actions = {
    demo: () => { Store.setConn({ useDemo: true }); boot(); },
    init: el => busy(el, async () => { await Store.initRepo(); await Store.load(); UI.toast('Data awal dibuat. Masuk sebagai erje / erje123.'); route(); })
  };
  const f = $('#setupForm');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const v = { owner: val('st-owner'), repo: val('st-repo'), branch: val('st-branch') || 'main', path: val('st-path'), token: val('st-token') };
    if (!v.owner || !v.repo || !v.token) return formErr(f, 'Lengkapi owner, repositori, dan token.');
    busy(f.querySelector('[type=submit]'), async () => {
      Store.setConn({ ...v, useDemo: false });
      try { await Store.test(); } catch (er) { return formErr(f, er.message); }
      try { await Store.load(); } catch (er) { return renderSetup(er); }
      UI.toast('Perangkat terhubung ke GitHub'); restoreSession(); route();
    });
  });
}

/** Layar saat server perantara belum siap atau tidak terjangkau. */
function renderSetupProxy(error) {
  const noData = error && error.code === 'NO_DATA';
  $('#app').innerHTML = `
  <div class="login">${skyScene()}
    <div class="login-wrap single">
      <div class="login-card wide">
        <div class="brand">${icon('cap')}<span>Kelas Langit</span></div>
        <h2>${noData ? 'Siapkan data awal' : 'Server belum bisa dihubungi'}</h2>
        ${noData
          ? `<p class="muted">Server sudah tersambung ke repositori data, tetapi datanya masih kosong. Tekan tombol di bawah sekali saja. Akun guru awal: <b>erje</b> / <b>erje123</b> (segera ganti setelah masuk).</p>
             <button type="button" class="btn primary block lg" data-act="initPx">${icon('upload')} Buat data awal</button>`
          : `<div class="alert bad">${icon('alert')}<span>${esc(error ? error.message : 'Tidak ada jawaban dari server.')}</span></div>
             <p class="muted">Periksa koneksi internet, lalu coba lagi. Bila masalah berlanjut, guru perlu memeriksa pengaturan Cloudflare Worker.</p>
             <button type="button" class="btn primary block lg" data-act="ulangPx">${icon('refresh')} Coba lagi</button>`}
        <p class="versi">Versi ${APP_VERSI}</p>
      </div>
    </div>
  </div>`;
  App.actions = {
    initPx: el => busy(el, async () => { await Store.initProxy(); await Store.load(); UI.toast('Data awal dibuat. Masuk sebagai erje / erje123.'); route(); }),
    ulangPx: el => busy(el, async () => boot())
  };
}

/* ---------------- Kerangka aplikasi ---------------- */
function renderShell() {
  const role = App.user.role, set = SET(), u = me();
  $('#app').innerHTML = `
  <div class="shell">
    <aside class="side" id="side">
      <div class="side-top">
        <div class="brand">${icon('cap')}<span>${esc(set.namaAplikasi)}</span></div>
        <button class="icon-btn side-close" data-act="closeSide" aria-label="Tutup menu">${icon('x')}</button>
      </div>
      <p class="side-label">${role === 'admin' ? 'Panel guru' : 'Ruang siswa'}</p>
      <nav class="nav"><span class="nav-ind" aria-hidden="true"></span>${ROUTES[role].map(([k, l, i]) => `<a href="#${k}" data-route="${k}">${icon(i)}<span>${l}</span><em class="nav-badge" data-badge="${k}" hidden></em></a>`).join('')}</nav>
      <div class="side-foot">
        <div class="me">${UI.avatar(u.nama)}<div><b>${esc(u.nama)}</b><small>${role === 'admin' ? 'Guru · @' + esc(set.admin.username) : esc(u.kelas) + ' · NISN ' + esc(u.nisn)}</small></div></div>
        <div class="me-actions">
          ${role === 'siswa' ? `<button class="btn ghost sm" data-act="gantiSandi">${icon('key')} Ubah sandi</button>` : ''}
          <button class="btn ghost sm" data-act="logout">${icon('logout')} Keluar</button>
        </div>
      </div>
    </aside>
    <div class="scrim" data-act="closeSide"></div>
    <main class="main">
      <header class="top">
        <button class="icon-btn burger" data-act="openSide" aria-label="Buka menu">${icon('menu')}</button>
        <div class="top-title"><h1 id="pageTitle"></h1><span class="muted">${fmtTgl(ymd())}</span></div>
        <button class="sync" id="sync" data-act="reload" title="Muat ulang data"></button>
      </header>
      <section id="view" class="view"></section>
    </main>
  </div>`;
  paintSync('saved');
  App.lastKey = ''; App.freshShell = true;
}
function paintSync(s, msg) {
  const el = $('#sync'); if (!el) return;
  const gh = ['github', 'proxy'].includes(Store.mode());
  el.className = 'sync ' + s;
  el.innerHTML = s === 'saving' || s === 'loading' ? `<span class="spin"></span><span>${s === 'loading' ? 'Memuat…' : 'Menyimpan…'}</span>`
    : s === 'error' ? `${icon('alert')}<span>Gagal sinkron</span>`
      : gh ? `${icon('cloud')}<span>${Store.mode() === 'proxy' ? 'Tersimpan di server' : 'Tersimpan di GitHub'}</span>` : `${icon('sun')}<span>Mode demo</span>`;
  el.title = msg || (gh ? 'Ketuk untuk memuat data terbaru' : 'Data tersimpan di browser ini');
}
Store.onStatus(paintSync);

function updateBadges() {
  const set = (k, n) => { const b = $(`[data-badge="${k}"]`); if (b) { b.textContent = n; b.hidden = !n; } };
  if (isAdmin()) set('penilaian', semuaJawaban().filter(x => statusJ(x.t, x.j) === 'menunggu').length);
  else {
    const s = me();
    set('tugas', D().tugas.filter(t => t.terbit && untuk(t, s) && !recJawab(s.nisn, t.id) && !sisaWaktu(t.deadline).lewat).length);
    set('absen', recAbsen(s.nisn, ymd()) ? 0 : '!');
  }
}

function route() {
  clearTimers();
  if (!App.user) return location.hash === '#daftar' ? renderRegister() : renderLogin();
  if (App.user.role === 'siswa' && !siswaById(App.user.id)) { App.user = null; Store.local.del('sesi'); return renderLogin(); }
  if (!$('.shell')) renderShell();
  const list = ROUTES[App.user.role];
  let r = location.hash.slice(1);
  if (!list.some(x => x[0] === r)) r = 'beranda';
  if (App.route !== r) document.body.classList.remove('side-open');
  App.pageChange = screenKey(r) !== App.lastKey;
  App.route = r; App.actions = {};
  const v = $('#view'); v.oninput = v.onchange = null;
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === r));
  $('#pageTitle').textContent = list.find(x => x[0] === r)[1];
  document.title = `${list.find(x => x[0] === r)[1]} · ${SET().namaAplikasi}`;
  updateBadges();
  Pages[App.user.role][r]();
  App.lastKey = screenKey(r);
  if (App.freshShell) { App.freshShell = false; Motion.moveIndicator(true); Motion.shell(); }
  else Motion.moveIndicator();
}

/* ---------------- Ubah sandi siswa ---------------- */
function dialogGantiSandi() {
  const s = me();
  UI.modal({
    title: 'Ubah kata sandi', size: 'sm',
    body: `<label class="field"><span>Sandi lama</span><input id="gs-old" type="password" autocomplete="current-password"></label>
      <label class="field"><span>Sandi baru (min. 6 karakter)</span><input id="gs-new" type="password" autocomplete="new-password"></label>
      <label class="field"><span>Ulangi sandi baru</span><input id="gs-new2" type="password" autocomplete="new-password"></label><p class="form-err" hidden></p>`,
    foot: `<button class="btn ghost" data-act="__close">Batal</button><button class="btn primary" data-act="save">Simpan sandi</button>`,
    actions: {
      save: (el) => {
        const m = el.closest('.modal'), o = val('gs-old', m), n = val('gs-new', m), n2 = val('gs-new2', m);
        if (!pakaiPerantara() && hashPass(s.nisn, o) !== s.passHash) return formErr(m, 'Sandi lama tidak cocok.');
        if (n.length < 6) return formErr(m, 'Sandi baru minimal 6 karakter.');
        if (n !== n2) return formErr(m, 'Ulangan sandi baru tidak sama.');
        if (pakaiPerantara()) return busy(el, async () => {
          try { await Store.gantiSandiSiswa(o, n); } catch (er) { return formErr(m, er.message); }
          m._actions.__close(); UI.toast('Kata sandi diperbarui');
        });
        busy(el, async () => {
          await Store.update('siswa.json', l => { const x = l.find(y => y.nisn === s.nisn); if (x) x.passHash = hashPass(s.nisn, n); return rapikanSiswa(l); }, `ubah sandi siswa ${s.nisn}`);
          m._actions.__close(); UI.toast('Kata sandi diperbarui');
        });
      }
    }
  });
}

/* ---------------- Mulai ---------------- */
async function boot() {
  const activated = pakaiPerantara() ? false : Store.readActivation();
  if (Store.mode() === 'needs-token') return renderSetup();
  try { await Store.load(); }
  catch (e) {
    if (e.code === 'SESI' && pakaiPerantara()) { try { await Store.load(); } catch (e2) { return renderSetup(e2); } }
    else return renderSetup(e);
  }
  restoreSession();
  route();
  if (activated) UI.toast('Perangkat terhubung. Silakan masuk.');
}
document.addEventListener('DOMContentLoaded', boot);
