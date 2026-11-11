/* ================================================================
   pages-siswa.js — halaman siswa: beranda, absen harian, materi,
   tugas (mengerjakan soal), dan nilai.
   ================================================================ */

function jendelaAbsen() {
  const set = SET(), now = hm();
  if (now < set.bukaAbsen) return { buka: false, pesan: `Absen hari ini dibuka pukul ${set.bukaAbsen}.` };
  if (now > set.tutupAbsen) return { buka: false, pesan: `Absen hari ini sudah ditutup pukul ${set.tutupAbsen}. Hubungi guru bila ada kendala.` };
  return { buka: true, telat: now > set.jamMasuk };
}
/** Nilai yang boleh dilihat siswa (null = belum diumumkan). */
function nilaiTampil(t, j) {
  if (!t || !j) return null;
  if (t.mode === 'link') return j.status === 'dinilai' ? Number(j.nilai) : null;
  const h = hitungNilai(t, j);
  if (j.status === 'dinilai') return h.nilai;
  return t.tampilkanNilai && !h.perluKoreksi ? h.nilai : null;
}
const dibacaKey = () => 'dibaca:' + App.user.id;
const sudahDibaca = () => new Set(parse(Store.local.get(dibacaKey()), []) || []);
function tandaiDibaca(id) { const s = sudahDibaca(); s.add(id); Store.local.set(dibacaKey(), JSON.stringify([...s])); }
const terjawab = v => v !== undefined && v !== null && String(v).trim() !== '';

/* ================= BERANDA ================= */
Pages.siswa.beranda = () => {
  const s = me(), set = SET(), today = ymd(), r = recAbsen(s.nisn, today), win = jendelaAbsen();
  const tugas = D().tugas.filter(t => t.terbit && untuk(t, s));
  const todo = tugas.filter(t => !recJawab(s.nisn, t.id) && !sisaWaktu(t.deadline).lewat).sort((a, b) => a.deadline.localeCompare(b.deadline));
  const selesai = tugas.filter(t => recJawab(s.nisn, t.id)).length;
  const materi = D().materi.filter(m => untuk(m, s));
  const dibaca = sudahDibaca();
  const rk = rekapAbsen(s.nisn, today.slice(0, 7));
  const nilai = tugas.map(t => nilaiTampil(t, recJawab(s.nisn, t.id))).filter(n => n != null);
  const avg = nilai.length ? Math.round(nilai.reduce((a, b) => a + b, 0) / nilai.length) : null;
  const stat = (ic, label, v, sub, href) => `<a class="stat" href="#${href}"><span class="stat-ic">${icon(ic)}</span><span class="stat-v" ${typeof v === 'number' ? `data-count="${v}"` : ''}>${v}</span><span class="stat-l">${label}</span><small>${sub}</small></a>`;
  view(`
  <section class="hero">
    <div class="hero-text">
      <p class="eyebrow">${esc(s.kelas)} · ${esc(set.sekolah)}</p>
      <h2>${sapaan()}, ${esc(s.nama.split(' ')[0])}</h2>
      <p>${r ? `Kamu tercatat <b>${esc(r.status.toLowerCase())}</b> hari ini${r.jam ? ' pukul ' + esc(r.jam) : ''}.` : win.buka ? 'Kamu belum absen hari ini. Yuk catat kehadiranmu dulu.' : esc(win.pesan)}</p>
      <div class="hero-actions">
        ${r ? `<a class="btn glass" href="#absen">${icon('calendar')} Riwayat absen</a>` : `<a class="btn white lg pulse" href="#absen">${icon('check')} Absen sekarang</a>`}
        <a class="btn glass" href="#tugas">${icon('clipboard')} ${todo.length} tugas menunggu</a>
      </div>
    </div>
    <div class="hero-ring">${UI.ring(rk.persen ?? 0, rk.persen == null ? '<b>—</b><small>belum ada data</small>' : `<b>${rk.persen}%</b><small>hadir bulan ini</small>`, 132)}</div>
  </section>
  <div class="stats">
    ${stat('clipboard', 'Tugas selesai', selesai, `dari ${tugas.length} tugas`, 'tugas')}
    ${stat('award', 'Rata-rata nilai', avg ?? '—', `KKM ${set.kkm}`, 'nilai')}
    ${stat('book', 'Materi', materi.length, `${materi.filter(m => dibaca.has(m.id)).length} sudah dibaca`, 'materi')}
    ${stat('calendar', 'Hadir bulan ini', rk.Hadir + rk.Terlambat, `${rk.Terlambat} kali terlambat`, 'absen')}
  </div>
  <div class="cols">
    <section class="card">
      <header class="card-head"><h3>Tugas yang perlu dikerjakan</h3><a class="link" href="#tugas">Semua tugas ${icon('right')}</a></header>
      ${todo.length ? `<ul class="todo">${todo.slice(0, 4).map(t => { const sw = sisaWaktu(t.deadline); return `<li><span class="todo-ic" style="--h:${hueOf(t.mapel)}">${icon(t.mode === 'link' ? 'form' : 'clipboard')}</span><span class="todo-txt"><b>${esc(t.judul)}</b><small class="${sw.mendesak ? 'txt-warn' : ''}">${esc(t.mapel)} · ${sw.teks}</small></span><button class="btn primary sm" data-act="kerjakan" data-id="${t.id}">Kerjakan</button></li>`; }).join('')}</ul>`
        : `<div class="all-good">${icon('check')}<p>Tidak ada tugas yang menunggu. Mantap!</p></div>`}
    </section>
    <section class="card">
      <header class="card-head"><h3>Materi terbaru</h3><a class="link" href="#materi">Semua materi ${icon('right')}</a></header>
      ${materi.length ? `<ul class="todo">${materi.slice(0, 4).map(m => `<li><span class="todo-ic" style="--h:${hueOf(m.mapel)}">${icon(m.tipe === 'link' ? UI.linkInfo(m.link).ic : 'book')}</span><span class="todo-txt"><b>${esc(m.judul)}</b><small>${esc(m.mapel)} · ${fmtTglPendek(m.dibuat)}</small></span>${dibaca.has(m.id) ? pill('Dibaca', 'ok') : `<button class="btn soft sm" data-act="baca" data-id="${m.id}">Baca</button>`}</li>`).join('')}</ul>`
        : UI.empty('book', 'Belum ada materi', 'Materi dari guru akan muncul di sini.')}
    </section>
  </div>`);
  App.actions = {
    kerjakan: el => goTo('tugas', { kerjakan: el.dataset.id }),
    baca: el => { tandaiDibaca(el.dataset.id); goTo('materi', { baca: el.dataset.id }); }
  };
};

/* ================= ABSEN ================= */
function kalender(sid, offset) {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + offset);
  const y = base.getFullYear(), m = base.getMonth(), pre = `${y}-${pad(m + 1)}`;
  const lead = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = ymd();
  const map = Object.fromEntries(absenOf(sid).filter(a => a.tanggal.startsWith(pre)).map(a => [a.tanggal, a]));
  const rk = rekapAbsen(sid, pre);
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="cal-d blank"></span>';
  for (let d = 1; d <= days; d++) {
    const k = `${pre}-${pad(d)}`, a = map[k], sun = new Date(y, m, d).getDay() === 0;
    cells += `<span class="cal-d ${a ? 'st-' + statusCls(a.status) : ''} ${k === today ? 'today' : ''} ${k > today ? 'future' : ''} ${sun ? 'sun' : ''}" title="${a ? esc(`${a.status}${a.jam ? ' · ' + a.jam : ''}${a.keterangan ? ' · ' + a.keterangan : ''}`) : ''}">${d}</span>`;
  }
  return `<header class="cal-head"><button class="icon-btn" data-act="calPrev" aria-label="Bulan sebelumnya">${icon('left')}</button>
      <h3>${base.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
      <button class="icon-btn" data-act="calNext" aria-label="Bulan berikutnya" ${offset >= 0 ? 'disabled' : ''}>${icon('right')}</button></header>
    <div class="cal">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(x => `<span class="cal-w">${x}</span>`).join('')}${cells}</div>
    <div class="legend">${STATUS_ABSEN.map(k => `<span class="lg-i"><i class="dot ${statusCls(k)}"></i>${k} <b>${rk[k]}</b></span>`).join('')}</div>`;
}

/* ---------- Lokasi saat absen ---------- */
const FIX_UMUR = 120000; // posisi dianggap baru selama 2 menit
const FOTO_UMUR = 300000; // foto harus diambil paling lama 5 menit sebelum dikirim
const wajibFoto = () => SET().wajibFoto !== false;
function panelFoto(st) {
  const f = st.foto, hadir = st.pilih === 'Hadir';
  return `<div class="foto-step ${f ? 'ok' : ''}" id="foto-step">
    ${f ? `<img src="${f.url}" alt="Foto absenmu">` : `<span class="foto-ic">${icon('camera')}</span>`}
    <div class="foto-txt">
      <b>${f ? `${icon('check')} Foto siap` : 'Foto wajib'}</b>
      <p>${f ? `Diambil pukul ${hm(new Date(f.waktu))}${f.sumber === 'berkas' ? ' · lewat aplikasi kamera' : f.sumber === 'simulasi' ? ' · foto contoh' : ''}. Berlaku 5 menit.`
        : hadir ? 'Ambil foto selfie wajahmu dengan kamera depan.' : 'Ambil foto selfie, atau foto surat keterangan dengan kamera belakang.'}</p>
      <button type="button" class="btn ${f ? 'ghost' : 'soft'} sm" data-act="foto">${icon('camera')} ${f ? 'Ulangi foto' : 'Ambil foto'}</button>
    </div>
  </div>`;
}
function ambilPosisi(lok, st) {
  if (!window.FORCE_DEMO) return Lokasi.posisi();
  // Pratinjau: lokasi perangkat tidak tersedia, jadi posisi disimulasikan.
  const p = st.sim === 'luar' ? Lokasi.geser(lok, Math.max(lok.radius * 4, 650), 205) : Lokasi.geser(lok, Math.round(lok.radius * .38), 62);
  return sleep(700).then(() => ({ ...p, akurasi: 14, waktu: Date.now() }));
}
function panelLokasi(lok, st) {
  const f = st.fix, nama = esc(lok.nama || 'lokasi absen');
  const kelas = st.lokErr ? 'bad' : !f ? 'idle' : f.ok ? 'ok' : 'bad';
  const judul = st.lokErr ? 'Lokasi tidak terbaca' : !f ? 'Lokasimu belum dicek' : f.ok ? 'Kamu di area absen' : f.lemah ? 'Sinyal GPS lemah' : 'Di luar area absen';
  const isi = st.lokErr ? esc(st.lokErr)
    : !f ? `Absen <b>Hadir</b> hanya bisa dari ${nama}, maksimal ${Lokasi.fmtM(lok.radius)} dari titik absen.`
      : f.ok ? `<b>${Lokasi.fmtM(f.jarak)}</b> dari ${nama} · batas ${Lokasi.fmtM(lok.radius)} · akurasi ±${Lokasi.fmtM(f.akurasi)}`
        : esc(f.alasan);
  return `<div class="lok-card ${kelas}" id="lok-card" aria-live="polite">
    <div class="lok-radar">${Lokasi.radar(lok, f && !st.lokErr ? f : null, { size: 150 })}</div>
    <div class="lok-txt">
      <b class="lok-title">${icon(kelas === 'ok' ? 'check' : kelas === 'bad' ? 'alert' : 'flag')}${judul}</b>
      <p>${isi}</p>
      <button type="button" class="btn soft sm" data-act="cekLokasi">${icon('refresh')} ${f || st.lokErr ? 'Cek ulang lokasi' : 'Cek lokasi saya'}</button>
      ${window.FORCE_DEMO ? `<div class="sim"><span>Simulasi pratinjau:</span>${[['dalam', 'Di sekolah'], ['luar', 'Di luar sekolah']].map(([v, l]) => `<button type="button" class="chip-btn ${(st.sim || 'dalam') === v ? 'on' : ''}" data-act="sim" data-v="${v}">${l}</button>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

Pages.siswa.absen = () => {
  const s = me(), set = SET(), today = ymd(), r = recAbsen(s.nisn, today), win = jendelaAbsen(), st = App.sub;
  st.pilih ??= 'Hadir'; st.cal ??= 0;
  const lok = Lokasi.conf(), pakaiLokasi = Lokasi.siap(lok) && st.pilih === 'Hadir';
  if (st.fix && Date.now() - st.fix.waktu > FIX_UMUR) st.fix = null;
  if (st.foto && Date.now() - st.foto.waktu > FOTO_UMUR) { URL.revokeObjectURL(st.foto.url); st.foto = null; }
  const pakaiFoto = wajibFoto();
  const kurang = pakaiLokasi && !st.fix?.ok ? 'lokasi' : pakaiFoto && !st.foto ? 'foto' : '';
  const riwayat = [...absenOf(s.nisn)].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 6);
  view(`<div class="absen-grid">
    <section class="card absen-card">
      <div class="clock" aria-live="off"><span id="clk">${hm()}</span><small id="clk-s">${pad(new Date().getSeconds())}</small></div>
      <p class="clock-date">${fmtTgl(today)}</p>
      ${r ? `<div class="absen-done c-${statusCls(r.status)}"><div class="done-ic">${icon('check')}</div><h3>Absen hari ini tercatat</h3><p>${absenPill(r.status)}${r.jam ? ` pukul <b class="mono">${esc(r.jam)}</b>` : ''}</p>${r.foto ? `<div class="foto-box done-foto"><img data-foto="${esc(r.foto.path)}" alt="Foto absenmu hari ini"></div>` : ''}${r.lokasi ? `<p class="muted">${icon('pin')} ${Lokasi.fmtM(r.lokasi.jarak)} dari ${esc(lok.nama || 'titik absen')}</p>` : ''}${r.keterangan ? `<p class="muted">${esc(r.keterangan)}</p>` : ''}</div>`
        : win.buka ? `<div class="absen-form">
          <div class="choice" role="radiogroup" aria-label="Status kehadiran">${[['Hadir', 'check'], ['Izin', 'flag'], ['Sakit', 'alert']].map(([k, ic]) => `<button type="button" role="radio" aria-checked="${st.pilih === k}" class="choice-btn c-${statusCls(k)} ${st.pilih === k ? 'on' : ''}" data-act="pilih" data-v="${k}">${icon(ic)}<span>${k}</span></button>`).join('')}</div>
          ${st.pilih !== 'Hadir' ? `<label class="field"><span>Alasan ${st.pilih.toLowerCase()}</span><textarea id="ab-ket" rows="2" placeholder="${st.pilih === 'Sakit' ? 'mis. demam, sudah ke puskesmas' : 'mis. acara keluarga'}"></textarea></label>` : ''}
          ${pakaiLokasi ? panelLokasi(lok, st) : ''}
          ${pakaiFoto ? panelFoto(st) : ''}
          ${st.pilih === 'Hadir' && win.telat ? `<div class="alert warn">${icon('clock')}<span>Sudah lewat pukul ${esc(set.jamMasuk)}, kamu akan tercatat <b>Terlambat</b>.</span></div>` : ''}
          <p class="form-err" hidden></p>
          <button class="btn primary block lg" data-act="kirim">${icon(kurang === 'lokasi' ? 'pin' : kurang === 'foto' ? 'camera' : 'send')} ${kurang === 'lokasi' ? 'Cek lokasi & kirim absen' : kurang === 'foto' ? 'Ambil foto & kirim absen' : 'Kirim absen'}</button></div>`
          : `<div class="absen-closed">${icon('clock')}<p>${esc(win.pesan)}</p></div>`}
      <p class="hint center">Tepat waktu sebelum ${esc(set.jamMasuk)} · absen dibuka ${esc(set.bukaAbsen)}–${esc(set.tutupAbsen)}</p>
    </section>
    <section class="card pad cal-card">${kalender(s.nisn, st.cal)}
      <h4 class="sub-h">Catatan terakhir</h4>
      ${riwayat.length ? `<ul class="mini-list">${riwayat.map(a => `<li><span>${fmtTgl(a.tanggal, { weekday: 'short', day: 'numeric', month: 'short' })}</span><span class="mono muted">${esc(a.jam || '—')}</span><span class="spacer"></span>${absenPill(a.status)}</li>`).join('')}</ul>` : '<p class="muted">Belum ada catatan.</p>'}
    </section>
  </div>`);
  UI.fotos($('#view'));
  App.timers.push(setInterval(() => { const n = new Date(), c = $('#clk'), sc = $('#clk-s'); if (c) c.textContent = hm(n); if (sc) sc.textContent = pad(n.getSeconds()); }, 1000));
  /** Baca posisi, nilai terhadap lokasi absen, tampilkan hasilnya. */
  const cek = async () => {
    st.lokErr = '';
    try { st.fix = Lokasi.nilai(await ambilPosisi(lok, st), lok); }
    catch (e) { st.fix = null; st.lokErr = e.message; }
    route(); Motion.pop($('#lok-card'));
    return st.fix;
  };
  /** Buka kamera; foto dicap nama, NISN, waktu, status, dan jarak. */
  const ambilFoto = async () => {
    const statusCap = st.pilih === 'Hadir' ? (hm() > set.jamMasuk ? 'Terlambat' : 'Hadir') : st.pilih;
    const f = await Kamera.ambil({
      judul: st.pilih === 'Hadir' ? 'Foto selfie absen' : `Foto absen ${st.pilih.toLowerCase()}`, nama: s.nama, depan: true,
      petunjuk: st.pilih === 'Hadir' ? 'Posisikan wajah di dalam bingkai, pastikan cahaya cukup.' : 'Foto wajahmu, atau balik kamera untuk memotret surat keterangan.',
      cap: () => [`${s.nama} · NISN ${s.nisn}`, Kamera.waktuCap(), `${statusCap}${pakaiLokasi && st.fix?.ok ? ` · ${Lokasi.fmtM(st.fix.jarak)} dari ${lok.nama || 'lokasi absen'}` : ''} · ${s.kelas}`, set.sekolah]
    });
    if (!f) return null;
    if (st.foto) URL.revokeObjectURL(st.foto.url);
    st.foto = f; route(); Motion.pop($('#foto-step'));
    return f;
  };
  App.actions = {
    pilih: el => { st.pilih = el.dataset.v; route(); },
    cekLokasi: el => busy(el, cek),
    foto: () => ambilFoto(),
    sim: el => { st.sim = el.dataset.v; st.fix = null; st.lokErr = ''; route(); },
    calPrev: () => { st.cal--; route(); }, calNext: () => { if (st.cal < 0) { st.cal++; route(); } },
    kirim: el => {
      const card = el.closest('.absen-card'), w = jendelaAbsen();
      if (!w.buka) { UI.toast(w.pesan, 'bad'); return route(); }
      const ket = st.pilih !== 'Hadir' ? val('ab-ket') : '';
      if (st.pilih !== 'Hadir' && ket.length < 3) return formErr(card, `Tuliskan alasan ${st.pilih.toLowerCase()} terlebih dahulu.`);
      busy(el, async () => {
        let lokasi = null;
        if (pakaiLokasi) {
          const f = st.fix && Date.now() - st.fix.waktu < FIX_UMUR ? st.fix : await cek();
          if (!f || !f.ok) return; // alasan sudah tampil di panel lokasi
          lokasi = { jarak: Math.round(f.jarak), akurasi: Math.round(f.akurasi), lat: +f.lat.toFixed(5), lng: +f.lng.toFixed(5) };
        }
        const tgl = ymd();
        if (recAbsen(s.nisn, tgl)) throw new Error('Kamu sudah absen hari ini.');
        let foto = null;
        if (pakaiFoto) {
          const fp = st.foto && Date.now() - st.foto.waktu < FOTO_UMUR ? st.foto : await ambilFoto();
          if (!fp) return;
          const path = `foto/${tgl.slice(0, 7)}/${s.nisn}_${tgl}.jpg`;
          await Store.simpanFoto(path, fp.blob, `foto absen ${tgl}: ${s.nama}`);
          foto = { path, sumber: fp.sumber, ukuran: fp.blob.size };
        }
        const jam = hm(), status = st.pilih === 'Hadir' ? (jam > set.jamMasuk ? 'Terlambat' : 'Hadir') : st.pilih;
        await Store.update(`absensi/${s.nisn}.json`, list => {
          list = Array.isArray(list) ? list : [];
          if (list.some(a => a.tanggal === tgl)) throw new Error('Kamu sudah absen hari ini.');
          list.push({ tanggal: tgl, jam, status, keterangan: ket, oleh: 'siswa', ...(lokasi ? { lokasi } : {}), ...(foto ? { foto } : {}) });
          return list.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        }, `absen ${tgl}: ${s.nama} ${status}`);
        st.fix = null; if (st.foto) { st.foto = null; } UI.toast(`Absen tercatat: ${status} pukul ${jam}`); route();
      });
    }
  };
};

/* ================= MATERI ================= */
Pages.siswa.materi = () => {
  const s = me(), st = App.sub;
  if (st.baca) return bacaMateri(st.baca);
  st.q ??= ''; st.mapel ??= '';
  const semua = D().materi.filter(m => untuk(m, s)), mapel = [...new Set(semua.map(m => m.mapel))].sort();
  view(`<div class="toolbar">
      <div class="search">${icon('search')}<input id="q" type="search" placeholder="Cari materi…" value="${esc(st.q)}" aria-label="Cari materi"></div>
      <div class="seg small scroll" id="fm"><button type="button" data-v="" class="${!st.mapel ? 'on' : ''}">Semua</button>${mapel.map(m => `<button type="button" data-v="${esc(m)}" class="${st.mapel === m ? 'on' : ''}">${esc(m)}</button>`).join('')}</div>
    </div><div id="mlist"></div>`);
  const draw = () => {
    const dib = sudahDibaca();
    const items = semua.filter(m => (!st.mapel || m.mapel === st.mapel) && norm(m.judul + ' ' + m.mapel).includes(norm(st.q)));
    $('#mlist').innerHTML = items.length ? `<div class="grid-cards">${items.map(m => materiCard(m, { siswa: true, dibaca: dib.has(m.id) })).join('')}</div>` : UI.empty('book', 'Belum ada materi', st.q || st.mapel ? 'Tidak ada materi yang cocok.' : 'Materi dari guru akan muncul di sini.');
  };
  draw();
  $('#q').addEventListener('input', e => { st.q = e.target.value; draw(); });
  $('#fm').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; st.mapel = b.dataset.v; $$('#fm button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  App.actions = { baca: el => { tandaiDibaca(el.dataset.id); App.sub = { baca: el.dataset.id }; route(); window.scrollTo(0, 0); } };
};
function bacaMateri(id) {
  const m = D().materi.find(x => x.id === id);
  if (!m) { App.sub = {}; return route(); }
  const s = me(), list = D().materi.filter(x => untuk(x, s)), i = list.findIndex(x => x.id === id);
  const nav = (x, dir) => x ? `<button class="navcard ${dir}" data-act="buka" data-id="${x.id}"><small>${dir === 'prev' ? 'Sebelumnya' : 'Berikutnya'}</small><b>${esc(x.judul)}</b></button>` : '<span></span>';
  view(`<article class="reader">
    <button class="btn ghost sm" data-act="back">${icon('left')} Semua materi</button>
    <header class="reader-head" style="--h:${hueOf(m.mapel)}">${UI.mapelChip(m.mapel)}<h2>${esc(m.judul)}</h2><p class="muted">Untuk ${esc(m.kelas || 'semua kelas')} · ${fmtTgl(m.dibuat)}</p></header>
    <div class="card pad reader-body">${materiBody(m)}</div>
    <nav class="reader-nav">${nav(list[i - 1], 'prev')}${nav(list[i + 1], 'next')}</nav>
  </article>`);
  App.actions = {
    back: () => { App.sub = {}; route(); },
    buka: el => { tandaiDibaca(el.dataset.id); App.sub = { baca: el.dataset.id }; route(); window.scrollTo(0, 0); }
  };
}

/* ================= TUGAS ================= */
function tugasCardSiswa(t, s) {
  const j = recJawab(s.nisn, t.id), sw = sisaWaktu(t.deadline), n = nilaiTampil(t, j);
  return `<article class="tcard" style="--h:${hueOf(t.mapel)}">
    <div class="mcard-top">${UI.mapelChip(t.mapel)}<span class="kind">${t.mode === 'link' ? icon('form') + 'Google Form' : icon('list') + t.soal.length + ' soal'}</span></div>
    <h3>${esc(t.judul)}</h3>${t.deskripsi ? `<p class="clamp">${esc(t.deskripsi)}</p>` : ''}
    <div class="tcard-foot">
      ${j ? statusJPill(statusJ(t, j)) : `<span class="due ${sw.lewat ? 'late' : sw.mendesak ? 'urgent' : ''}">${icon('clock')}${sw.lewat ? 'Tenggat lewat · ' + fmtWaktu(t.deadline) : sw.teks}</span>`}
      <span class="spacer"></span>
      ${j ? `${n != null ? nilaiBadge(n) : ''}<button class="btn soft sm" data-act="hasil" data-id="${t.id}">Lihat</button>`
        : sw.lewat ? pill('Terlewat', 'bad') : `<button class="btn primary sm" data-act="kerjakan" data-id="${t.id}">${icon('pen')} Kerjakan</button>`}
    </div></article>`;
}
Pages.siswa.tugas = () => {
  const st = App.sub;
  if (st.kerjakan) return kerjakan(st.kerjakan);
  if (st.hasil) return hasilTugas(st.hasil);
  const s = me(), list = D().tugas.filter(t => t.terbit && untuk(t, s)).sort((a, b) => String(a.deadline).localeCompare(b.deadline));
  const todo = list.filter(t => !recJawab(s.nisn, t.id) && !sisaWaktu(t.deadline).lewat);
  const done = list.filter(t => recJawab(s.nisn, t.id)).reverse();
  const miss = list.filter(t => !recJawab(s.nisn, t.id) && sisaWaktu(t.deadline).lewat);
  const sec = (title, items, emptyMsg) => `<section class="tsec"><h3 class="sec-title">${title} <span class="count">${items.length}</span></h3>${items.length ? `<div class="grid-cards">${items.map(t => tugasCardSiswa(t, s)).join('')}</div>` : `<p class="muted pad-s">${emptyMsg}</p>`}</section>`;
  view(list.length ? sec('Perlu dikerjakan', todo, 'Semua tugas sudah kamu kerjakan.') + sec('Sudah dikumpulkan', done, 'Belum ada tugas yang dikumpulkan.') + (miss.length ? sec('Terlewat', miss, '') : '')
    : UI.empty('clipboard', 'Belum ada tugas', 'Tugas dari guru akan muncul di sini.'));
  App.actions = {
    kerjakan: el => { App.sub = { kerjakan: el.dataset.id }; route(); window.scrollTo(0, 0); },
    hasil: el => { App.sub = { hasil: el.dataset.id }; route(); window.scrollTo(0, 0); }
  };
};

function kerjakan(tid) {
  const s = me(), t = tugasById(tid), st = App.sub;
  if (!t || !t.terbit) { App.sub = {}; return route(); }
  if (recJawab(s.nisn, tid)) { App.sub = { hasil: tid }; return route(); }
  if (sisaWaktu(t.deadline).lewat) { UI.toast('Tenggat tugas ini sudah lewat.', 'bad'); App.sub = {}; return route(); }
  if (t.mode === 'link') return kerjakanLink(t, s);
  const dkey = `draf:${s.nisn}:${t.id}`;
  st.ans ??= parse(Store.local.get(dkey), {}) || {};
  const order = t.acak ? acakUrut(t.soal, s.nisn + t.id) : t.soal, n = order.length;
  st.idx = Math.max(0, Math.min(n - 1, st.idx ?? 0));
  const q = order[st.idx], sw = sisaWaktu(t.deadline);
  const hitung = () => order.filter(x => terjawab(st.ans[x.id])).length;
  const words = v => (String(v || '').trim().match(/\S+/g) || []).length;
  view(`<div class="exam">
    <header class="exam-head">
      <button class="icon-btn" data-act="keluar" aria-label="Kembali ke daftar tugas">${icon('left')}</button>
      <div class="exam-title"><h2>${esc(t.judul)}</h2><small class="${sw.mendesak ? 'txt-warn' : ''}">${esc(t.mapel)} · ${sw.teks}</small></div>
      <div class="exam-prog"><div class="mini-bar"><i id="ex-bar" style="width:${hitung() / n * 100}%"></i></div><small id="ex-cnt">${hitung()}/${n} terjawab</small></div>
    </header>
    ${t.deskripsi && st.idx === 0 ? `<div class="alert info">${icon('flag')}<span>${esc(t.deskripsi)}</span></div>` : ''}
    <nav class="qnav" aria-label="Nomor soal">${order.map((x, i) => `<button class="qn ${i === st.idx ? 'cur' : ''} ${terjawab(st.ans[x.id]) ? 'done' : ''}" data-act="goto" data-i="${i}" id="qn-${x.id}" aria-label="Soal ${i + 1}">${i + 1}</button>`).join('')}</nav>
    <article class="qcard" id="qcard">
      <div class="q-meta"><span class="q-no">Soal ${st.idx + 1}<small>/${n}</small></span>${q.tipe === 'pg' ? pill('Pilihan ganda', 'info') : pill('Esai', 'violet')}<span class="spacer"></span><span class="muted">Bobot ${esc(q.bobot)}</span></div>
      <div class="prose q-ask">${UI.md(q.pertanyaan)}</div>
      ${q.tipe === 'pg'
        ? `<div class="opsi" role="radiogroup" aria-label="Pilihan jawaban">${q.opsi.map((o, k) => { const on = terjawab(st.ans[q.id]) && Number(st.ans[q.id]) === k; return `<label class="opsi-item ${on ? 'on' : ''}"><input type="radio" name="ans-${q.id}" value="${k}" ${on ? 'checked' : ''}><span class="opsi-key">${HURUF[k]}</span><span class="opsi-txt">${esc(o)}</span></label>`; }).join('')}</div>`
        : `<textarea id="ans-essay" rows="8" placeholder="Tulis jawabanmu di sini…">${esc(st.ans[q.id] || '')}</textarea><p class="hint" id="wc">${words(st.ans[q.id])} kata</p>`}
    </article>
    <div class="exam-foot">
      <button class="btn ghost" data-act="prev" ${st.idx === 0 ? 'disabled' : ''}>${icon('left')} Sebelumnya</button>
      <span class="hint hide-sm">${icon('cloud')} Jawaban tersimpan otomatis di perangkat ini</span>
      ${st.idx < n - 1 ? `<button class="btn primary" data-act="next">Berikutnya ${icon('right')}</button>` : `<button class="btn primary" data-act="kumpul">${icon('send')} Kumpulkan</button>`}
    </div>
  </div>`, !st.examRendered);
  if (st.examRendered && st.lastIdx !== st.idx) Motion.pop($('#qcard'));
  st.examRendered = true; st.lastIdx = st.idx;
  const simpanDraf = () => {
    Store.local.set(dkey, JSON.stringify(st.ans));
    const c = hitung(); $('#ex-bar').style.width = (c / n * 100) + '%'; $('#ex-cnt').textContent = `${c}/${n} terjawab`;
    $('#qn-' + q.id)?.classList.toggle('done', terjawab(st.ans[q.id]));
  };
  const card = $('#qcard');
  card.addEventListener('change', e => {
    if (e.target.type !== 'radio') return;
    st.ans[q.id] = Number(e.target.value);
    $$('.opsi-item', card).forEach(l => l.classList.toggle('on', l.contains(e.target)));
    simpanDraf();
  });
  $('#ans-essay')?.addEventListener('input', e => { st.ans[q.id] = e.target.value; $('#wc').textContent = words(e.target.value) + ' kata'; simpanDraf(); });
  const pindah = i => { st.idx = i; route(); $('.exam-head')?.scrollIntoView({ block: 'nearest' }); };
  App.actions = {
    goto: el => pindah(Number(el.dataset.i)), prev: () => pindah(st.idx - 1), next: () => pindah(st.idx + 1),
    keluar: () => { App.sub = {}; route(); UI.toast('Jawaban sementara disimpan di perangkat ini', 'info'); },
    kumpul: async el => {
      const kosong = n - hitung();
      if (!(await UI.confirm({ title: 'Kumpulkan jawaban?', msg: kosong ? `Masih ada <b>${kosong} soal</b> yang belum dijawab. Setelah dikumpulkan, jawaban tidak bisa diubah.` : 'Semua soal sudah dijawab. Setelah dikumpulkan, jawaban tidak bisa diubah.', ok: 'Kumpulkan', danger: false }))) return;
      busy(el, async () => {
        if (sisaWaktu(t.deadline).lewat) throw new Error('Tenggat sudah lewat. Hubungi guru.');
        await Store.update(`jawaban/${s.nisn}.json`, list => {
          list = Array.isArray(list) ? list : [];
          if (list.some(x => x.tugasId === t.id)) throw new Error('Tugas ini sudah pernah dikumpulkan.');
          const rec = { tugasId: t.id, mode: 'app', jawaban: clone(st.ans), koreksi: {}, status: 'terkirim', dikumpulkan: new Date().toISOString() };
          rec.nilai = hitungNilai(t, rec).nilai; list.push(rec); return list;
        }, `kumpul: ${s.nama} - ${t.judul}`);
        Store.local.del(dkey);
        if (pakaiPerantara()) await Store.load().catch(() => { }); // kunci jawaban baru dikirim server setelah mengumpulkan
        App.sub = { hasil: t.id }; route(); window.scrollTo(0, 0);
        UI.toast('Jawaban terkirim. Terima kasih!');
      });
    }
  };
}

function kerjakanLink(t, s) {
  const li = UI.linkInfo(t.link), sw = sisaWaktu(t.deadline);
  view(`<div class="exam">
    <header class="exam-head"><button class="icon-btn" data-act="keluar" aria-label="Kembali">${icon('left')}</button>
      <div class="exam-title"><h2>${esc(t.judul)}</h2><small>${esc(t.mapel)} · ${sw.teks}</small></div></header>
    <section class="card pad">
      ${t.deskripsi ? `<div class="prose">${UI.md(t.deskripsi)}</div>` : ''}
      ${li.embed ? `<div class="embed form"><iframe src="${esc(li.embed)}" title="${esc(t.judul)}" loading="lazy"></iframe></div>` : ''}
      <a class="linkcard" href="${esc(t.link)}" target="_blank" rel="noopener"><span class="linkcard-ic">${icon('form')}</span><span class="linkcard-txt"><b>Buka Google Form</b><small>${esc(t.link)}</small></span>${icon('right')}</a>
      <ol class="steps"><li>Kerjakan soal di Google Form sampai tombol <b>Kirim</b>.</li><li>Kembali ke halaman ini.</li><li>Tekan <b>Saya sudah mengerjakan</b> agar guru tahu kamu sudah selesai.</li></ol>
      <button class="btn primary lg block" data-act="selesai">${icon('check')} Saya sudah mengerjakan</button>
    </section></div>`);
  App.actions = {
    keluar: () => { App.sub = {}; route(); },
    selesai: async el => {
      if (!(await UI.confirm({ title: 'Tandai selesai?', msg: 'Pastikan kamu sudah menekan tombol Kirim di Google Form.', ok: 'Ya, sudah', danger: false }))) return;
      busy(el, async () => {
        await Store.update(`jawaban/${s.nisn}.json`, list => {
          list = Array.isArray(list) ? list : [];
          if (!list.some(x => x.tugasId === t.id)) list.push({ tugasId: t.id, mode: 'link', jawaban: {}, status: 'menunggu', dikumpulkan: new Date().toISOString() });
          return list;
        }, `selesai form: ${s.nama} - ${t.judul}`);
        App.sub = { hasil: t.id }; route(); UI.toast('Ditandai selesai');
      });
    }
  };
}

function hasilTugas(tid) {
  const s = me(), t = tugasById(tid), j = t && recJawab(s.nisn, tid), set = SET();
  if (!t || !j) { App.sub = {}; return route(); }
  const n = nilaiTampil(t, j), h = hitungNilai(t, j), stt = statusJ(t, j), lewat = sisaWaktu(t.deadline).lewat;
  const bolehLihat = t.mode === 'app' && (t.tampilkanNilai || j.status === 'dinilai');
  const pesan = n != null ? (n >= set.kkm ? `Tuntas. Nilaimu memenuhi KKM ${set.kkm}.` : `Belum mencapai KKM ${set.kkm}. Pelajari lagi materinya, ya.`)
    : stt === 'menunggu' ? 'Jawabanmu sudah diterima. Nilai muncul setelah guru selesai memeriksa.' : 'Jawabanmu sudah diterima. Guru akan mengumumkan nilainya.';
  const review = bolehLihat ? t.soal.map((q, i) => {
    const d = h.detail[q.id] || {}, a = (j.jawaban || {})[q.id];
    if (q.tipe === 'pg') return `<div class="rv ${d.benar ? 'ok' : 'bad'}"><div class="rv-head"><span class="qnum">${i + 1}</span>${d.benar ? pill('Benar', 'ok') : pill(terjawab(a) ? 'Salah' : 'Tidak dijawab', 'bad')}<span class="spacer"></span><b>${d.skor}/${q.bobot}</b></div>
      <div class="prose sm">${UI.md(q.pertanyaan)}</div><ul class="rv-opsi">${q.opsi.map((o, k) => `<li class="${terjawab(a) && Number(a) === k ? 'picked ' + (d.benar ? 'right' : '') : ''} ${lewat && k === Number(q.kunci) ? 'key' : ''}"><b>${HURUF[k]}</b><span>${esc(o)}</span>${terjawab(a) && Number(a) === k ? '<em>jawabanmu</em>' : ''}${lewat && k === Number(q.kunci) ? '<em>kunci</em>' : ''}</li>`).join('')}</ul></div>`;
    return `<div class="rv essay"><div class="rv-head"><span class="qnum">${i + 1}</span>${pill('Esai', 'violet')}<span class="spacer"></span><b>${d.pending && j.status !== 'dinilai' ? 'menunggu' : d.skor + '/' + q.bobot}</b></div>
      <div class="prose sm">${UI.md(q.pertanyaan)}</div><div class="answer">${a ? esc(a) : '<span class="muted">Tidak dijawab.</span>'}</div></div>`;
  }).join('') : '';
  view(`<div class="result">
    <button class="btn ghost sm" data-act="back">${icon('left')} Daftar tugas</button>
    <section class="card result-hero">
      <div class="result-score">${n != null ? UI.ring(n, `<b>${n}</b><small>nilai</small>`, 140) : `<div class="wait-ic">${icon(stt === 'menunggu' ? 'clock' : 'check')}</div>`}</div>
      <div class="result-txt">${UI.mapelChip(t.mapel)}<h2>${esc(t.judul)}</h2>
        <p class="meta">${statusJPill(stt)}<span>${j.dikumpulkan ? 'Dikumpulkan ' + fmtWaktu(j.dikumpulkan) : ''}</span></p>
        <p>${pesan}</p>
        ${j.catatan ? `<div class="alert info">${icon('pen')}<span><b>Catatan guru:</b> ${esc(j.catatan)}</span></div>` : ''}</div>
    </section>
    ${review ? `<h3 class="sec-title">Pembahasan jawaban</h3>${!lewat ? '<p class="hint">Kunci jawaban ditampilkan setelah tenggat berakhir.</p>' : ''}<div class="review">${review}</div>` : ''}
  </div>`);
  App.actions = { back: () => { App.sub = {}; route(); } };
}

/* ================= NILAI ================= */
Pages.siswa.nilai = () => {
  const s = me(), set = SET();
  const rows = D().tugas.filter(t => t.terbit && untuk(t, s)).sort((a, b) => String(b.deadline).localeCompare(a.deadline))
    .map(t => { const j = recJawab(s.nisn, t.id); return { t, j, st: statusJ(t, j), n: nilaiTampil(t, j) }; });
  const ada = rows.filter(r => r.n != null), avg = ada.length ? Math.round(ada.reduce((a, r) => a + r.n, 0) / ada.length) : null;
  const tuntas = ada.filter(r => r.n >= set.kkm).length;
  view(`<section class="card pad nilai-head">
      ${UI.ring(avg ?? 0, avg == null ? '—' : `<b>${avg}</b><small>rata-rata</small>`, 120)}
      <div class="kpis">
        <div class="kpi"><span>Tugas dinilai</span><b>${ada.length}</b><small>dari ${rows.length} tugas</small></div>
        <div class="kpi"><span>Tuntas</span><b>${tuntas}</b><small>nilai ≥ KKM ${set.kkm}</small></div>
        <div class="kpi"><span>Perlu perbaikan</span><b>${ada.length - tuntas}</b><small>di bawah KKM</small></div>
      </div>
    </section>
    <section class="card">${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Tugas</th><th>Status</th><th class="num">Nilai</th><th>Keterangan</th></tr></thead><tbody>
      ${rows.map(r => `<tr class="${r.j ? 'click' : ''}" ${r.j ? `data-act="hasil" data-id="${r.t.id}"` : ''}><td><b>${esc(r.t.judul)}</b><small class="block muted">${esc(r.t.mapel)}</small></td><td>${statusJPill(r.st)}</td><td class="num">${nilaiBadge(r.n)}</td>
        <td>${r.n == null ? '<span class="muted">—</span>' : r.n >= set.kkm ? pill('Tuntas', 'ok') : pill('Belum tuntas', 'bad')}</td></tr>`).join('')}
    </tbody></table></div>` : UI.empty('award', 'Belum ada nilai', 'Nilai muncul setelah kamu mengumpulkan tugas.')}</section>`);
  App.actions = { hasil: el => goTo('tugas', { hasil: el.dataset.id }) };
};
