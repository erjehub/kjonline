/* ================================================================
   pages-admin.js — halaman guru (admin "erje").
   Beberapa fungsi materi di sini juga dipakai halaman siswa.
   ================================================================ */

/* ================= MATERI (dipakai bersama) ================= */
function materiCard(m, { siswa = false, dibaca = false } = {}) {
  const li = m.tipe === 'link' ? UI.linkInfo(m.link) : null;
  const kind = li ? `${icon(li.ic)}${li.kind}` : `${icon('pen')}Tulisan`;
  const excerpt = (li ? (m.catatan || li.host) : UI.plain(m.konten)).slice(0, 170);
  return `<article class="mcard" style="--h:${hueOf(m.mapel)}">
    <div class="mcard-top">${UI.mapelChip(m.mapel)}<span class="kind">${kind}</span></div>
    <h3>${esc(m.judul)}</h3>
    <p class="clamp">${esc(UI.plain(excerpt))}</p>
    <div class="mcard-meta"><span>${icon('users')}${esc(m.kelas || 'Semua')}</span><span>${fmtTglPendek(m.dibuat)}</span>${siswa && dibaca ? pill('Sudah dibaca', 'ok') : ''}</div>
    <div class="mcard-act">${siswa
      ? `<button class="btn soft sm" data-act="baca" data-id="${m.id}">${icon('book')} ${dibaca ? 'Baca lagi' : 'Mulai baca'}</button>`
      : `<button class="btn soft sm" data-act="lihat" data-id="${m.id}">${icon('eye')} Lihat</button><span class="spacer"></span><button class="icon-btn" data-act="edit" data-id="${m.id}" title="Edit" aria-label="Edit">${icon('edit')}</button><button class="icon-btn danger" data-act="del" data-id="${m.id}" title="Hapus" aria-label="Hapus">${icon('trash')}</button>`}</div>
  </article>`;
}
function materiBody(m) {
  if (m.tipe !== 'link') return `<div class="prose">${UI.md(m.konten)}</div>`;
  const li = UI.linkInfo(m.link);
  return `${m.catatan ? `<div class="prose note">${UI.md(m.catatan)}</div>` : ''}
    ${li.embed ? `<div class="embed ${li.kind === 'Video' ? 'video' : ''}"><iframe src="${esc(li.embed)}" title="${esc(m.judul)}" loading="lazy" allowfullscreen allow="encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}
    <a class="linkcard" href="${esc(m.link)}" target="_blank" rel="noopener"><span class="linkcard-ic">${icon(li.ic)}</span><span class="linkcard-txt"><b>Buka ${esc(li.kind.toLowerCase())} di tab baru</b><small>${esc(m.link)}</small></span>${icon('right')}</a>`;
}
function lihatMateri(id) {
  const m = D().materi.find(x => x.id === id); if (!m) return;
  UI.modal({ title: m.judul, size: 'lg', autofocus: false, body: `<div class="reader-meta">${UI.mapelChip(m.mapel)}<span>${icon('users')} ${esc(m.kelas || 'Semua')}</span><span>${fmtTglPendek(m.dibuat)}</span></div>${materiBody(m)}` });
}
function wrapSel(ta, before, after = '', ph = 'teks') {
  const s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || ph;
  ta.setRangeText(before + sel + after, s, e, 'end');
  ta.focus(); ta.selectionStart = s + before.length; ta.selectionEnd = s + before.length + sel.length;
  ta.dispatchEvent(new Event('input'));
}
function formMateri(id) {
  const old = id ? D().materi.find(x => x.id === id) : null;
  const m = old ? clone(old) : { tipe: 'teks', kelas: 'Semua', mapel: '', judul: '', konten: '', link: '', catatan: '' };
  let tipe = m.tipe === 'link' ? 'link' : 'teks';
  UI.modal({
    title: id ? 'Edit materi' : 'Tambah materi', size: 'lg',
    body: `
      <label class="field"><span>Judul materi</span><input id="mt-judul" value="${esc(m.judul)}" placeholder="mis. Hukum Newton tentang Gerak"></label>
      <div class="row2">
        <label class="field"><span>Mata pelajaran</span><input id="mt-mapel" list="dl-mapel" value="${esc(m.mapel)}" placeholder="mis. Fisika"></label>
        <label class="field"><span>Untuk kelas</span><select id="mt-kelas">${kelasOptions(m.kelas || 'Semua', { semua: true })}</select></label>
      </div>${datalist('dl-mapel', daftarMapel())}
      <div class="field"><span>Bentuk materi</span>
        <div class="seg" id="mt-tipe"><button type="button" data-v="teks" class="${tipe === 'teks' ? 'on' : ''}">${icon('pen')} Tulis langsung</button><button type="button" data-v="link" class="${tipe === 'link' ? 'on' : ''}">${icon('link')} Link video / dokumen</button></div></div>
      <div id="mt-teks" ${tipe === 'link' ? 'hidden' : ''}>
        <div class="editor-box">
          <div class="md-tools" role="toolbar" aria-label="Format teks">
            <button type="button" data-md="b" title="Tebal"><b>B</b></button><button type="button" data-md="i" title="Miring"><i>I</i></button>
            <button type="button" data-md="h" title="Subjudul">H</button><button type="button" data-md="ul" title="Daftar">${icon('list')}</button>
            <button type="button" data-md="mark" title="Stabilo">==</button><button type="button" data-md="link" title="Tautan">${icon('link')}</button><button type="button" data-md="img" title="Gambar dari link">${icon('image')}</button>
            <span class="spacer"></span><button type="button" data-md="prev" class="prev-btn">${icon('eye')} Pratinjau</button>
          </div>
          <textarea id="mt-konten" rows="12" placeholder="Tulis materi di sini…">${esc(m.konten)}</textarea>
          <div class="prose md-preview" id="mt-prev" hidden></div>
        </div>
        <p class="hint">**tebal**, *miring*, ## subjudul, - daftar, ==stabilo==, [teks](https://…), ![gambar](https://…)</p>
      </div>
      <div id="mt-link" ${tipe === 'teks' ? 'hidden' : ''}>
        <label class="field"><span>Alamat link</span><input id="mt-url" type="url" value="${esc(m.link)}" placeholder="https://youtu.be/…  ·  https://drive.google.com/file/d/…"></label>
        <p class="hint" id="mt-linkinfo">YouTube, Google Drive, Google Docs/Slides, dan PDF tampil langsung di aplikasi. Link lain dibuka di tab baru.</p>
        <label class="field"><span>Petunjuk untuk siswa (opsional)</span><textarea id="mt-catatan" rows="4" placeholder="mis. Tonton sampai menit 12, lalu catat rumusnya.">${esc(m.catatan)}</textarea></label>
      </div>
      <p class="form-err" hidden></p>`,
    foot: `<button class="btn ghost" data-act="__close">Batal</button><button class="btn primary" data-act="save">${icon('check')} Simpan materi</button>`,
    onMount: el => {
      $('#mt-tipe', el).addEventListener('click', e => {
        const b = e.target.closest('[data-v]'); if (!b) return; tipe = b.dataset.v;
        $$('#mt-tipe button', el).forEach(x => x.classList.toggle('on', x === b));
        $('#mt-teks', el).hidden = tipe !== 'teks'; $('#mt-link', el).hidden = tipe !== 'link';
      });
      const ta = $('#mt-konten', el), prev = $('#mt-prev', el);
      $('.md-tools', el).addEventListener('click', e => {
        const b = e.target.closest('[data-md]'); if (!b) return;
        const k = b.dataset.md;
        if (k === 'prev') { const on = prev.hidden; prev.innerHTML = UI.md(ta.value) || '<p class="muted">Belum ada isi.</p>'; prev.hidden = !on; ta.hidden = on; b.classList.toggle('on', on); return; }
        if (k === 'b') wrapSel(ta, '**', '**'); if (k === 'i') wrapSel(ta, '*', '*'); if (k === 'mark') wrapSel(ta, '==', '==');
        if (k === 'h') wrapSel(ta, '\n## ', '\n', 'Subjudul'); if (k === 'ul') wrapSel(ta, '\n- ', '', 'poin');
        if (k === 'link') wrapSel(ta, '[', '](https://)', 'teks tautan'); if (k === 'img') wrapSel(ta, '![', '](https://)', 'keterangan gambar');
      });
      const info = () => { const u = $('#mt-url', el).value.trim(); if (!u) return; const li = UI.linkInfo(u); $('#mt-linkinfo', el).innerHTML = li.ok ? `${icon(li.ic)} Terdeteksi: <b>${esc(li.kind)}</b>${li.embed ? ' · tampil langsung di aplikasi' : ' · dibuka di tab baru'}` : `${icon('alert')} Alamat belum valid. Awali dengan https://`; };
      $('#mt-url', el).addEventListener('input', info); info();
    },
    actions: {
      save: el => {
        const md = el.closest('.modal');
        const judul = val('mt-judul', md), mapel = val('mt-mapel', md), kelas = val('mt-kelas', md) || 'Semua';
        const konten = $('#mt-konten', md).value, url = val('mt-url', md), catatan = $('#mt-catatan', md).value.trim();
        if (!judul) return formErr(md, 'Judul materi wajib diisi.');
        if (!mapel) return formErr(md, 'Mata pelajaran wajib diisi.');
        if (tipe === 'teks' && !konten.trim()) return formErr(md, 'Isi materi masih kosong.');
        if (tipe === 'link' && !UI.linkInfo(url).ok) return formErr(md, 'Link belum valid. Contoh: https://youtu.be/abc123');
        const now = new Date().toISOString(), rid = id || uid('m-');
        busy(el, async () => {
          await Store.update('materi.json', list => {
            const ex = list.find(x => x.id === rid);
            const rec = { ...(ex || {}), id: rid, judul, mapel, kelas, tipe, konten: tipe === 'teks' ? konten : '', link: tipe === 'link' ? url : '', catatan: tipe === 'link' ? catatan : '', dibuat: ex?.dibuat || now, diubah: now };
            if (ex) list[list.indexOf(ex)] = rec; else list.unshift(rec);
            return list;
          }, `materi: ${judul}`);
          md._actions.__close(); UI.toast(id ? 'Materi diperbarui' : 'Materi ditambahkan'); route();
        });
      }
    }
  });
}

Pages.admin.materi = () => {
  const st = App.sub; st.q ??= ''; st.mapel ??= '';
  view(`<div class="toolbar">
      <div class="search">${icon('search')}<input id="q" type="search" placeholder="Cari materi…" value="${esc(st.q)}" aria-label="Cari materi"></div>
      <select id="fmapel" class="select" aria-label="Filter mapel"><option value="">Semua mapel</option>${daftarMapel().map(m => `<option ${m === st.mapel ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>
      <span class="spacer"></span><button class="btn primary" data-act="add">${icon('plus')} Tambah materi</button>
    </div><div id="mlist"></div>`);
  const draw = () => {
    const items = D().materi.filter(m => (!st.mapel || m.mapel === st.mapel) && norm(m.judul + ' ' + m.mapel).includes(norm(st.q)));
    $('#mlist').innerHTML = items.length ? `<div class="grid-cards">${items.map(m => materiCard(m)).join('')}</div>`
      : UI.empty('book', st.q || st.mapel ? 'Tidak ada yang cocok' : 'Belum ada materi', st.q || st.mapel ? 'Coba kata kunci lain.' : 'Tulis materi langsung atau tempel link video YouTube / Google Drive.', `<button class="btn primary" data-act="add">${icon('plus')} Tambah materi</button>`);
  };
  draw();
  $('#q').addEventListener('input', e => { st.q = e.target.value; draw(); });
  $('#fmapel').addEventListener('change', e => { st.mapel = e.target.value; draw(); });
  App.actions = {
    add: () => formMateri(), edit: el => formMateri(el.dataset.id), lihat: el => lihatMateri(el.dataset.id),
    del: async el => {
      const m = D().materi.find(x => x.id === el.dataset.id);
      if (!(await UI.confirm({ title: 'Hapus materi?', msg: `Materi <b>${esc(m.judul)}</b> akan hilang dari daftar siswa.` }))) return;
      busy(null, async () => { await Store.update('materi.json', l => l.filter(x => x.id !== m.id), `hapus materi: ${m.judul}`); UI.toast('Materi dihapus'); route(); });
    }
  };
};

/* ================= BERANDA GURU ================= */
Pages.admin.beranda = () => {
  const d = D(), set = SET(), today = ymd(), siswa = d.siswa, n = siswa.length;
  const st = s => recAbsen(s.nisn, today)?.status;
  const hadir = siswa.filter(s => HADIR.includes(st(s))).length;
  const belum = siswa.filter(s => !st(s));
  const aktif = d.tugas.filter(t => t.terbit && !sisaWaktu(t.deadline).lewat);
  const semua = semuaJawaban();
  const menunggu = semua.filter(x => statusJ(x.t, x.j) === 'menunggu');
  const days = [...Array(7)].map((_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - 6 + i); const k = ymd(dt);
    return { k, v: siswa.filter(s => HADIR.includes(recAbsen(s.nisn, k)?.status)).length, lbl: dt.toLocaleDateString('id-ID', { weekday: 'short' }), tgl: dt.getDate() };
  });
  const recent = semua.filter(x => x.j.dikumpulkan).sort((a, b) => String(b.j.dikumpulkan).localeCompare(a.j.dikumpulkan)).slice(0, 6);
  const stat = (ic, label, v, sub, href) => `<a class="stat" href="#${href}"><span class="stat-ic">${icon(ic)}</span><span class="stat-v" data-count="${v}">${v}</span><span class="stat-l">${label}</span><small>${sub}</small></a>`;
  view(`
  <section class="hero">
    <div class="hero-text">
      <p class="eyebrow">${esc(set.sekolah)}</p>
      <h2>${sapaan()}, ${esc(set.admin.nama)}</h2>
      <p>${hadir} dari ${n} siswa sudah hadir hari ini${menunggu.length ? `, dan ${menunggu.length} jawaban menunggu koreksi Anda` : ''}.</p>
      <div class="hero-actions"><button class="btn white" data-act="newMateri">${icon('plus')} Materi</button><button class="btn white" data-act="newTugas">${icon('plus')} Tugas</button><a class="btn glass" href="#absensi">${icon('calendar')} Absensi hari ini</a></div>
    </div>
    <div class="hero-ring">${UI.ring(n ? hadir / n * 100 : 0, `<b>${hadir}</b><small>dari ${n} hadir</small>`, 132)}</div>
  </section>
  <div class="stats">
    ${stat('users', 'Siswa', n, `${daftarKelas().length} kelas`, 'siswa')}
    ${stat('book', 'Materi', d.materi.length, `${d.materi.filter(m => m.tipe === 'link').length} berupa link`, 'materi')}
    ${stat('clipboard', 'Tugas aktif', aktif.length, `${d.tugas.length} tugas total`, 'tugas')}
    ${stat('pen', 'Perlu dikoreksi', menunggu.length, 'esai & Google Form', 'penilaian')}
  </div>
  <div class="cols">
    <section class="card">
      <header class="card-head"><h3>Kehadiran 7 hari terakhir</h3><span class="muted">jumlah siswa hadir dari ${n}</span></header>
      <div class="bars">${days.map((x, i) => `<div class="bar ${x.k === today ? 'today' : ''}" style="--i:${i}"><span class="bar-v">${x.v}</span><div class="bar-track"><i style="--v:${n ? x.v / n * 100 : 0}%"></i></div><span class="bar-l">${esc(x.lbl)}<small>${x.tgl}</small></span></div>`).join('')}</div>
    </section>
    <section class="card">
      <header class="card-head"><h3>Belum absen hari ini</h3>${pill(String(belum.length), belum.length ? 'warn' : 'ok')}</header>
      ${belum.length ? `<ul class="people">${belum.slice(0, 7).map(s => `<li>${UI.avatar(s.nama, 'sm')}<span><b>${esc(s.nama)}</b><small>${esc(s.kelas)}</small></span></li>`).join('')}</ul>${belum.length > 7 ? `<a class="link more" href="#absensi">+${belum.length - 7} siswa lainnya</a>` : ''}`
        : `<div class="all-good">${icon('check')}<p>Semua siswa sudah tercatat hari ini.</p></div>`}
    </section>
  </div>
  <section class="card">
    <header class="card-head"><h3>Pengumpulan terbaru</h3><a class="link" href="#penilaian">Buka penilaian ${icon('right')}</a></header>
    ${recent.length ? `<div class="table-wrap"><table class="table"><tbody>${recent.map(({ sid, j, t }) => { const s = siswaById(sid), stt = statusJ(t, j); return `<tr><td><div class="who">${UI.avatar(s.nama, 'sm')}<span><b>${esc(s.nama)}</b><small>${esc(s.kelas)}</small></span></div></td><td>${esc(t.judul)}</td><td>${statusJPill(stt)}</td><td class="muted">${fmtWaktu(j.dikumpulkan)}</td><td class="num">${nilaiBadge(hitungNilai(t, j).nilai)}</td></tr>`; }).join('')}</tbody></table></div>`
      : UI.empty('clipboard', 'Belum ada pengumpulan', 'Jawaban siswa akan muncul di sini.')}
  </section>`);
  App.actions = {
    newMateri: () => { location.hash = 'materi'; setTimeout(() => formMateri(), 80); },
    newTugas: () => goTo('tugas', { edit: newTugas() })
  };
};

/* ================= TUGAS & SOAL ================= */
function newTugas() { const d = new Date(); d.setDate(d.getDate() + 7); return { id: '', judul: '', mapel: '', kelas: 'Semua', deskripsi: '', mode: 'app', link: '', deadline: ymd(d) + 'T23:59', terbit: true, acak: false, tampilkanNilai: true, soal: [] }; }
const newPG = () => ({ id: uid('q'), tipe: 'pg', pertanyaan: '', opsi: ['', '', '', ''], kunci: 0, bobot: 1 });
const newEssay = () => ({ id: uid('q'), tipe: 'essay', pertanyaan: '', kataKunci: [], rubrik: '', bobot: 5 });
const HURUF = 'ABCDEF';
function setPath(o, path, v) { const ks = path.split('.'); let x = o; for (let i = 0; i < ks.length - 1; i++) x = x[ks[i]]; x[ks[ks.length - 1]] = v; }

Pages.admin.tugas = () => App.sub.edit ? editorTugas() : daftarTugas();

function daftarTugas() {
  const st = App.sub; st.q ??= ''; st.f ??= '';
  view(`<div class="toolbar">
      <div class="search">${icon('search')}<input id="q" type="search" placeholder="Cari tugas…" value="${esc(st.q)}" aria-label="Cari tugas"></div>
      <div class="seg small" id="tf">${[['', 'Semua'], ['terbit', 'Terbit'], ['draf', 'Draf']].map(([v, l]) => `<button type="button" data-v="${v}" class="${st.f === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <span class="spacer"></span><button class="btn primary" data-act="add">${icon('plus')} Buat tugas</button>
    </div><div id="tlist" class="tlist"></div>`);
  const draw = () => {
    const items = [...D().tugas].sort((a, b) => String(b.dibuat).localeCompare(a.dibuat))
      .filter(t => (!st.f || (st.f === 'terbit') === !!t.terbit) && norm(t.judul + ' ' + t.mapel).includes(norm(st.q)));
    $('#tlist').innerHTML = items.length ? items.map(t => {
      const target = targetSiswa(t), kumpul = target.filter(s => recJawab(s.nisn, t.id)).length, sw = sisaWaktu(t.deadline);
      return `<article class="trow">
        <div class="trow-ic" style="--h:${hueOf(t.mapel)}">${icon(t.mode === 'link' ? 'form' : 'clipboard')}</div>
        <div class="trow-main">
          <div class="trow-title"><h3>${esc(t.judul)}</h3>${t.terbit ? pill('Terbit', 'ok') : pill('Draf', 'mute')}</div>
          <div class="meta">${UI.mapelChip(t.mapel)}<span>${icon('users')}${esc(t.kelas || 'Semua')}</span><span>${t.mode === 'link' ? icon('form') + 'Google Form' : icon('list') + (t.soal || []).length + ' soal'}</span><span class="${sw.lewat ? 'txt-bad' : sw.mendesak ? 'txt-warn' : ''}">${icon('clock')}${fmtWaktu(t.deadline)} · ${sw.teks}</span></div>
        </div>
        <div class="trow-stat"><b>${kumpul}<small>/${target.length}</small></b><span>terkumpul</span><div class="mini-bar"><i style="width:${target.length ? kumpul / target.length * 100 : 0}%"></i></div></div>
        <div class="trow-act"><button class="btn soft sm" data-act="hasil" data-id="${t.id}">${icon('award')} Hasil</button>
          <button class="icon-btn" data-act="edit" data-id="${t.id}" title="Edit" aria-label="Edit">${icon('edit')}</button>
          <button class="icon-btn" data-act="toggle" data-id="${t.id}" title="${t.terbit ? 'Jadikan draf' : 'Terbitkan'}" aria-label="${t.terbit ? 'Jadikan draf' : 'Terbitkan'}">${icon(t.terbit ? 'eyeoff' : 'eye')}</button>
          <button class="icon-btn danger" data-act="del" data-id="${t.id}" title="Hapus" aria-label="Hapus">${icon('trash')}</button></div>
      </article>`;
    }).join('') : UI.empty('clipboard', st.q || st.f ? 'Tidak ada yang cocok' : 'Belum ada tugas', 'Buat soal pilihan ganda dan esai di aplikasi, atau bagikan link Google Form.', `<button class="btn primary" data-act="add">${icon('plus')} Buat tugas</button>`);
  };
  draw();
  $('#q').addEventListener('input', e => { st.q = e.target.value; draw(); });
  $('#tf').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; st.f = b.dataset.v; $$('#tf button').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  App.actions = {
    add: () => { App.sub = { edit: newTugas() }; route(); },
    edit: el => { App.sub = { edit: clone(tugasById(el.dataset.id)) }; route(); },
    hasil: el => { App.pendingTid = el.dataset.id; location.hash = 'penilaian'; },
    toggle: el => busy(el, async () => {
      const t = tugasById(el.dataset.id);
      await Store.update('tugas.json', l => { const x = l.find(y => y.id === t.id); if (x) x.terbit = !x.terbit; return l; }, `${t.terbit ? 'draf' : 'terbit'}: ${t.judul}`);
      UI.toast(t.terbit ? 'Tugas dijadikan draf' : 'Tugas diterbitkan'); route();
    }),
    del: async el => {
      const t = tugasById(el.dataset.id);
      if (!(await UI.confirm({ title: 'Hapus tugas?', msg: `Tugas <b>${esc(t.judul)}</b> dan bank soalnya akan dihapus. Jawaban siswa untuk tugas ini tidak lagi ditampilkan.` }))) return;
      busy(null, async () => { await Store.update('tugas.json', l => l.filter(x => x.id !== t.id), `hapus tugas: ${t.judul}`); UI.toast('Tugas dihapus'); route(); });
    }
  };
}

function qCardEditor(q, i, n) {
  const head = `<header class="qe-head"><span class="qnum">${i + 1}</span>${q.tipe === 'pg' ? pill('Pilihan ganda', 'info') : pill('Esai', 'violet')}
    <label class="bobot">Bobot <input type="number" min="0.5" step="0.5" data-path="soal.${i}.bobot" data-num value="${esc(q.bobot)}"></label><span class="spacer"></span>
    <button class="icon-btn" data-act="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="Naikkan" aria-label="Naikkan">${icon('up')}</button>
    <button class="icon-btn" data-act="down" data-i="${i}" ${i === n - 1 ? 'disabled' : ''} title="Turunkan" aria-label="Turunkan">${icon('down')}</button>
    <button class="icon-btn" data-act="dup" data-i="${i}" title="Gandakan" aria-label="Gandakan">${icon('copy')}</button>
    <button class="icon-btn danger" data-act="delQ" data-i="${i}" title="Hapus soal" aria-label="Hapus soal">${icon('trash')}</button></header>`;
  const tanya = `<textarea class="q-text" data-path="soal.${i}.pertanyaan" rows="2" placeholder="Tulis pertanyaan… (boleh pakai **tebal** atau ![gambar](https://…))">${esc(q.pertanyaan)}</textarea>`;
  const body = q.tipe === 'pg'
    ? `<div class="opsi-ed">${q.opsi.map((o, j) => `<div class="opsi-row ${Number(q.kunci) === j ? 'is-key' : ''}">
          <label class="key-pick" title="Jadikan kunci jawaban"><input type="radio" name="kunci-${q.id}" data-path="soal.${i}.kunci" data-num value="${j}" ${Number(q.kunci) === j ? 'checked' : ''}><span>${HURUF[j]}</span></label>
          <input data-path="soal.${i}.opsi.${j}" value="${esc(o)}" placeholder="Pilihan ${HURUF[j]}" aria-label="Pilihan ${HURUF[j]}">
          <button class="icon-btn" data-act="delOpt" data-i="${i}" data-j="${j}" ${q.opsi.length <= 2 ? 'disabled' : ''} aria-label="Hapus pilihan">${icon('x')}</button></div>`).join('')}
        <div class="opsi-foot">${q.opsi.length < 6 ? `<button class="btn ghost sm" data-act="addOpt" data-i="${i}">${icon('plus')} Pilihan</button>` : ''}<span class="hint">Ketuk huruf untuk menandai jawaban benar.</span></div></div>`
    : `<div class="row2"><label class="field"><span>Kata kunci koreksi otomatis</span><input data-path="soal.${i}.kataKunci" data-list value="${esc((q.kataKunci || []).join(', '))}" placeholder="pisahkan dengan koma"></label>
        <label class="field"><span>Kunci jawaban / rubrik (untuk guru)</span><input data-path="soal.${i}.rubrik" value="${esc(q.rubrik || '')}" placeholder="opsional"></label></div>
        <p class="hint">Skor otomatis = bobot × kata kunci yang ditemukan ÷ jumlah kata kunci. Kosongkan kata kunci bila ingin mengoreksi sendiri.</p>`;
  return `<article class="qe" id="qe-${q.id}">${head}${tanya}${body}</article>`;
}

function editorTugas() {
  const t = App.sub.edit, first = !App.sub.edRendered;
  const ringkas = () => t.mode === 'app' ? `${t.soal.length} soal · total bobot ${round1(t.soal.reduce((a, q) => a + (Number(q.bobot) || 0), 0))}` : 'Dikerjakan lewat Google Form';
  view(`<div class="editor">
    <div class="ed-head"><button class="btn ghost sm" data-act="back">${icon('left')} Daftar tugas</button><h2>${t.id ? 'Edit tugas' : 'Tugas baru'}</h2></div>
    <section class="card pad ed-meta">
      <label class="field"><span>Judul tugas</span><input id="ed-judul" data-path="judul" value="${esc(t.judul)}" placeholder="mis. Ulangan Harian Bab 2"></label>
      <div class="row3">
        <label class="field"><span>Mata pelajaran</span><input data-path="mapel" list="dl-mapel" value="${esc(t.mapel)}" placeholder="mis. Fisika"></label>
        <label class="field"><span>Untuk kelas</span><select data-path="kelas">${kelasOptions(t.kelas || 'Semua', { semua: true })}</select></label>
        <label class="field"><span>Tenggat</span><input type="datetime-local" data-path="deadline" value="${esc(t.deadline)}"></label>
      </div>${datalist('dl-mapel', daftarMapel())}
      <label class="field"><span>Petunjuk pengerjaan</span><textarea data-path="deskripsi" rows="2" placeholder="mis. Kerjakan mandiri, waktu 45 menit.">${esc(t.deskripsi)}</textarea></label>
      <div class="field"><span>Cara mengerjakan</span><div class="seg"><button type="button" data-act="mode" data-v="app" class="${t.mode === 'app' ? 'on' : ''}">${icon('list')} Soal di aplikasi</button><button type="button" data-act="mode" data-v="link" class="${t.mode === 'link' ? 'on' : ''}">${icon('form')} Link Google Form</button></div></div>
      ${t.mode === 'link' ? `<label class="field"><span>Link Google Form</span><input type="url" data-path="link" value="${esc(t.link)}" placeholder="https://docs.google.com/forms/d/…/viewform"></label>
        <p class="hint">Aktifkan <b>Setelan → Jadikan kuis</b> di Google Form agar Form mengoreksi sendiri. Salin nilainya ke menu Penilaian.</p>` : ''}
      <div class="toggles">
        <label class="toggle"><input type="checkbox" data-path="terbit" ${t.terbit ? 'checked' : ''}><span class="tg"></span>Terbitkan ke siswa</label>
        ${t.mode === 'app' ? `<label class="toggle"><input type="checkbox" data-path="acak" ${t.acak ? 'checked' : ''}><span class="tg"></span>Acak urutan soal</label>
        <label class="toggle"><input type="checkbox" data-path="tampilkanNilai" ${t.tampilkanNilai ? 'checked' : ''}><span class="tg"></span>Siswa langsung melihat nilai</label>` : ''}
      </div>
    </section>
    ${t.mode === 'app' ? `<div class="qlist">${t.soal.map((q, i) => qCardEditor(q, i, t.soal.length)).join('') || `<div class="card">${UI.empty('list', 'Belum ada soal', 'Tambahkan soal pilihan ganda atau esai di bawah.')}</div>`}</div>
      <div class="qadd"><button class="btn soft" data-act="addPg">${icon('plus')} Soal pilihan ganda</button><button class="btn soft" data-act="addEssay">${icon('plus')} Soal esai</button></div>` : ''}
    <div class="ed-foot"><span class="muted" id="ed-ringkas">${ringkas()}</span><span class="spacer"></span><button class="btn ghost" data-act="back">Batal</button><button class="btn primary" data-act="save">${icon('check')} Simpan tugas</button></div>
  </div>`, first);
  App.sub.edRendered = true;
  const v = $('#view');
  v.oninput = v.onchange = e => {
    const el = e.target, p = el.dataset.path; if (!p) return;
    if (el.type === 'radio' && !el.checked) return;
    let x = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.num !== undefined) x = Number(x);
    if (el.dataset.list !== undefined) x = String(x).split(',').map(s => s.trim()).filter(Boolean);
    setPath(t, p, x); App.sub.dirty = true;
    if (el.type === 'radio') $$('.opsi-row', el.closest('.opsi-ed')).forEach((r, j) => r.classList.toggle('is-key', j === x));
    const r = $('#ed-ringkas'); if (r) r.textContent = ringkas();
  };
  const rerender = (focusId) => { route(); if (focusId) { const c = $('#qe-' + focusId); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('textarea', c)?.focus(), 250); } } };
  const I = el => Number(el.dataset.i);
  App.actions = {
    back: async () => {
      if (App.sub.dirty && !(await UI.confirm({ title: 'Tinggalkan editor?', msg: 'Perubahan yang belum disimpan akan hilang.', ok: 'Tinggalkan' }))) return;
      App.sub = {}; route();
    },
    mode: el => { t.mode = el.dataset.v; App.sub.dirty = true; route(); },
    addPg: () => { const q = newPG(); t.soal.push(q); App.sub.dirty = true; rerender(q.id); },
    addEssay: () => { const q = newEssay(); t.soal.push(q); App.sub.dirty = true; rerender(q.id); },
    up: el => { const i = I(el); [t.soal[i - 1], t.soal[i]] = [t.soal[i], t.soal[i - 1]]; App.sub.dirty = true; route(); },
    down: el => { const i = I(el); [t.soal[i + 1], t.soal[i]] = [t.soal[i], t.soal[i + 1]]; App.sub.dirty = true; route(); },
    dup: el => { const i = I(el), q = { ...clone(t.soal[i]), id: uid('q') }; t.soal.splice(i + 1, 0, q); App.sub.dirty = true; rerender(q.id); },
    delQ: async el => {
      const i = I(el);
      if (t.soal[i].pertanyaan && !(await UI.confirm({ title: `Hapus soal nomor ${i + 1}?`, msg: esc(UI.plain(t.soal[i].pertanyaan).slice(0, 120)) }))) return;
      t.soal.splice(i, 1); App.sub.dirty = true; route();
    },
    addOpt: el => { t.soal[I(el)].opsi.push(''); App.sub.dirty = true; route(); },
    delOpt: el => {
      const q = t.soal[I(el)], j = Number(el.dataset.j);
      q.opsi.splice(j, 1); if (Number(q.kunci) === j) q.kunci = 0; else if (Number(q.kunci) > j) q.kunci = Number(q.kunci) - 1;
      App.sub.dirty = true; route();
    },
    save: el => {
      const e = m => { UI.toast(m, 'bad', 4500); return false; };
      t.judul = String(t.judul || '').trim(); t.mapel = String(t.mapel || '').trim(); t.kelas = String(t.kelas || '').trim() || 'Semua';
      if (!t.judul) { $('#ed-judul').focus(); return e('Judul tugas wajib diisi.'); }
      if (!t.mapel) return e('Mata pelajaran wajib diisi.');
      if (!t.deadline) return e('Tentukan tenggat pengumpulan.');
      if (t.mode === 'link') { if (!UI.linkInfo(t.link).ok) return e('Link Google Form belum valid.'); t.soal = []; }
      else {
        if (!t.soal.length) return e('Tambahkan minimal satu soal.');
        for (const [i, q] of t.soal.entries()) {
          if (!String(q.pertanyaan).trim()) return e(`Pertanyaan nomor ${i + 1} masih kosong.`);
          if (!(Number(q.bobot) > 0)) return e(`Bobot soal nomor ${i + 1} harus lebih dari 0.`);
          if (q.tipe === 'pg' && q.opsi.some(o => !String(o).trim())) return e(`Ada pilihan jawaban kosong di soal nomor ${i + 1}.`);
        }
      }
      const isNew = !t.id; if (isNew) { t.id = uid('t-'); t.dibuat = new Date().toISOString(); }
      t.diubah = new Date().toISOString();
      busy(el, async () => {
        try {
          await Store.update('tugas.json', l => { const i = l.findIndex(x => x.id === t.id); if (i >= 0) l[i] = clone(t); else l.unshift(clone(t)); return l; }, `${isNew ? 'tugas baru' : 'ubah tugas'}: ${t.judul}`);
        } catch (er) { if (isNew) t.id = ''; throw er; }
        App.sub = {}; UI.toast(isNew ? 'Tugas dibuat' : 'Tugas disimpan'); route();
      });
    }
  };
}

/* ================= PENILAIAN ================= */
Pages.admin.penilaian = () => {
  const st = App.sub, set = SET();
  if (App.pendingTid) { st.tid = App.pendingTid; App.pendingTid = null; }
  st.kelas ??= '';
  const list = [...D().tugas].sort((a, b) => String(b.dibuat).localeCompare(a.dibuat));
  if (!list.length) return view(UI.empty('award', 'Belum ada tugas', 'Buat tugas di menu Tugas & Soal. Jawaban siswa akan muncul di sini untuk dinilai.', `<a class="btn primary" href="#tugas">${icon('plus')} Buat tugas</a>`));
  if (!st.tid || !tugasById(st.tid)) st.tid = list[0].id;
  const t = tugasById(st.tid);
  const rows = targetSiswa(t).filter(s => !st.kelas || s.kelas === st.kelas).sort((a, b) => a.nama.localeCompare(b.nama))
    .map(s => { const j = recJawab(s.nisn, t.id); return { s, j, st: statusJ(t, j), nilai: j ? hitungNilai(t, j).nilai : null }; });
  const ada = rows.filter(r => r.nilai != null), vals = ada.map(r => r.nilai);
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  const kumpul = rows.filter(r => r.j).length;
  const kelasT = [...new Set(targetSiswa(t).map(s => s.kelas))].sort();
  const box = (l, v, sub = '') => `<div class="kpi"><span>${l}</span><b>${v ?? '—'}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  view(`<div class="toolbar">
      <select id="pn-t" class="select grow" aria-label="Pilih tugas">${list.map(x => `<option value="${x.id}" ${x.id === t.id ? 'selected' : ''}>${esc(x.judul)} · ${esc(x.mapel)}</option>`).join('')}</select>
      <select id="pn-k" class="select" aria-label="Filter kelas"><option value="">Semua kelas</option>${kelasT.map(k => `<option ${k === st.kelas ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
      <button class="btn ghost" data-act="csv">${icon('download')} Ekspor CSV</button>
    </div>
    <section class="card pad pn-head">
      <div class="pn-title">${UI.mapelChip(t.mapel)}<h2>${esc(t.judul)}</h2><p class="muted">${t.mode === 'link' ? 'Google Form · nilai dimasukkan guru' : `${t.soal.length} soal · PG dinilai otomatis${t.soal.some(q => q.tipe === 'essay') ? ', esai perlu diperiksa' : ''}`} · tenggat ${fmtWaktu(t.deadline)}</p></div>
      <div class="kpis">${box('Terkumpul', `${kumpul}/${rows.length}`)}${box('Rata-rata', avg)}${box('Tertinggi', vals.length ? Math.max(...vals) : null)}${box('Terendah', vals.length ? Math.min(...vals) : null)}${box(`Tuntas (KKM ${set.kkm})`, `${vals.filter(v => v >= set.kkm).length}/${vals.length}`)}</div>
    </section>
    <section class="card">${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Siswa</th><th>Status</th><th>Dikumpulkan</th><th class="num">Nilai</th><th class="act"></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><div class="who">${UI.avatar(r.s.nama, 'sm')}<span><b>${esc(r.s.nama)}</b><small>${esc(r.s.kelas)} · NISN ${esc(r.s.nisn)}</small></span></div></td>
        <td>${statusJPill(r.st)}</td><td class="muted">${r.j?.dikumpulkan ? fmtWaktu(r.j.dikumpulkan) : '—'}</td><td class="num">${nilaiBadge(r.nilai)}</td>
        <td class="act">${t.mode === 'link' ? `<button class="btn soft sm" data-act="nilaiLink" data-sid="${r.s.nisn}">${icon('edit')} Input nilai</button>`
          : r.j ? `<button class="btn ${r.st === 'menunggu' ? 'primary' : 'soft'} sm" data-act="periksa" data-sid="${r.s.nisn}">${icon('pen')} Periksa</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : UI.empty('users', 'Tidak ada siswa sasaran', 'Tugas ini belum punya siswa di kelas yang dipilih.')}</section>`);
  $('#pn-t').addEventListener('change', e => { st.tid = e.target.value; st.kelas = ''; route(); });
  $('#pn-k').addEventListener('change', e => { st.kelas = e.target.value; route(); });
  App.actions = {
    periksa: el => dialogPeriksa(t, siswaById(el.dataset.sid)),
    nilaiLink: el => dialogNilaiLink(t, siswaById(el.dataset.sid)),
    csv: () => UI.exportText(`nilai-${t.judul.replace(/\W+/g, '-').toLowerCase()}.csv`, UI.csv([['NISN', 'Nama', 'Kelas', 'Status', 'Dikumpulkan', 'Nilai', 'KKM', 'Keterangan'],
      ...rows.map(r => [r.s.nisn, r.s.nama, r.s.kelas, STATUS_J[r.st][0], r.j?.dikumpulkan ? fmtWaktu(r.j.dikumpulkan) : '', r.nilai ?? '', set.kkm, r.nilai == null ? '' : r.nilai >= set.kkm ? 'Tuntas' : 'Belum tuntas'])]))
  };
};

function dialogPeriksa(t, s) {
  const j = recJawab(s.nisn, t.id); if (!j) return;
  const h0 = hitungNilai(t, j), jw = j.jawaban || {};
  const items = t.soal.map((q, i) => {
    const d = h0.detail[q.id] || {}, b = Number(q.bobot) || 1;
    if (q.tipe === 'pg') {
      const a = jw[q.id];
      return `<div class="rv ${d.benar ? 'ok' : 'bad'}"><div class="rv-head"><span class="qnum">${i + 1}</span>${pill('PG', 'info')}<span class="spacer"></span><b>${d.skor}/${b}</b></div>
        <div class="prose sm">${UI.md(q.pertanyaan)}</div>
        <ul class="rv-opsi">${q.opsi.map((o, k) => `<li class="${k === Number(q.kunci) ? 'key' : ''} ${a != null && k === Number(a) ? 'picked' : ''}"><b>${HURUF[k]}</b><span>${esc(o)}</span>${k === Number(q.kunci) ? '<em>kunci</em>' : ''}${a != null && k === Number(a) ? '<em>dipilih</em>' : ''}</li>`).join('')}</ul>
        ${a == null ? '<p class="hint">Tidak dijawab.</p>' : ''}</div>`;
    }
    const txt = norm(jw[q.id]);
    return `<div class="rv essay"><div class="rv-head"><span class="qnum">${i + 1}</span>${pill('Esai', 'violet')}<span class="spacer"></span>
        <label class="skor">Skor <input type="number" min="0" max="${b}" step="0.5" data-q="${q.id}" value="${d.skor ?? 0}"> / ${b}</label></div>
      <div class="prose sm">${UI.md(q.pertanyaan)}</div>
      <div class="answer">${jw[q.id] ? esc(jw[q.id]) : '<span class="muted">Tidak dijawab.</span>'}</div>
      ${(q.kataKunci || []).length ? `<div class="kw">${q.kataKunci.map(k => `<span class="kwc ${txt.includes(norm(k)) ? 'hit' : ''}">${txt.includes(norm(k)) ? icon('check') : icon('x')}${esc(k)}</span>`).join('')}</div>` : '<p class="hint">Tanpa kata kunci: beri skor manual.</p>'}
      ${q.rubrik ? `<p class="rubrik"><b>Rubrik:</b> ${esc(q.rubrik)}</p>` : ''}</div>`;
  }).join('');
  UI.modal({
    title: 'Periksa jawaban', size: 'lg', autofocus: false,
    body: `<div class="pk-who">${UI.avatar(s.nama)}<div><b>${esc(s.nama)}</b><small>${esc(s.kelas)} · ${esc(t.judul)} · dikumpulkan ${fmtWaktu(j.dikumpulkan)}</small></div></div>
      ${items}<label class="field"><span>Catatan untuk siswa (opsional)</span><textarea id="pk-cat" rows="2">${esc(j.catatan || '')}</textarea></label>`,
    foot: `<button class="btn ghost danger-text" data-act="reset">${icon('refresh')} Minta kerjakan ulang</button><span class="spacer"></span><span class="pk-total">Nilai <b id="pk-n">${h0.nilai}</b></span><button class="btn primary" data-act="save">${icon('check')} Simpan nilai</button>`,
    onMount: el => {
      el.addEventListener('input', e => {
        if (!e.target.dataset.q) return;
        const kor = {}; $$('[data-q]', el).forEach(i => kor[i.dataset.q] = i.value);
        $('#pk-n', el).textContent = hitungNilai(t, { ...j, koreksi: kor }).nilai;
      });
    },
    actions: {
      save: el => {
        const m = el.closest('.modal'), kor = {};
        $$('[data-q]', m).forEach(i => { const q = t.soal.find(x => x.id === i.dataset.q); kor[i.dataset.q] = Math.max(0, Math.min(Number(q.bobot) || 1, Number(i.value) || 0)); });
        busy(el, async () => {
          await Store.update(`jawaban/${s.nisn}.json`, l => {
            const r = (l || []).find(x => x.tugasId === t.id); if (!r) throw new Error('Jawaban siswa tidak ditemukan. Muat ulang data.');
            r.koreksi = kor; r.catatan = val('pk-cat', m); r.status = 'dinilai'; r.dinilai = new Date().toISOString(); r.nilai = hitungNilai(t, r).nilai; return l;
          }, `nilai: ${s.nama} - ${t.judul}`);
          m._actions.__close(); UI.toast(`Nilai ${s.nama} disimpan`); route();
        });
      },
      reset: async el => {
        const m = el.closest('.modal');
        if (!(await UI.confirm({ title: 'Minta kerjakan ulang?', msg: `Jawaban <b>${esc(s.nama)}</b> untuk tugas ini dihapus sehingga siswa bisa mengerjakan lagi.`, ok: 'Hapus jawaban' }))) return;
        busy(null, async () => { await Store.update(`jawaban/${s.nisn}.json`, l => (l || []).filter(x => x.tugasId !== t.id), `ulang: ${s.nama} - ${t.judul}`); m._actions.__close(); UI.toast('Siswa dapat mengerjakan ulang'); route(); });
      }
    }
  });
}

function dialogNilaiLink(t, s) {
  const j = recJawab(s.nisn, t.id);
  UI.modal({
    title: 'Input nilai Google Form', size: 'sm',
    body: `<div class="pk-who">${UI.avatar(s.nama)}<div><b>${esc(s.nama)}</b><small>${esc(t.judul)}${j?.dikumpulkan ? ' · ditandai selesai ' + fmtWaktu(j.dikumpulkan) : ' · belum menandai selesai'}</small></div></div>
      <label class="field"><span>Nilai (0–100)</span><input id="nl-n" type="number" min="0" max="100" step="1" inputmode="numeric" value="${j?.status === 'dinilai' ? esc(j.nilai) : ''}"></label>
      <label class="field"><span>Catatan (opsional)</span><textarea id="nl-c" rows="2">${esc(j?.catatan || '')}</textarea></label><p class="form-err" hidden></p>`,
    foot: `<button class="btn ghost" data-act="__close">Batal</button><button class="btn primary" data-act="save">Simpan nilai</button>`,
    actions: {
      save: el => {
        const m = el.closest('.modal'), n = Number(val('nl-n', m));
        if (val('nl-n', m) === '' || isNaN(n) || n < 0 || n > 100) return formErr(m, 'Masukkan nilai antara 0 dan 100.');
        busy(el, async () => {
          await Store.update(`jawaban/${s.nisn}.json`, l => {
            l = Array.isArray(l) ? l : []; let r = l.find(x => x.tugasId === t.id);
            if (!r) { r = { tugasId: t.id, mode: 'link', jawaban: {}, dikumpulkan: null }; l.push(r); }
            Object.assign(r, { nilai: Math.round(n), catatan: val('nl-c', m), status: 'dinilai', dinilai: new Date().toISOString() }); return l;
          }, `nilai form: ${s.nama} - ${t.judul}`);
          m._actions.__close(); UI.toast('Nilai disimpan'); route();
        });
      }
    }
  });
}

/* ================= DATA SISWA ================= */
function rataNilai(nisn) {
  const v = jawabanOf(nisn).map(j => hitungNilai(tugasById(j.tugasId), j).nilai).filter(n => n != null && !isNaN(n));
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
const sumberPill = s => s.sumber === 'mandiri' ? pill('Daftar sendiri', 'info') : pill('Ditambah guru', 'mute');
/** Ambil isian form siswa, sudah dirapikan. */
const isianSiswa = m => ({ nisn: val('fs-nisn', m).replace(/\D/g, ''), nama: rapikanTeks(val('fs-nama', m)), tempatLahir: rapikanTeks(val('fs-tempat', m)), tanggalLahir: val('fs-tgl', m), kelas: val('fs-kelas', m) });

Pages.admin.siswa = () => {
  const st = App.sub; st.q ??= ''; st.kelas ??= '';
  const bulan = ymd().slice(0, 7), semua = rapikanSiswa(D().siswa);
  const perKelas = daftarKelas().map(k => [k, semua.filter(s => s.kelas === k).length]);
  view(`<div class="toolbar">
      <div class="search">${icon('search')}<input id="q" type="search" placeholder="Cari nama atau NISN…" value="${esc(st.q)}" aria-label="Cari siswa"></div>
      <select id="fk" class="select" aria-label="Filter kelas"><option value="">Semua kelas</option>${daftarKelas().map(k => `<option ${k === st.kelas ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
      <span class="spacer"></span>
      <button class="btn ghost" data-act="csv">${icon('download')} CSV</button>
      <button class="btn soft" data-act="bulk">${icon('upload')} Tambah banyak</button>
      <button class="btn primary" data-act="add">${icon('plus')} Tambah siswa</button>
    </div>
    <div class="kelas-strip" id="kstrip">${perKelas.map(([k, n]) => `<button type="button" class="kelas-tile ${st.kelas === k ? 'on' : ''}" data-act="pilihKelas" data-k="${esc(k)}"><b>${n}</b><span>${esc(k)}</span></button>`).join('')}</div>
    <section class="card" id="slist"></section>`);
  const rowsOf = () => semua.filter(s => (!st.kelas || s.kelas === st.kelas) && norm(`${s.nama} ${s.nisn} ${s.kelas} ${s.tempatLahir}`).includes(norm(st.q)));
  const draw = () => {
    const rows = rowsOf();
    $('#slist').innerHTML = rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Siswa</th><th>Tempat, tanggal lahir</th><th>Kelas</th><th>Hadir bulan ini</th><th class="num">Rata-rata</th><th class="act"></th></tr></thead><tbody>
      ${rows.map(s => { const r = rekapAbsen(s.nisn, bulan); return `<tr>
        <td><div class="who">${UI.avatar(s.nama, 'sm')}<span><b>${esc(s.nama)}</b><small class="mono">NISN ${esc(s.nisn)}</small></span></div></td>
        <td class="ttl">${esc(ttl(s)) || '<span class="muted">—</span>'}</td>
        <td><span class="kelas-chip">${esc(s.kelas)}</span></td>
        <td>${r.persen == null ? '<span class="muted">—</span>' : `<div class="meter"><div class="mini-bar"><i style="width:${r.persen}%"></i></div><span>${r.persen}%</span></div>`}</td>
        <td class="num">${nilaiBadge(rataNilai(s.nisn))}</td>
        <td class="act"><div class="act-row"><button class="icon-btn" data-act="detail" data-id="${s.nisn}" title="Detail" aria-label="Detail">${icon('eye')}</button><button class="icon-btn" data-act="edit" data-id="${s.nisn}" title="Edit" aria-label="Edit">${icon('edit')}</button><button class="icon-btn" data-act="pass" data-id="${s.nisn}" title="Atur ulang sandi" aria-label="Atur ulang sandi">${icon('key')}</button><button class="icon-btn danger" data-act="del" data-id="${s.nisn}" title="Hapus" aria-label="Hapus">${icon('trash')}</button></div></td></tr>`; }).join('')}
      </tbody></table></div><p class="table-foot muted">${rows.length} siswa ditampilkan · diurutkan per kelas, lalu nama</p>`
      : UI.empty('users', st.q || st.kelas ? 'Tidak ada yang cocok' : 'Belum ada siswa', st.q || st.kelas ? 'Coba kata kunci atau kelas lain.' : 'Siswa bisa mendaftar sendiri dari halaman masuk, atau tambahkan di sini.', `<button class="btn primary" data-act="add">${icon('plus')} Tambah siswa</button>`);
  };
  draw();
  $('#q').addEventListener('input', e => { st.q = e.target.value; draw(); });
  $('#fk').addEventListener('change', e => { st.kelas = e.target.value; route(); });
  App.actions = {
    pilihKelas: el => { st.kelas = st.kelas === el.dataset.k ? '' : el.dataset.k; route(); },
    add: () => formSiswa(), edit: el => formSiswa(el.dataset.id), bulk: () => formSiswaBanyak(),
    detail: el => detailSiswa(el.dataset.id), pass: el => resetSandiSiswa(el.dataset.id),
    csv: () => UI.exportText('data-siswa.csv', UI.csv([['NISN', 'Nama lengkap', 'Tempat lahir', 'Tanggal lahir', 'Kelas', 'Cara daftar', 'Terdaftar', 'Hadir bulan ini (%)', 'Rata-rata nilai'],
      ...rowsOf().map(s => [s.nisn, s.nama, s.tempatLahir, s.tanggalLahir, s.kelas, s.sumber === 'mandiri' ? 'Daftar sendiri' : 'Ditambah guru', fmtTglPendek(s.dibuat), rekapAbsen(s.nisn, bulan).persen ?? '', rataNilai(s.nisn) ?? ''])])),
    del: async el => {
      const s = siswaById(el.dataset.id);
      if (!(await UI.confirm({ title: 'Hapus siswa?', msg: `<b>${esc(s.nama)}</b> (${esc(s.kelas)}, NISN ${esc(s.nisn)}) akan dihapus beserta seluruh data absen dan jawabannya. Tindakan ini tidak bisa dibatalkan.` }))) return;
      busy(null, async () => {
        await Store.update('siswa.json', l => rapikanSiswa(l.filter(x => x.nisn !== s.nisn)), `hapus siswa: ${s.nama} (${s.nisn})`);
        const fotos = absenOf(s.nisn).filter(r => r.foto).map(r => r.foto.path);
        if (fotos.length) await Store.hapusFoto(fotos, `hapus ${fotos.length} foto absen: ${s.nama}`).catch(() => { });
        if (D().absensi[s.nisn]) await Store.remove(`absensi/${s.nisn}.json`, `hapus absen: ${s.nama}`);
        if (D().jawaban[s.nisn]) await Store.remove(`jawaban/${s.nisn}.json`, `hapus jawaban: ${s.nama}`);
        UI.toast(`${s.nama} dihapus`); route();
      });
    }
  };
};

function fieldsSiswa(s, { edit = false } = {}) {
  return `<label class="field"><span>NISN</span><input id="fs-nisn" inputmode="numeric" maxlength="10" autocomplete="off" value="${esc(s?.nisn || '')}" placeholder="10 digit, mis. 0081234567" ${edit ? 'readonly' : ''}></label>
      ${edit ? '<p class="hint">NISN adalah kunci data siswa sehingga tidak bisa diubah. Bila salah, hapus lalu tambahkan ulang.</p>' : ''}
      <label class="field"><span>Nama lengkap</span><input id="fs-nama" autocomplete="off" value="${esc(s?.nama || '')}"></label>
      <div class="row2"><label class="field"><span>Tempat lahir</span><input id="fs-tempat" autocomplete="off" value="${esc(s?.tempatLahir || '')}" placeholder="mis. Makassar"></label>
        <label class="field"><span>Tanggal lahir</span><input id="fs-tgl" type="date" max="${ymd()}" value="${esc(s?.tanggalLahir || '')}"></label></div>
      <label class="field"><span>Kelas</span><select id="fs-kelas">${kelasOptions(s?.kelas || App.sub.kelas || '', { kosong: 'Pilih kelas' })}</select></label>`;
}

function formSiswa(nisn) {
  const s = nisn ? siswaById(nisn) : null;
  UI.modal({
    title: s ? 'Edit data siswa' : 'Tambah siswa',
    body: `${fieldsSiswa(s, { edit: !!s })}
      <label class="field"><span>${s ? 'Sandi baru (kosongkan jika tetap)' : 'Kata sandi awal'}</span><input id="fs-pass" type="text" autocomplete="off" placeholder="${s ? '••••••' : 'kosong = sama dengan NISN'}"></label>
      <p class="form-err" hidden></p>`,
    foot: `<button class="btn ghost" data-act="__close">Batal</button><button class="btn primary" data-act="save">${icon('check')} Simpan</button>`,
    actions: {
      save: el => {
        const m = el.closest('.modal'), v = isianSiswa(m), pass = $('#fs-pass', m).value;
        const salah = cekDataSiswa(v, { baru: !s }); if (salah) return formErr(m, salah);
        if (pass && pass.length < 6) return formErr(m, 'Kata sandi minimal 6 karakter.');
        const sandi = pass || (!s ? v.nisn : '');
        busy(el, async () => {
          await Store.update('siswa.json', l => {
            const ex = l.find(x => x.nisn === v.nisn);
            if (!s && ex) throw new Error(`NISN ${v.nisn} sudah terdaftar.`);
            const now = new Date().toISOString();
            const rec = { ...(ex || { sumber: 'guru', dibuat: now }), ...v, ...(ex ? { diubah: now } : {}) };
            if (sandi) rec.passHash = hashPass(v.nisn, sandi);
            return rapikanSiswa(ex ? l.map(x => x === ex ? rec : x) : [...l, rec]);
          }, `${s ? 'ubah' : 'tambah'} siswa: ${v.nama} (${v.nisn})`);
          m._actions.__close(); UI.toast(s ? 'Data siswa diperbarui' : `${v.nama} ditambahkan · sandi awal: ${sandi}`, 'ok', 5000); route();
        });
      }
    }
  });
}

function formSiswaBanyak() {
  let parsed = [];
  UI.modal({
    title: 'Tambah banyak siswa', size: 'lg',
    body: `<p class="muted">Salin dari Excel, satu siswa per baris dengan urutan kolom <b>NISN · Nama lengkap · Tempat lahir · Tanggal lahir · Kelas</b>. Pemisah boleh tab (hasil salin Excel) atau titik koma. Tanggal boleh ditulis 14/03/2010 atau 2010-03-14. Sandi awal = NISN.</p>
      <label class="field"><span>Kelas bawaan (jika kolom kelas kosong)</span><select id="fb-kelas">${kelasOptions(App.sub.kelas || '', { kosong: 'Pilih kelas' })}</select></label>
      <textarea id="fb-text" rows="7" class="mono" placeholder="0081234510;Rizky Maulana;Makassar;14/03/2010;X TJKT 1&#10;0081234511;Salsabila Azzahra;Gowa;02/07/2010;X TJKT 2"></textarea>
      <div id="fb-prev" class="hint"></div><p class="form-err" hidden></p>`,
    foot: `<button class="btn ghost" data-act="__close">Batal</button><button class="btn primary" data-act="save">${icon('upload')} Simpan semua</button>`,
    onMount: el => {
      const go = () => {
        const ada = new Set(D().siswa.map(s => s.nisn)), def = val('fb-kelas', el);
        parsed = $('#fb-text', el).value.split(/\r?\n/).map(l => l.split(/\t|;/).map(x => x.trim())).filter(c => c.some(Boolean)).map(c => {
          let nisn = (c[0] || '').replace(/\D/g, ''); if (nisn.length >= 7 && nisn.length < 10) nisn = nisn.padStart(10, '0');
          const v = { nisn, nama: rapikanTeks(c[1]), tempatLahir: rapikanTeks(c[2]), tanggalLahir: tanggalISO(c[3]), kelas: c[4] || def };
          let err = cekDataSiswa(v, { baru: false });
          if (!err && v.kelas && !KELAS.includes(v.kelas)) err = `Kelas "${v.kelas}" tidak dikenal.`;
          if (!err && ada.has(nisn)) err = 'NISN sudah terdaftar'; ada.add(nisn);
          return { ...v, err };
        });
        const ok = parsed.filter(p => !p.err);
        $('#fb-prev', el).innerHTML = parsed.length ? `<div class="table-wrap"><table class="table compact"><thead><tr><th>NISN</th><th>Nama</th><th>TTL</th><th>Kelas</th><th>Keterangan</th></tr></thead><tbody>${parsed.slice(0, 60).map(p => `<tr class="${p.err ? 'row-bad' : ''}"><td class="mono">${esc(p.nisn)}</td><td>${esc(p.nama)}</td><td>${esc(ttl(p))}</td><td>${esc(p.kelas)}</td><td>${p.err ? esc(p.err) : 'Siap'}</td></tr>`).join('')}</tbody></table></div><p>${ok.length} siswa siap ditambahkan${parsed.length - ok.length ? `, ${parsed.length - ok.length} baris perlu diperbaiki` : ''}.</p>` : '';
      };
      $('#fb-text', el).addEventListener('input', go); $('#fb-kelas', el).addEventListener('change', go);
    },
    actions: {
      save: el => {
        const m = el.closest('.modal'), ok = parsed.filter(p => !p.err);
        if (!ok.length) return formErr(m, 'Belum ada baris yang valid.');
        busy(el, async () => {
          const now = new Date().toISOString(); let n = 0;
          await Store.update('siswa.json', l => {
            const ada = new Set(l.map(x => x.nisn)); n = 0;
            for (const p of ok) if (!ada.has(p.nisn)) { const { err, ...v } = p; l.push({ ...v, passHash: hashPass(v.nisn, v.nisn), sumber: 'guru', dibuat: now }); ada.add(p.nisn); n++; }
            return rapikanSiswa(l);
          }, `tambah ${ok.length} siswa`);
          m._actions.__close(); UI.toast(`${n} siswa ditambahkan. Sandi awal = NISN.`); route();
        });
      }
    }
  });
}

function resetSandiSiswa(nisn) {
  const s = siswaById(nisn);
  UI.modal({
    title: 'Atur ulang sandi', size: 'sm',
    body: `<p class="muted">Sandi baru untuk <b>${esc(s.nama)}</b> (NISN ${esc(s.nisn)}).</p><label class="field"><span>Sandi baru</span><input id="rs-p" type="text" value="${esc(s.nisn)}" autocomplete="off"></label><p class="form-err" hidden></p>`,
    foot: `<button class="btn ghost" data-act="__close">Batal</button><button class="btn primary" data-act="save">Simpan</button>`,
    actions: {
      save: el => {
        const m = el.closest('.modal'), p = $('#rs-p', m).value;
        if (p.length < 6) return formErr(m, 'Sandi minimal 6 karakter.');
        busy(el, async () => { await Store.update('siswa.json', l => { const x = l.find(y => y.nisn === nisn); if (x) x.passHash = hashPass(nisn, p); return rapikanSiswa(l); }, `reset sandi siswa ${nisn}`); m._actions.__close(); UI.toast(`Sandi ${s.nama} diatur ulang`); });
      }
    }
  });
}

function detailSiswa(nisn) {
  const s = siswaById(nisn), bulan = ymd().slice(0, 7), r = rekapAbsen(nisn, bulan), all = rekapAbsen(nisn);
  const riwayat = [...absenOf(nisn)].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 8);
  const nilai = D().tugas.filter(t => untuk(t, s)).map(t => { const j = recJawab(nisn, t.id); return { t, j, st: statusJ(t, j), n: j ? hitungNilai(t, j).nilai : null }; });
  const { el } = UI.modal({
    title: 'Detail siswa', size: 'lg', autofocus: false,
    actions: { lihatFotoD: b => lihatFoto(nisn, b.dataset.tgl) },
    body: `<div class="pk-who big">${UI.avatar(s.nama, 'lg')}<div><b>${esc(s.nama)}</b><small>${esc(s.kelas)} · NISN ${esc(s.nisn)}</small></div></div>
      <dl class="biodata">
        <div><dt>NISN</dt><dd class="mono">${esc(s.nisn)}</dd></div><div><dt>Kelas</dt><dd>${esc(s.kelas)}</dd></div>
        <div><dt>Tempat, tanggal lahir</dt><dd>${esc(ttl(s)) || '—'}</dd></div><div><dt>Terdaftar</dt><dd>${fmtTglPendek(s.dibuat)} ${sumberPill(s)}</dd></div>
      </dl>
      <div class="detail-grid">
        <div class="card pad center">${UI.ring(r.persen ?? 0, r.persen == null ? '—' : r.persen + '%', 96)}<p class="muted">Kehadiran ${toDate(bulan + '-01').toLocaleDateString('id-ID', { month: 'long' })}</p></div>
        <div class="card pad"><div class="counts">${STATUS_ABSEN.map(k => `<div class="count ${statusCls(k)}"><b>${all[k]}</b><span>${k}</span></div>`).join('')}</div><p class="muted small">Total sejak awal pencatatan</p></div>
      </div>
      ${riwayat.some(a => a.foto) ? `<h4 class="sub-h">Foto absen terakhir</h4><div class="foto-strip">${riwayat.filter(a => a.foto).slice(0, 6).map(a => `<button type="button" class="foto-box" data-act="lihatFotoD" data-tgl="${a.tanggal}" title="${esc(fmtTglPendek(a.tanggal))}"><img data-foto="${esc(a.foto.path)}" alt="Foto ${esc(fmtTglPendek(a.tanggal))}"><small>${esc(fmtTgl(a.tanggal, { day: 'numeric', month: 'short' }))}</small></button>`).join('')}</div>` : ''}
      <h4 class="sub-h">Absen terakhir</h4>${riwayat.length ? `<ul class="mini-list">${riwayat.map(a => `<li><span>${fmtTgl(a.tanggal, { weekday: 'short', day: 'numeric', month: 'short' })}</span><span class="mono muted">${esc(a.jam || '')}</span>${absenPill(a.status)}${a.lokasi ? `<small class="muted">${icon('flag')} ${Lokasi.fmtM(a.lokasi.jarak)}</small>` : ''}${a.keterangan ? `<small class="muted">${esc(a.keterangan)}</small>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Belum ada catatan absen.</p>'}
      <h4 class="sub-h">Nilai tugas</h4>${nilai.length ? `<ul class="mini-list">${nilai.map(x => `<li><span>${esc(x.t.judul)}</span>${statusJPill(x.st)}<span class="spacer"></span>${nilaiBadge(x.n)}</li>`).join('')}</ul>` : '<p class="muted">Belum ada tugas untuk kelas ini.</p>'}`
  });
  UI.fotos(el);
}

/* ================= ABSENSI ================= */
/** Sel lokasi: jarak siswa dari titik absen saat menekan Hadir. */
function lokasiSel(r) {
  if (!r?.lokasi) return '<span class="muted">—</span>';
  const L = r.lokasi, lok = Lokasi.conf(), ok = !Lokasi.siap(lok) || L.jarak <= lok.radius;
  const isi = `${icon('flag')}${Lokasi.fmtM(L.jarak)}`, tip = `Akurasi GPS ±${Lokasi.fmtM(L.akurasi || 0)}`;
  return L.lat != null ? `<a class="lok-pill ${ok ? 'ok' : 'bad'}" href="${Lokasi.mapsLink(L)}" target="_blank" rel="noopener" title="${tip} · buka di Google Maps">${isi}</a>` : `<span class="lok-pill ${ok ? 'ok' : 'bad'}" title="${tip}">${isi}</span>`;
}
function simpanAbsen(sid, tanggal, patch, msg) {
  return Store.update(`absensi/${sid}.json`, list => {
    list = Array.isArray(list) ? list : [];
    const i = list.findIndex(r => r.tanggal === tanggal);
    if (patch === null) { if (i >= 0) list.splice(i, 1); return list; }
    const rec = { tanggal, jam: '', keterangan: '', ...(i >= 0 ? list[i] : {}), ...patch };
    if (i >= 0) list[i] = rec; else list.push(rec);
    return list.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, msg);
}

/* ---------- Foto absen (guru) ---------- */
const sumberFotoLabel = { kamera: 'Kamera langsung', berkas: 'Aplikasi kamera / berkas', simulasi: 'Foto contoh' };
function fotoThumb(s, r) {
  if (!r?.foto) return '<span class="muted">—</span>';
  return `<button type="button" class="thumb foto-box" data-act="lihatFoto" data-sid="${s.nisn}" data-tgl="${r.tanggal}" aria-label="Lihat foto ${esc(s.nama)}"><img data-foto="${esc(r.foto.path)}" alt="">${r.foto.sumber === 'berkas' ? '<em title="Bukan dari kamera langsung">berkas</em>' : ''}</button>`;
}
function lihatFoto(nisn, tgl) {
  const s = siswaById(nisn), r = recAbsen(nisn, tgl); if (!s || !r?.foto) return;
  const lok = Lokasi.conf();
  const { el } = UI.modal({
    title: 'Foto absen', autofocus: false,
    body: `<div class="foto-view foto-box"><img data-foto="${esc(r.foto.path)}" alt="Foto absen ${esc(s.nama)}"></div>
      <dl class="biodata">
        <div class="wide"><dt>Siswa</dt><dd>${esc(s.nama)} <span class="kelas-chip">${esc(s.kelas)}</span></dd></div>
        <div><dt>Tanggal & jam</dt><dd>${fmtTglPendek(r.tanggal)} · <span class="mono">${esc(r.jam || '—')}</span></dd></div>
        <div><dt>Status</dt><dd>${absenPill(r.status)}</dd></div>
        <div><dt>Lokasi</dt><dd>${r.lokasi ? `${lokasiSel(r)} <small class="muted">±${Lokasi.fmtM(r.lokasi.akurasi || 0)}</small>` : '—'}</dd></div>
        <div><dt>Sumber foto</dt><dd>${esc(sumberFotoLabel[r.foto.sumber] || r.foto.sumber || '—')}</dd></div>
        ${r.keterangan ? `<div class="wide"><dt>Keterangan</dt><dd>${esc(r.keterangan)}</dd></div>` : ''}
      </dl>
      ${r.foto.sumber === 'berkas' ? `<p class="alert warn">${icon('alert')}<span>Foto ini diambil lewat aplikasi kamera HP atau dipilih dari berkas, bukan dari kamera langsung di aplikasi. Periksa cap waktu di foto.</span></p>` : ''}`
  });
  UI.fotos(el);
}

const slugNama = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
function muatJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = window.JSZIP_SRC || 'assets/js/vendor/jszip.min.js';
    sc.onload = () => window.JSZip ? res(window.JSZip) : rej(new Error('Pustaka ZIP gagal dimuat.'));
    sc.onerror = () => rej(new Error('Pustaka ZIP gagal dimuat. Periksa koneksi internet.'));
    document.head.appendChild(sc);
  });
}
/** Halaman rekap yang ikut di dalam ZIP: buka di browser lalu cetak. */
function rekapFotoHTML(judul, items) {
  const per = {}; for (const it of items) (per[it.r.tanggal] ??= []).push(it);
  const e = esc, set = SET();
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(judul)}</title>
<style>body{font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0B2537;margin:24px;background:#fff}h1{font-size:22px;margin:0}h2{font-size:16px;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid #87CEEB}.sub{color:#557287;margin:4px 0 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}figure{margin:0;border:1px solid #CFE5F2;border-radius:10px;overflow:hidden;break-inside:avoid}img{display:block;width:100%;aspect-ratio:3/4;object-fit:cover;background:#EAF5FC}
figcaption{padding:6px 8px;font-size:12px}b{display:block}.m{color:#557287}.x{display:grid;place-items:center;aspect-ratio:3/4;background:#F5FAFD;color:#557287;font-size:12px}.k{display:inline-block;padding:1px 6px;border-radius:5px;font-size:11px;font-weight:700;background:#DDF1FB;color:#0A4C75}.w{background:#FFEFD2;color:#9A5C00}
@media print{body{margin:10mm}h2{break-after:avoid}}</style></head><body>
<h1>${e(judul)}</h1><p class="sub">${e(set.sekolah)} · diekspor ${e(fmtTgl(ymd()))} · ${items.length} foto</p>
${Object.keys(per).sort().map(t => `<h2>${e(fmtTgl(t))}</h2><div class="grid">${per[t].map(({ s, r, file }) => `<figure>${file ? `<img src="${e(file)}" alt="">` : '<div class="x">Foto tidak ditemukan</div>'}<figcaption><b>${e(s.nama)}</b><span class="m">NISN ${e(s.nisn)} · ${e(s.kelas)}</span><br><span class="k">${e(r.status)}</span> ${e(r.jam || '')}${r.lokasi ? ` · ${e(Lokasi.fmtM(r.lokasi.jarak))}` : ''}${r.foto.sumber === 'berkas' ? ' <span class="k w">berkas</span>' : ''}</figcaption></figure>`).join('')}</div>`).join('')}
</body></html>`;
}
/** Ekspor foto + CSV + rekap.html sebagai satu berkas ZIP. */
async function eksporFotoZip(namaFile, judul, items) {
  if (!items.length) return UI.toast('Belum ada foto pada rentang ini.', 'info');
  let batal = false;
  const { el, close } = UI.modal({
    title: 'Mengekspor foto', size: 'sm', autofocus: false,
    body: `<p id="zp-t">Menyiapkan…</p><div class="mini-bar zip-bar"><i id="zp-b" style="width:0%"></i></div><p class="hint">${items.length} foto · biarkan halaman ini terbuka.</p>`,
    foot: `<button class="btn ghost" data-act="__close">Batal</button>`, onClose: () => { batal = true; }
  });
  try {
    const JSZip = await muatJSZip(), zip = new JSZip(), rows = [], hasil = [];
    let n = 0, gagal = 0;
    const antre = [...items], kerja = async () => {
      while (antre.length && !batal) {
        const it = antre.shift(), { s, r } = it;
        const file = `foto/${r.tanggal}/${slugNama(s.kelas)}/${s.nisn}_${slugNama(s.nama)}.jpg`;
        try { zip.file(file, await Store.blobFoto(r.foto.path)); hasil.push({ ...it, file }); }
        catch { gagal++; hasil.push({ ...it, file: '' }); }
        n++; if (!batal) { $('#zp-t', el).textContent = `Mengambil foto ${n} dari ${items.length}…`; $('#zp-b', el).style.width = (n / items.length * 90) + '%'; }
      }
    };
    await Promise.all([kerja(), kerja(), kerja(), kerja()]);
    if (batal) return;
    hasil.sort((a, b) => a.r.tanggal.localeCompare(b.r.tanggal) || kelasUrut(a.s.kelas) - kelasUrut(b.s.kelas) || a.s.nama.localeCompare(b.s.nama, 'id'));
    for (const { s, r, file } of hasil) rows.push([r.tanggal, s.nisn, s.nama, s.kelas, r.status, r.jam || '', r.lokasi?.jarak ?? '', sumberFotoLabel[r.foto.sumber] || r.foto.sumber || '', file || 'tidak ditemukan']);
    zip.file('absensi-foto.csv', '﻿' + UI.csv([['Tanggal', 'NISN', 'Nama', 'Kelas', 'Status', 'Jam', 'Jarak dari lokasi (m)', 'Sumber foto', 'File foto'], ...rows]));
    zip.file('rekap.html', rekapFotoHTML(judul, hasil));
    $('#zp-t', el).textContent = 'Membuat berkas ZIP…';
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, m => { if (!batal) $('#zp-b', el).style.width = (90 + m.percent / 10) + '%'; });
    if (batal) return;
    close();
    const ok = await UI.saveFile(namaFile, blob);
    if (ok === false) UI.toast('Unduhan tidak tersedia di tampilan ini. Coba dari aplikasi yang dipasang di GitHub Pages.', 'bad', 6000);
    else if (gagal) UI.toast(`${gagal} foto tidak ditemukan dan dicatat di CSV.`, 'info', 5000);
  } catch (e) { close(); UI.toast(e.message || 'Ekspor gagal.', 'bad', 5000); }
}
const fotoRentang = (siswa, cocok) => siswa.flatMap(s => absenOf(s.nisn).filter(r => r.foto && cocok(r.tanggal)).map(r => ({ s, r })));

Pages.admin.absensi = () => {
  const st = App.sub; st.tab ??= 'harian'; st.tgl ??= ymd(); st.kelas ??= ''; st.bulan ??= ymd().slice(0, 7);
  const siswa = rapikanSiswa(D().siswa).filter(s => !st.kelas || s.kelas === st.kelas);
  const kelasSel = `<select id="ab-k" class="select" aria-label="Filter kelas"><option value="">Semua kelas</option>${daftarKelas().map(k => `<option ${k === st.kelas ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>`;
  const tabs = `<div class="tabs" role="tablist">${[['harian', 'calendar', 'Harian'], ['galeri', 'grid', 'Galeri foto'], ['rekap', 'list', 'Rekap bulanan']].map(([v, ic, l]) => `<button role="tab" data-act="tab" data-v="${v}" class="${st.tab === v ? 'on' : ''}">${icon(ic)} ${l}</button>`).join('')}</div>`;
  const dateNav = isToday => `<div class="date-nav"><button class="icon-btn" data-act="prev" aria-label="Hari sebelumnya">${icon('left')}</button><input type="date" id="ab-d" value="${st.tgl}" max="${ymd()}" aria-label="Tanggal"><button class="icon-btn" data-act="next" aria-label="Hari berikutnya" ${isToday ? 'disabled' : ''}>${icon('right')}</button></div>`;
  const geser = n => { const d = toDate(st.tgl); d.setDate(d.getDate() + n); if (ymd(d) <= ymd()) { st.tgl = ymd(d); route(); } };
  const pasangFilter = () => {
    $('#ab-k')?.addEventListener('change', e => { st.kelas = e.target.value; route(); });
    $('#ab-d')?.addEventListener('change', e => { if (e.target.value) { st.tgl = e.target.value; route(); } });
    $('#ab-m')?.addEventListener('change', e => { st.bulan = e.target.value || ymd().slice(0, 7); route(); });
  };
  App.actions = {
    tab: el => { st.tab = el.dataset.v; route(); },
    prev: () => geser(-1), next: () => geser(1),
    lihatFoto: el => lihatFoto(el.dataset.sid, el.dataset.tgl)
  };

  /* ----- Galeri foto per tanggal ----- */
  if (st.tab === 'galeri') {
    const isToday = st.tgl === ymd();
    const items = siswa.map(s => ({ s, r: recAbsen(s.nisn, st.tgl) }));
    const ada = items.filter(x => x.r?.foto), tanpa = items.filter(x => x.r && !x.r.foto), belum = items.filter(x => !x.r);
    view(`${tabs}<div class="toolbar">${dateNav(isToday)}${kelasSel}<span class="spacer"></span>
        <button class="btn primary" data-act="zipHari" ${ada.length ? '' : 'disabled'}>${icon('download')} Ekspor foto (ZIP)</button></div>
      <p class="date-title">${fmtTgl(st.tgl)}${isToday ? ' · hari ini' : ''}</p>
      <div class="chips-row"><span class="count-chip ok"><b>${ada.length}</b>Berfoto</span><span class="count-chip warn"><b>${tanpa.length}</b>Tercatat tanpa foto</span><span class="count-chip mute"><b>${belum.length}</b>Belum absen</span></div>
      ${ada.length ? `<div class="galeri">${ada.map(({ s, r }) => `<button type="button" class="g-card" data-act="lihatFoto" data-sid="${s.nisn}" data-tgl="${r.tanggal}">
          <span class="foto-box g-img"><img data-foto="${esc(r.foto.path)}" alt="Foto ${esc(s.nama)}">${r.foto.sumber === 'berkas' ? '<em>berkas</em>' : ''}</span>
          <span class="g-txt"><b>${esc(s.nama)}</b><small>${esc(s.kelas)} · <span class="mono">${esc(r.jam || '')}</span></small><span class="g-meta">${absenPill(r.status)}${r.lokasi ? lokasiSel(r).replace(/<a /, '<span ').replace(/<\/a>/, '</span>') : ''}</span></span>
        </button>`).join('')}</div>`
        : `<section class="card">${UI.empty('camera', 'Belum ada foto', 'Foto muncul di sini setelah siswa absen dengan kamera.')}</section>`}`);
    pasangFilter(); UI.fotos($('#view'));
    App.actions.zipHari = () => eksporFotoZip(`foto-absen-${st.tgl}${st.kelas ? '-' + slugNama(st.kelas) : ''}.zip`, `Foto absen ${fmtTgl(st.tgl)}${st.kelas ? ' · ' + st.kelas : ''}`, ada);
    return;
  }

  /* ----- Rekap bulanan ----- */
  if (st.tab === 'rekap') {
    const rows = siswa.map(s => ({ s, r: rekapAbsen(s.nisn, st.bulan) }));
    const fotoBulan = fotoRentang(siswa, t => t.startsWith(st.bulan));
    const namaBulan = toDate(st.bulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    view(`${tabs}<div class="toolbar"><input type="month" id="ab-m" class="select" value="${st.bulan}" aria-label="Bulan">${kelasSel}<span class="spacer"></span>
        <button class="btn ghost" data-act="csv">${icon('download')} Ekspor CSV</button>
        <button class="btn soft" data-act="zipBulan" ${fotoBulan.length ? '' : 'disabled'}>${icon('camera')} Ekspor foto (${fotoBulan.length})</button>
        <button class="btn ghost danger-text" data-act="hapusBulan" ${fotoBulan.length ? '' : 'disabled'}>${icon('trash')} Hapus foto bulan ini</button></div>
      <section class="card">${rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Siswa</th>${STATUS_ABSEN.map(k => `<th class="num" title="${k}">${k[0]}</th>`).join('')}<th class="num" title="Absen dengan foto">${icon('camera')}</th><th>Kehadiran</th></tr></thead><tbody>
        ${rows.map(({ s, r }) => `<tr><td><div class="who">${UI.avatar(s.nama, 'sm')}<span><b>${esc(s.nama)}</b><small>${esc(s.kelas)}</small></span></div></td>${STATUS_ABSEN.map(k => `<td class="num ${r[k] ? 'txt-' + statusCls(k) : 'muted'}">${r[k]}</td>`).join('')}
          <td class="num">${fotoBulan.filter(x => x.s.nisn === s.nisn).length}</td>
          <td>${r.persen == null ? '<span class="muted">—</span>' : `<div class="meter"><div class="mini-bar ${r.persen < 75 ? 'low' : ''}"><i style="width:${r.persen}%"></i></div><span>${r.persen}%</span></div>`}</td></tr>`).join('')}
      </tbody></table></div><p class="table-foot muted">H = Hadir · T = Terlambat · I = Izin · S = Sakit · A = Alpa · ikon kamera = jumlah absen berfoto. Persentase = (H + T) ÷ hari tercatat.</p>` : UI.empty('users', 'Belum ada siswa')}</section>`);
    pasangFilter();
    Object.assign(App.actions, {
      csv: () => UI.exportText(`rekap-absen-${st.bulan}.csv`, UI.csv([['NISN', 'Nama', 'Kelas', ...STATUS_ABSEN, 'Absen berfoto', 'Kehadiran (%)'], ...rows.map(({ s, r }) => [s.nisn, s.nama, s.kelas, ...STATUS_ABSEN.map(k => r[k]), fotoBulan.filter(x => x.s.nisn === s.nisn).length, r.persen ?? ''])])),
      zipBulan: () => eksporFotoZip(`foto-absen-${st.bulan}${st.kelas ? '-' + slugNama(st.kelas) : ''}.zip`, `Foto absen ${namaBulan}${st.kelas ? ' · ' + st.kelas : ''}`, fotoBulan),
      hapusBulan: async el => {
        if (!(await UI.confirm({ title: `Hapus ${fotoBulan.length} foto ${namaBulan}?`, msg: `Berkas foto absen ${namaBulan}${st.kelas ? ' kelas ' + esc(st.kelas) : ''} dihapus dari penyimpanan untuk menghemat ruang. Catatan absen, jam, dan lokasi tetap ada. <b>Ekspor ZIP terlebih dahulu</b> bila foto masih diperlukan.`, ok: 'Hapus foto' }))) return;
        busy(el, async () => { const n = await Store.hapusFoto(fotoBulan.map(x => x.r.foto.path), `hapus ${fotoBulan.length} foto absen ${st.bulan}`); UI.toast(`${n} foto dihapus`); route(); });
      }
    });
    return;
  }

  /* ----- Harian ----- */
  const recs = siswa.map(s => ({ s, r: recAbsen(s.nisn, st.tgl) }));
  const cnt = k => recs.filter(x => (x.r?.status || '') === k).length;
  const isToday = st.tgl === ymd();
  view(`${tabs}<div class="toolbar">
      ${dateNav(isToday)}${kelasSel}<span class="spacer"></span>
      <button class="btn ghost" data-act="alpa" ${cnt('') ? '' : 'disabled'}>${icon('flag')} Tandai Alpa (${cnt('')})</button>
      <button class="btn ghost" data-act="csv">${icon('download')} CSV</button></div>
    <p class="date-title">${fmtTgl(st.tgl)}${isToday ? ' · hari ini' : ''}</p>
    <div class="chips-row">${STATUS_ABSEN.map(k => `<span class="count-chip ${statusCls(k)}"><b>${cnt(k)}</b>${k}</span>`).join('')}<span class="count-chip mute"><b>${cnt('')}</b>Belum absen</span></div>
    <section class="card">${recs.length ? `<div class="table-wrap"><table class="table" id="ab-table"><thead><tr><th>Siswa</th><th>Foto</th><th>Status</th><th>Jam</th><th>Lokasi</th><th>Keterangan</th><th class="act"></th></tr></thead><tbody>
      ${recs.map(({ s, r }) => `<tr><td><div class="who">${UI.avatar(s.nama, 'sm')}<span><b>${esc(s.nama)}</b><small>${esc(s.kelas)}</small></span></div></td>
        <td>${fotoThumb(s, r)}</td>
        <td><select class="status-sel s-${statusCls(r?.status)}" data-sid="${s.nisn}" aria-label="Status ${esc(s.nama)}"><option value="">Belum absen</option>${STATUS_ABSEN.map(k => `<option ${r?.status === k ? 'selected' : ''}>${k}</option>`).join('')}</select></td>
        <td class="mono">${esc(r?.jam || '—')}</td><td>${lokasiSel(r)}</td><td class="muted ket">${esc(r?.keterangan || '')}${r?.oleh === 'guru' ? ' <small class="tag">diisi guru</small>' : ''}</td>
        <td class="act"><div class="act-row"><button class="icon-btn" data-act="edit" data-sid="${s.nisn}" title="Edit catatan" aria-label="Edit catatan">${icon('edit')}</button>${r ? `<button class="icon-btn danger" data-act="del" data-sid="${s.nisn}" title="Hapus catatan" aria-label="Hapus catatan">${icon('trash')}</button>` : ''}</div></td></tr>`).join('')}
    </tbody></table></div>` : UI.empty('users', 'Belum ada siswa', 'Tambahkan siswa di menu Data Siswa.')}</section>`);
  pasangFilter(); UI.fotos($('#view'));
  $('#ab-table')?.addEventListener('change', e => {
    const sel = e.target.closest('.status-sel'); if (!sel) return;
    const s = siswaById(sel.dataset.sid), v = sel.value, lama = recAbsen(s.nisn, st.tgl);
    busy(sel, async () => {
      await simpanAbsen(s.nisn, st.tgl, v ? { status: v, oleh: 'guru' } : null, `absen ${st.tgl}: ${s.nama} ${v || 'dihapus'}`);
      if (!v && lama?.foto) await Store.hapusFoto([lama.foto.path], `hapus foto absen ${st.tgl}: ${s.nama}`).catch(() => { });
      UI.toast(`${s.nama}: ${v || 'catatan dihapus'}`); route();
    });
  });
  Object.assign(App.actions, {
    edit: el => dialogAbsen(siswaById(el.dataset.sid), st.tgl),
    del: async el => {
      const s = siswaById(el.dataset.sid), lama = recAbsen(s.nisn, st.tgl);
      if (!(await UI.confirm({ title: 'Hapus catatan absen?', msg: `Catatan ${esc(s.nama)} tanggal ${fmtTglPendek(st.tgl)}${lama?.foto ? ' beserta fotonya' : ''} akan dihapus.` }))) return;
      busy(null, async () => {
        await simpanAbsen(s.nisn, st.tgl, null, `hapus absen ${st.tgl}: ${s.nama}`);
        if (lama?.foto) await Store.hapusFoto([lama.foto.path], `hapus foto absen ${st.tgl}: ${s.nama}`).catch(() => { });
        UI.toast('Catatan dihapus'); route();
      });
    },
    alpa: async el => {
      const belum = recs.filter(x => !x.r).map(x => x.s);
      if (!(await UI.confirm({ title: `Tandai ${belum.length} siswa Alpa?`, msg: `Siswa yang belum absen pada ${fmtTglPendek(st.tgl)} dicatat <b>Alpa</b>. Anda masih bisa mengubahnya satu per satu.`, ok: 'Tandai Alpa' }))) return;
      busy(el, async () => { for (const s of belum) await simpanAbsen(s.nisn, st.tgl, { status: 'Alpa', oleh: 'guru' }, `alpa ${st.tgl}: ${s.nama}`); UI.toast(`${belum.length} siswa ditandai Alpa`); route(); });
    },
    csv: () => UI.exportText(`absen-${st.tgl}.csv`, UI.csv([['Tanggal', 'NISN', 'Nama', 'Kelas', 'Status', 'Jam', 'Jarak dari lokasi (m)', 'Akurasi GPS (m)', 'Koordinat', 'Foto', 'Sumber foto', 'Keterangan'], ...recs.map(({ s, r }) => [st.tgl, s.nisn, s.nama, s.kelas, r?.status || 'Belum absen', r?.jam || '', r?.lokasi?.jarak ?? '', r?.lokasi?.akurasi ?? '', r?.lokasi?.lat != null ? `${r.lokasi.lat}, ${r.lokasi.lng}` : '', r?.foto ? r.foto.path : '', r?.foto ? (sumberFotoLabel[r.foto.sumber] || r.foto.sumber) : '', r?.keterangan || ''])]))
  });
};

function dialogAbsen(s, tgl) {
  const r = recAbsen(s.nisn, tgl) || {};
  UI.modal({
    title: 'Catatan absen', size: 'sm',
    body: `<div class="pk-who">${UI.avatar(s.nama)}<div><b>${esc(s.nama)}</b><small>${esc(s.kelas)} · ${fmtTgl(tgl)}</small></div></div>
      <div class="row2"><label class="field"><span>Status</span><select id="da-s">${STATUS_ABSEN.map(k => `<option ${(r.status || 'Hadir') === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label class="field"><span>Jam</span><input id="da-j" type="time" value="${esc(r.jam || '')}"></label></div>
      <label class="field"><span>Keterangan</span><textarea id="da-k" rows="2" placeholder="mis. surat dokter">${esc(r.keterangan || '')}</textarea></label>`,
    foot: `<button class="btn ghost" data-act="__close">Batal</button><button class="btn primary" data-act="save">Simpan</button>`,
    actions: {
      save: el => {
        const m = el.closest('.modal');
        busy(el, async () => { await simpanAbsen(s.nisn, tgl, { status: val('da-s', m), jam: val('da-j', m), keterangan: val('da-k', m), oleh: 'guru' }, `ubah absen ${tgl}: ${s.nama}`); m._actions.__close(); UI.toast('Catatan absen disimpan'); route(); });
      }
    }
  });
}

/* ================= PENGATURAN ================= */
function kartuPerantara(c) {
  return `<section class="card pad"><header class="sec-head"><span class="sec-ic">${icon('cloud')}</span><div><h3>Server perantara</h3><p class="muted">Terhubung lewat Cloudflare Worker <span class="mono">${esc(c.proxy)}</span>. Token GitHub tersimpan rahasia di Cloudflare, jadi siswa cukup membuka link aplikasi lalu daftar atau masuk dengan NISN. Tidak perlu link aktivasi.</p></div>${pill('Terhubung', 'ok')}</header><p class="hint" id="px-info">Memeriksa server…</p></section>`;
}
Pages.admin.pengaturan = () => {
  const set = SET(), c = Store.conn(), mode = Store.mode(), gh = mode === 'github', lok = Lokasi.conf();
  view(`<div class="settings">
    <section class="card pad">
      <header class="sec-head"><span class="sec-ic">${icon('cap')}</span><div><h3>Profil sekolah &amp; aturan</h3><p class="muted">Tampil di halaman masuk dan dipakai untuk penilaian serta absen.</p></div></header>
      <div class="row2"><label class="field"><span>Nama aplikasi</span><input id="pg-app" value="${esc(set.namaAplikasi)}"></label><label class="field"><span>Nama sekolah</span><input id="pg-sek" value="${esc(set.sekolah)}"></label></div>
      <div class="row3"><label class="field"><span>Tahun ajaran</span><input id="pg-ta" value="${esc(set.tahunAjaran)}"></label><label class="field"><span>KKM</span><input id="pg-kkm" type="number" min="0" max="100" value="${esc(set.kkm)}"></label><label class="field"><span>Nama tampilan guru</span><input id="pg-nama" value="${esc(set.admin.nama)}"></label></div>
      <div class="row3"><label class="field"><span>Absen dibuka</span><input id="pg-buka" type="time" value="${esc(set.bukaAbsen)}"></label><label class="field"><span>Batas tepat waktu</span><input id="pg-masuk" type="time" value="${esc(set.jamMasuk)}"></label><label class="field"><span>Absen ditutup</span><input id="pg-tutup" type="time" value="${esc(set.tutupAbsen)}"></label></div>
      <p class="hint">Siswa yang absen setelah batas tepat waktu tercatat <b>Terlambat</b>. Di luar jam buka–tutup, tombol absen tidak aktif.</p>
      <label class="toggle"><input type="checkbox" id="pg-reg" ${registrasiTerbuka() ? 'checked' : ''}><span class="tg"></span>Siswa boleh membuat akun sendiri dari halaman masuk</label>
      <label class="toggle"><input type="checkbox" id="pg-foto" ${SET().wajibFoto !== false ? 'checked' : ''}><span class="tg"></span>Wajibkan foto dengan kamera saat siswa absen</label>
      <div class="sec-foot"><button class="btn primary" data-act="saveProfil">${icon('check')} Simpan pengaturan</button></div>
    </section>

    <section class="card pad" id="sec-lokasi">
      <header class="sec-head"><span class="sec-ic">${icon('flag')}</span><div><h3>Lokasi absen</h3><p class="muted">Siswa hanya bisa absen <b>Hadir</b> bila GPS HP-nya berada di dalam radius dari titik ini. Izin dan Sakit tidak memerlukan lokasi.</p></div>${Lokasi.siap(lok) ? pill('Aktif', 'ok') : pill('Tidak aktif', 'mute')}</header>
      <label class="toggle"><input type="checkbox" id="lk-aktif" ${lok.aktif ? 'checked' : ''}><span class="tg"></span>Wajibkan lokasi saat absen Hadir</label>
      <div class="lok-grid">
        <div class="lok-form">
          <label class="field"><span>Nama lokasi</span><input id="lk-nama" value="${esc(lok.nama)}" placeholder="mis. ${esc(set.sekolah)}"></label>
          <label class="field"><span>Titik koordinat</span><input id="lk-koor" value="${Number.isFinite(lok.lat) ? `${lok.lat}, ${lok.lng}` : ''}" placeholder="-5.135400, 119.423800 atau link Google Maps" autocomplete="off"></label>
          <p class="hint" id="lk-info"></p>
          <div class="lok-btns">
            <button type="button" class="btn soft sm" data-act="lkSaya">${icon('flag')} Pakai lokasi saya sekarang</button>
            <a class="btn ghost sm" id="lk-maps" target="_blank" rel="noopener" href="#" hidden>${icon('link')} Cek di Google Maps</a>
          </div>
          <div class="field"><span>Radius yang diizinkan <b class="radius-val" id="lk-rv">${Lokasi.fmtM(lok.radius)}</b></span>
            <div class="radius-row"><input type="range" id="lk-radius" min="10" max="1000" step="5" value="${esc(lok.radius)}" aria-label="Radius dalam meter"><input type="number" id="lk-radius-n" min="10" max="5000" step="5" value="${esc(lok.radius)}" aria-label="Radius (meter)"><span class="muted">m</span></div>
            <div class="radius-presets">${[50, 100, 200, 500].map(r => `<button type="button" class="chip-btn" data-act="lkPreset" data-r="${r}">${r} m</button>`).join('')}</div>
          </div>
          <p class="hint">Akurasi GPS HP biasanya 5–30 m di luar ruangan dan bisa lebih dari 50 m di dalam gedung. Radius 100–200 m cocok untuk satu sekolah.</p>
        </div>
        <div class="lok-preview" id="lk-radar"></div>
      </div>
      <div class="sec-foot"><button class="btn primary" data-act="saveLokasi">${icon('check')} Simpan lokasi absen</button></div>
    </section>

    <section class="card pad">
      <header class="sec-head"><span class="sec-ic">${icon('key')}</span><div><h3>Akun guru</h3><p class="muted">Username: <b>${esc(set.admin.username)}</b>${set.admin.passHash === hashPass('admin', 'erje123') ? ` · ${pill('Masih memakai sandi awal', 'warn')}` : ''}</p></div></header>
      <div class="row3"><label class="field"><span>Sandi lama</span><input id="pa-old" type="password" autocomplete="current-password"></label><label class="field"><span>Sandi baru</span><input id="pa-new" type="password" autocomplete="new-password"></label><label class="field"><span>Ulangi sandi baru</span><input id="pa-new2" type="password" autocomplete="new-password"></label></div>
      <div class="sec-foot"><button class="btn primary" data-act="savePass">${icon('key')} Ganti sandi</button></div>
    </section>

    ${pakaiPerantara() ? kartuPerantara(c) : ''}
    <section class="card pad" ${pakaiPerantara() ? 'hidden' : ''}>
      <header class="sec-head"><span class="sec-ic">${icon('git')}</span><div><h3>Penyimpanan GitHub</h3><p class="muted">${gh ? `Terhubung ke <b>${esc(c.owner)}/${esc(c.repo)}</b> · branch ${esc(c.branch)} · folder <span class="mono">${esc(c.path || '/')}</span>` : window.FORCE_DEMO ? 'Pratinjau ini selalu berjalan dalam mode demo. Unggah aplikasi ke GitHub Pages untuk memakai penyimpanan GitHub.' : 'Saat ini mode demo: data hanya ada di browser ini.'}</p></div>${gh ? pill('Terhubung', 'ok') : pill('Mode demo', 'warn')}</header>
      ${window.FORCE_DEMO ? '' : `
      <div class="row2"><label class="field"><span>Pemilik (owner)</span><input id="gh-o" value="${esc(c.owner)}" placeholder="username GitHub"></label><label class="field"><span>Repositori data</span><input id="gh-r" value="${esc(c.repo)}" placeholder="kelas-langit-data"></label></div>
      <div class="row3"><label class="field"><span>Branch</span><input id="gh-b" value="${esc(c.branch)}"></label><label class="field"><span>Folder data</span><input id="gh-p" value="${esc(c.path)}"></label>
        <label class="field"><span>Token akses</span><div class="pw"><input id="gh-t" type="password" value="${esc(c.token || '')}" placeholder="github_pat_…" autocomplete="off"><button type="button" class="icon-btn" data-act="togglePw" aria-label="Tampilkan token">${icon('eye')}</button></div></label></div>
      <p class="hint">Buat <b>fine-grained token</b> khusus repositori data dengan izin <b>Contents: Read and write</b>. Token disimpan di browser perangkat ini, tidak di file aplikasi.</p>
      <div class="sec-foot wrap">
        <button class="btn primary" data-act="saveGh">${icon('link')} Simpan &amp; hubungkan</button>
        ${gh ? `<button class="btn soft" data-act="aktivasi">${icon('send')} Link aktivasi siswa</button><button class="btn ghost" data-act="toDemo">Kembali ke mode demo</button>` : ''}
      </div>`}
    </section>

    <section class="card pad">
      <header class="sec-head"><span class="sec-ic">${icon('download')}</span><div><h3>Cadangan data</h3><p class="muted">Unduh seluruh data (siswa, materi, tugas, absen, nilai) sebagai satu file JSON. Versi aplikasi: <b class="mono">${APP_VERSI}</b></p></div></header>
      <div class="sec-foot wrap"><button class="btn soft" data-act="backup">${icon('download')} Unduh cadangan</button>${mode === 'demo' ? `<button class="btn ghost danger-text" data-act="resetDemo">${icon('refresh')} Kembalikan data contoh</button>` : ''}</div>
    </section>
  </div>`);
  // ----- lokasi absen: pratinjau langsung
  const lkTitik = () => Lokasi.parse(val('lk-koor'));
  const lkRadius = () => Math.max(10, Math.min(5000, Math.round(Number(val('lk-radius-n')) || 100)));
  const lkDraw = () => {
    const p = lkTitik(), r = lkRadius(), info = $('#lk-info'), maps = $('#lk-maps');
    $('#lk-rv').textContent = Lokasi.fmtM(r);
    if (p) { info.innerHTML = `${icon('check')} Titik terbaca: <span class="mono">${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</span>`; info.className = 'hint txt-ok'; maps.href = Lokasi.mapsLink(p); maps.hidden = false; }
    else { info.innerHTML = val('lk-koor') ? `${icon('alert')} Koordinat belum terbaca. Contoh: -5.135400, 119.423800` : 'Buka Google Maps, tekan lama titik sekolah, lalu salin angka koordinatnya ke sini.'; info.className = 'hint' + (val('lk-koor') ? ' txt-bad' : ''); maps.hidden = true; }
    $('#lk-radar').innerHTML = p ? `${Lokasi.radar({ ...p, radius: r, nama: val('lk-nama') }, null)}<p class="muted small center">Lingkaran biru = area absen Hadir</p>`
      : `<div class="lok-empty">${icon('flag')}<p>Isi titik koordinat untuk melihat area absen.</p></div>`;
  };
  $('#lk-koor').addEventListener('input', lkDraw);
  $('#lk-radius').addEventListener('input', e => { $('#lk-radius-n').value = e.target.value; lkDraw(); });
  $('#lk-radius-n').addEventListener('input', e => { $('#lk-radius').value = Math.min(1000, Number(e.target.value) || 10); lkDraw(); });
  lkDraw();
  if (pakaiPerantara()) Store.statusProxy().then(j => { const el = $('#px-info'); if (el) el.innerHTML = `${icon('check')} Repositori data: <b>${esc(j.repo)}</b> · branch ${esc(j.branch)}`; }).catch(e => { const el = $('#px-info'); if (el) el.textContent = e.message; });

  App.actions = {
    lkPreset: el => { $('#lk-radius').value = $('#lk-radius-n').value = el.dataset.r; lkDraw(); },
    lkSaya: el => busy(el, async () => {
      if (window.FORCE_DEMO) throw new Error('Lokasi perangkat tidak tersedia di pratinjau ini. Tempel koordinat dari Google Maps, atau coba setelah aplikasi dipasang di GitHub Pages.');
      const f = await Lokasi.posisi();
      $('#lk-koor').value = `${f.lat.toFixed(6)}, ${f.lng.toFixed(6)}`; lkDraw();
      UI.toast(`Lokasi terbaca (akurasi ±${Lokasi.fmtM(f.akurasi)})`, f.akurasi > 50 ? 'info' : 'ok');
    }),
    saveLokasi: el => {
      const p = lkTitik(), aktif = val('lk-aktif'), r = lkRadius();
      if (aktif && !p) return UI.toast('Isi titik koordinat yang valid sebelum mengaktifkan lokasi absen.', 'bad', 4500);
      busy(el, async () => {
        await Store.update('pengaturan.json', s => ({ ...s, lokasiAbsen: { aktif, nama: val('lk-nama'), lat: p ? p.lat : null, lng: p ? p.lng : null, radius: r } }), `lokasi absen: ${aktif ? 'aktif' : 'nonaktif'}, radius ${r} m`);
        UI.toast(aktif ? `Lokasi absen aktif · radius ${Lokasi.fmtM(r)}` : 'Lokasi absen disimpan (tidak aktif)'); route();
      });
    },
    saveProfil: el => {
      const kkm = Number(val('pg-kkm'));
      if (!val('pg-app') || !val('pg-nama')) return UI.toast('Nama aplikasi dan nama guru wajib diisi.', 'bad');
      if (isNaN(kkm) || kkm < 0 || kkm > 100) return UI.toast('KKM harus 0–100.', 'bad');
      if (!(val('pg-buka') < val('pg-tutup'))) return UI.toast('Jam buka absen harus sebelum jam tutup.', 'bad');
      busy(el, async () => {
        await Store.update('pengaturan.json', p => ({ ...p, namaAplikasi: val('pg-app'), sekolah: val('pg-sek'), tahunAjaran: val('pg-ta'), kkm, bukaAbsen: val('pg-buka'), jamMasuk: val('pg-masuk'), tutupAbsen: val('pg-tutup'), registrasiTerbuka: val('pg-reg'), wajibFoto: val('pg-foto'), admin: { ...p.admin, nama: val('pg-nama') } }), 'ubah pengaturan');
        $('.side .brand span').textContent = SET().namaAplikasi; $('.me b').textContent = SET().admin.nama;
        UI.toast('Pengaturan disimpan'); route();
      });
    },
    savePass: el => {
      const o = $('#pa-old').value, n = $('#pa-new').value, n2 = $('#pa-new2').value;
      if (hashPass('admin', o) !== SET().admin.passHash) return UI.toast('Sandi lama tidak cocok.', 'bad');
      if (n.length < 6) return UI.toast('Sandi baru minimal 6 karakter.', 'bad');
      if (n !== n2) return UI.toast('Ulangan sandi baru tidak sama.', 'bad');
      busy(el, async () => { await Store.update('pengaturan.json', p => { p.admin.passHash = hashPass('admin', n); return p; }, 'ganti sandi guru'); UI.toast('Sandi guru diganti'); route(); });
    },
    saveGh: el => {
      const v = { owner: val('gh-o'), repo: val('gh-r'), branch: val('gh-b') || 'main', path: val('gh-p'), token: val('gh-t') };
      if (!v.owner || !v.repo || !v.token) return UI.toast('Lengkapi owner, repositori, dan token.', 'bad');
      busy(el, async () => {
        const prev = Store.conn();
        Store.setConn({ ...v, useDemo: false });
        try { await Store.test(); } catch (e) { Store.setConn({ ...prev, useDemo: prev.useDemo || mode !== 'github' }); throw e; }
        try { await Store.load(); }
        catch (e) {
          if (e.code !== 'NO_DATA') throw e;
          if (!(await UI.confirm({ title: 'Repositori masih kosong', msg: 'Buat file data awal di repositori ini? Akun guru di GitHub memakai sandi awal <b>erje123</b>. Data mode demo tidak ikut dipindahkan.', ok: 'Buat data awal', danger: false }))) { Store.setConn({ useDemo: true }); await Store.load(); return route(); }
          await Store.initRepo(); await Store.load();
        }
        App.user = { role: 'admin' }; Store.local.set('sesi', JSON.stringify(App.user));
        $('#app').innerHTML = ''; route(); UI.toast('Terhubung ke GitHub');
      });
    },
    aktivasi: () => {
      const link = Store.activationLink();
      UI.modal({
        title: 'Link aktivasi siswa',
        body: `<p class="muted">Bagikan link ini lewat grup kelas. Siswa cukup membukanya sekali di setiap perangkat, lalu menekan <b>Daftar akun siswa</b> (siswa baru) atau masuk dengan NISN dan sandi.</p>
          <textarea class="mono" rows="4" readonly id="ak-l">${esc(link)}</textarea>
          <div class="alert warn">${icon('alert')}<span>Link ini memuat token akses. Siapa pun yang memegangnya bisa mengubah data di repositori. Bagikan hanya ke grup kelas, dan buat token baru bila link tersebar.</span></div>`,
        foot: `<button class="btn primary" data-act="cp">${icon('copy')} Salin link</button>`,
        actions: { cp: () => UI.copy(link) }
      });
    },
    toDemo: async () => {
      if (!(await UI.confirm({ title: 'Pindah ke mode demo?', msg: 'Perangkat ini berhenti memakai data GitHub. Data di GitHub tetap aman.', ok: 'Pindah', danger: false }))) return;
      Store.setConn({ useDemo: true }); await Store.load(); App.user = { role: 'admin' }; $('#app').innerHTML = ''; route();
    },
    backup: () => UI.exportText(`cadangan-kelas-langit-${ymd()}.json`, JSON.stringify(D(), null, 2), 'application/json'),
    resetDemo: async () => {
      if (!(await UI.confirm({ title: 'Kembalikan data contoh?', msg: 'Semua data demo di browser ini diganti dengan data contoh awal.', ok: 'Kembalikan' }))) return;
      Store.resetDemo(); await Store.load(); App.user = { role: 'admin' }; $('#app').innerHTML = ''; route(); UI.toast('Data contoh dikembalikan');
    }
  };
};
