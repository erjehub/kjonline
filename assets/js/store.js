/* ================================================================
   store.js — penyimpanan data.
   - Mode GITHUB : data = file JSON di repositori GitHub (lewat API).
   - Mode DEMO   : data = localStorage browser (untuk mencoba).

   Struktur folder data:
     pengaturan.json        profil sekolah, akun guru, KKM, jam absen
     siswa.json             daftar siswa
     materi.json            daftar materi
     tugas.json             daftar tugas + bank soal
     absensi/<idSiswa>.json riwayat absen tiap siswa
     jawaban/<idSiswa>.json jawaban & nilai tiap siswa
   Absensi & jawaban dipisah per siswa agar banyak siswa bisa
   menyimpan bersamaan tanpa saling menimpa.
   ================================================================ */
const Store = (() => {
  const PFX = 'kl:';
  const mem = {};
  const LS = {
    get(k) { try { return localStorage.getItem(PFX + k); } catch { return mem[k] ?? null; } },
    set(k, v) { try { localStorage.setItem(PFX + k, v); } catch { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(PFX + k); } catch { delete mem[k]; } },
    keys() { try { return Object.keys(localStorage).filter(k => k.startsWith(PFX)).map(k => k.slice(PFX.length)); } catch { return Object.keys(mem); } }
  };
  const safeParse = (t, fb = null) => { try { return JSON.parse(t); } catch { return fb; } };
  const err = (code, message) => Object.assign(new Error(message), { code });

  const defaultPengaturan = () => ({
    namaAplikasi: 'Kelas Langit',
    sekolah: 'SMA Negeri Contoh',
    tahunAjaran: '2026/2027',
    kkm: 75,
    jamMasuk: '07:30',
    bukaAbsen: '06:00',
    tutupAbsen: '14:00',
    registrasiTerbuka: true,
    wajibFoto: true,
    lokasiAbsen: { aktif: false, nama: '', lat: null, lng: null, radius: 100 },
    admin: { username: 'erje', nama: 'Erje', passHash: hashPass('admin', 'erje123') }
  });
  const emptyDb = () => ({ pengaturan: defaultPengaturan(), siswa: [], materi: [], tugas: [], absensi: {}, jawaban: {} });
  const defFor = p => p === 'pengaturan.json' ? defaultPengaturan() : [];

  function setIn(d, p, val) {
    const m = p.match(/^(absensi|jawaban)\/(.+)\.json$/);
    if (m) { if (val === undefined) delete d[m[1]][m[2]]; else d[m[1]][m[2]] = val; return; }
    const k = p.replace(/\.json$/, '');
    if (['pengaturan', 'siswa', 'materi', 'tugas'].includes(k)) d[k] = val === undefined ? defFor(p) : val;
  }

  /* ---------- Koneksi ---------- */
  function conn() {
    const cfg = window.APP_CONFIG || {};
    const base = Object.assign({ owner: '', repo: '', branch: 'main', path: 'data', token: '', proxy: cfg.proxy || '' }, cfg.github || {});
    const local = safeParse(LS.get('conn'), {}) || {};
    for (const [k, v] of Object.entries(local)) if (v !== '' && v != null) base[k] = v;
    base.path = String(base.path || '').replace(/^\/+|\/+$/g, '');
    base.proxy = String(base.proxy || '').trim().replace(/\/+$/, '');
    return base;
  }
  function setConn(patch) { const cur = safeParse(LS.get('conn'), {}) || {}; LS.set('conn', JSON.stringify({ ...cur, ...patch })); }
  function mode() {
    if (window.FORCE_DEMO) return 'demo';
    const c = conn();
    if (c.proxy) return 'proxy';
    if (c.useDemo) return 'demo';
    if (c.owner && c.repo) return c.token ? 'github' : 'needs-token';
    return 'demo';
  }

  /* ---------- Backend DEMO (localStorage) ---------- */
  const demo = {
    async load() {
      // Data demo versi lama (sebelum NISN) diganti otomatis dengan data contoh baru.
      const lama = (safeParse(LS.get('data:siswa.json'), []) || []).some(x => !x.nisn);
      if (!LS.get('data:pengaturan.json') || lama) { resetDemo(); seedDemo(); }
      // Pratinjau: pastikan contoh lokasi absen tersedia tanpa menghapus data demo yang ada.
      const pg = safeParse(LS.get('data:pengaturan.json'), {}) || {};
      if (window.FORCE_DEMO && !pg.lokasiAbsen) LS.set('data:pengaturan.json', JSON.stringify({ ...pg, lokasiAbsen: LOKASI_CONTOH }));
      const d = emptyDb();
      for (const k of LS.keys()) if (k.startsWith('data:')) setIn(d, k.slice(5), safeParse(LS.get(k), undefined));
      return d;
    },
    async write(p, fn) {
      const base = safeParse(LS.get('data:' + p)) ?? defFor(p);
      const draft = clone(base); const r = fn(draft); const next = r === undefined ? draft : r;
      LS.set('data:' + p, JSON.stringify(next));
      return next;
    },
    async remove(p) { LS.del('data:' + p); },
    async putFoto(p, blob) {
      const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
      try { localStorage.setItem(PFX + 'foto:' + p, url); }
      catch { if (!window.FORCE_DEMO) throw err('QUOTA', 'Penyimpanan browser penuh (mode demo). Hapus foto lama di menu Absensi.'); mem['foto:' + p] = url; }
    },
    async getFoto(p) {
      const v = LS.get('foto:' + p) ?? mem['foto:' + p]; if (!v) throw err('NOFOTO', 'Foto tidak ditemukan.');
      const [head, b64] = v.split(','), bin = atob(b64);
      return new Blob([Uint8Array.from(bin, ch => ch.charCodeAt(0))], { type: (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg' });
    },
    async delFotos(paths) { for (const p of paths) { LS.del('foto:' + p); delete mem['foto:' + p]; } return paths.length; }
  };

  /* ---------- Backend GITHUB ---------- */
  const API = 'https://api.github.com';
  const encPath = p => p.split('/').map(encodeURIComponent).join('/');
  const full = p => (conn().path ? conn().path + '/' : '') + p;
  async function req(method, url, body) {
    const c = conn();
    let res;
    try {
      res = await fetch(url.startsWith('http') ? url : API + url, {
        method, cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch { throw err('NET', 'Tidak bisa terhubung ke GitHub. Periksa koneksi internet.'); }
    return res;
  }
  async function httpErr(res) {
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) return err('TOKEN', 'Token GitHub tidak valid atau sudah kedaluwarsa. Minta link aktivasi baru ke guru.');
    if (res.status === 403) {
      if (res.headers.get('x-ratelimit-remaining') === '0') return err('RATE', 'Batas permintaan GitHub tercapai. Coba lagi beberapa menit lagi.');
      return err('PERM', 'Token tidak punya izin menulis. Atur izin "Contents: Read and write" pada token.');
    }
    if (res.status === 404) return err('REPO', 'Repositori atau branch tidak ditemukan, atau token tidak punya akses ke repositori itu.');
    return err('HTTP', `GitHub menolak permintaan (${res.status}${j.message ? ': ' + j.message : ''}).`);
  }
  const gh = {
    async load() {
      try { return await gh.loadGraphQL(); }
      catch (e) { if (e.code === 'GQL') return gh.loadREST(); throw e; }
    },
    // Satu permintaan GraphQL mengambil semua file sekaligus.
    async loadGraphQL() {
      const c = conn();
      const blob = '... on Blob{text}';
      const query = `query($o:String!,$r:String!,$e:String!){repository(owner:$o,name:$r){object(expression:$e){... on Tree{entries{name type object{${blob} ... on Tree{entries{name type object{${blob}}}}}}}}}}`;
      const res = await req('POST', API + '/graphql', { query, variables: { o: c.owner, r: c.repo, e: `${c.branch}:${c.path}` } });
      if (res.status === 401) throw await httpErr(res);
      if (!res.ok) throw err('GQL', 'graphql');
      const j = await res.json();
      if (j.errors && j.errors.length) {
        if (j.errors.some(x => x.type === 'NOT_FOUND')) throw err('REPO', `Repositori ${c.owner}/${c.repo} tidak ditemukan, atau token tidak punya akses ke sana.`);
        throw err('GQL', 'graphql');
      }
      const tree = j.data?.repository?.object;
      if (!tree || !tree.entries) throw err('NO_DATA', `Folder "${c.path || '/'}" di branch "${c.branch}" belum berisi data.`);
      const d = emptyDb(); let ada = false;
      for (const e of tree.entries) {
        if (e.type === 'blob' && e.name.endsWith('.json') && e.object?.text != null) { setIn(d, e.name, safeParse(e.object.text, undefined)); if (e.name === 'pengaturan.json') ada = true; }
        if (e.type === 'tree' && (e.name === 'absensi' || e.name === 'jawaban'))
          for (const f of e.object?.entries || []) if (f.type === 'blob' && f.name.endsWith('.json') && f.object?.text != null) setIn(d, `${e.name}/${f.name}`, safeParse(f.object.text, []));
      }
      if (!ada) throw err('NO_DATA', 'File pengaturan.json belum ada di repositori.');
      return d;
    },
    // Cadangan bila GraphQL tidak tersedia untuk token.
    async loadREST() {
      const c = conn(), base = `/repos/${c.owner}/${c.repo}/contents/`, ref = '?ref=' + encodeURIComponent(c.branch);
      const list = async p => { const r = await req('GET', base + encPath(p) + ref); if (r.status === 404) return null; if (!r.ok) throw await httpErr(r); return r.json(); };
      const file = async p => { const r = await req('GET', base + encPath(p) + ref); if (!r.ok) return undefined; const j = await r.json(); return safeParse(b64dec(j.content || ''), undefined); };
      const root = await list(c.path || '');
      if (!Array.isArray(root) || !root.some(x => x.name === 'pengaturan.json')) throw err('NO_DATA', `Folder "${c.path || '/'}" belum berisi data.`);
      const d = emptyDb(), jobs = [];
      for (const e of root) {
        if (e.type === 'file' && e.name.endsWith('.json')) jobs.push(file(e.path).then(v => setIn(d, e.name, v)));
        if (e.type === 'dir' && (e.name === 'absensi' || e.name === 'jawaban'))
          jobs.push(list(e.path).then(sub => Promise.all((sub || []).filter(f => f.name.endsWith('.json')).map(f => file(f.path).then(v => setIn(d, `${e.name}/${f.name}`, v ?? []))))));
      }
      await Promise.all(jobs);
      return d;
    },
    // Baca versi terbaru → ubah → simpan. Jika bentrok (409), ulangi.
    async write(p, fn, msg) {
      const c = conn(), url = `/repos/${c.owner}/${c.repo}/contents/${encPath(full(p))}`;
      for (let i = 0; i < 6; i++) {
        const g = await req('GET', `${url}?ref=${encodeURIComponent(c.branch)}&_=${Date.now()}`);
        let cur = null, sha;
        if (g.status === 200) { const j = await g.json(); sha = j.sha; cur = safeParse(b64dec(j.content || '')); }
        else if (g.status !== 404) throw await httpErr(g);
        const draft = clone(cur ?? defFor(p)); const r = fn(draft); const next = r === undefined ? draft : r;
        const put = await req('PUT', url, { message: msg || `perbarui ${full(p)}`, content: b64enc(JSON.stringify(next, null, 2) + '\n'), branch: c.branch, ...(sha ? { sha } : {}) });
        if (put.ok) return next;
        if (put.status === 409 || put.status === 422) { await sleep(250 + Math.random() * 600 * (i + 1)); continue; }
        throw await httpErr(put);
      }
      throw err('CONFLICT', 'Data sedang diubah banyak orang sekaligus. Coba simpan lagi sebentar.');
    },
    /** Unggah berkas biner (foto). Menimpa bila sudah ada. */
    async putFoto(p, blob, msg) {
      const c = conn(), url = `/repos/${c.owner}/${c.repo}/contents/${encPath(full(p))}`;
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
      for (let i = 0; i < 4; i++) {
        const g = await req('GET', `${url}?ref=${encodeURIComponent(c.branch)}&_=${Date.now()}`);
        let sha; if (g.status === 200) sha = (await g.json()).sha; else if (g.status !== 404) throw await httpErr(g);
        const put = await req('PUT', url, { message: msg || `foto ${full(p)}`, content: b64, branch: c.branch, ...(sha ? { sha } : {}) });
        if (put.ok) return;
        if (put.status === 409 || put.status === 422) { await sleep(300 * (i + 1)); continue; }
        throw await httpErr(put);
      }
      throw err('CONFLICT', 'Foto gagal disimpan karena bentrok. Coba kirim lagi.');
    },
    /** Ambil foto sebagai Blob (format mentah, juga untuk berkas > 1 MB). */
    async getFoto(p) {
      const c = conn();
      const r = await fetch(`${API}/repos/${c.owner}/${c.repo}/contents/${encPath(full(p))}?ref=${encodeURIComponent(c.branch)}`, {
        headers: { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }
      }).catch(() => { throw err('NET', 'Tidak bisa terhubung ke GitHub.'); });
      if (r.status === 404) throw err('NOFOTO', 'Foto tidak ditemukan.');
      if (!r.ok) throw await httpErr(r);
      return new Blob([await r.arrayBuffer()], { type: 'image/jpeg' });
    },
    /** Hapus banyak berkas sekaligus dalam SATU commit (Git Data API). */
    async delFotos(paths, msg) {
      const c = conn(), base = `/repos/${c.owner}/${c.repo}/git`, j = async r => { if (!r.ok) throw await httpErr(r); return r.json(); };
      for (let i = 0; i < 4; i++) {
        const ref = await j(await req('GET', `${base}/ref/heads/${encodeURIComponent(c.branch)}?_=${Date.now()}`));
        const head = ref.object.sha, commit = await j(await req('GET', `${base}/commits/${head}`));
        const tree = await j(await req('GET', `${base}/trees/${commit.tree.sha}?recursive=1`));
        const ada = new Set((tree.tree || []).filter(x => x.type === 'blob').map(x => x.path));
        const hapus = paths.map(full).filter(p => ada.has(p));
        if (!hapus.length) return 0;
        const nt = await j(await req('POST', `${base}/trees`, { base_tree: commit.tree.sha, tree: hapus.map(path => ({ path, mode: '100644', type: 'blob', sha: null })) }));
        const nc = await j(await req('POST', `${base}/commits`, { message: msg || `hapus ${hapus.length} foto`, tree: nt.sha, parents: [head] }));
        const up = await req('PATCH', `${base}/refs/heads/${encodeURIComponent(c.branch)}`, { sha: nc.sha });
        if (up.ok) return hapus.length;
        if (up.status === 409 || up.status === 422) { await sleep(400 * (i + 1)); continue; }
        throw await httpErr(up);
      }
      throw err('CONFLICT', 'Foto gagal dihapus karena data sedang berubah. Coba lagi.');
    },
    async remove(p, msg) {
      const c = conn(), url = `/repos/${c.owner}/${c.repo}/contents/${encPath(full(p))}`;
      for (let i = 0; i < 4; i++) {
        const g = await req('GET', `${url}?ref=${encodeURIComponent(c.branch)}&_=${Date.now()}`);
        if (g.status === 404) return;
        if (!g.ok) throw await httpErr(g);
        const { sha } = await g.json();
        const del = await req('DELETE', url, { message: msg || `hapus ${full(p)}`, sha, branch: c.branch });
        if (del.ok || del.status === 404) return;
        if (del.status === 409) { await sleep(300 * (i + 1)); continue; }
        throw await httpErr(del);
      }
    }
  };

  /* ---------- API publik ---------- */
  let db = null, lastLoad = 0;
  const subs = new Set();
  const emit = (s, m) => subs.forEach(f => f(s, m));
  /* ---------- Backend PERANTARA (Cloudflare Worker) ---------- */
  const sesi = {
    get token() { return LS.get('sesiProxy') || ''; },
    get user() { return safeParse(LS.get('sesiProxyUser')); },
    set(token, user) { LS.set('sesiProxy', token); LS.set('sesiProxyUser', JSON.stringify(user)); },
    clear() { LS.del('sesiProxy'); LS.del('sesiProxyUser'); }
  };
  async function pxCall(method, path, payload, { raw = false } = {}) {
    let res;
    try {
      res = await fetch(conn().proxy + path, {
        method, cache: 'no-store', body: payload ? JSON.stringify(payload) : undefined,
        headers: { ...(sesi.token ? { Authorization: 'Bearer ' + sesi.token } : {}), ...(payload ? { 'Content-Type': 'application/json' } : {}) }
      });
    } catch { throw err('NET', 'Tidak bisa terhubung ke server aplikasi. Periksa koneksi internet.'); }
    if (res.ok) return raw ? res : res.json();
    const j = await res.json().catch(() => ({}));
    if (res.status === 401 && (j.error === 'SESI' || !j.error)) { sesi.clear(); throw err('SESI', j.message || 'Sesi berakhir. Silakan masuk lagi.'); }
    throw Object.assign(err(j.error || 'HTTP', j.message || `Server menolak permintaan (${res.status}).`), { status: res.status });
  }
  const px = {
    async load() {
      if (!sesi.token) {
        const pub = await pxCall('GET', '/publik');
        if (!pub.punyaData) throw err('NO_DATA', 'Data aplikasi belum disiapkan.');
        return { ...emptyDb(), pengaturan: { ...defaultPengaturan(), ...pub.pengaturan, admin: { ...defaultPengaturan().admin, passHash: '', ...(pub.pengaturan || {}).admin } } };
      }
      const j = await pxCall('GET', '/load');
      sesi.set(sesi.token, j.user);
      const d = emptyDb();
      Object.assign(d, j.data, { absensi: j.data.absensi || {}, jawaban: j.data.jawaban || {} });
      d.pengaturan = { ...defaultPengaturan(), ...j.data.pengaturan, admin: { ...defaultPengaturan().admin, passHash: '', ...(j.data.pengaturan || {}).admin } };
      return d;
    },
    async write(p, fn, msg) {
      for (let i = 0; i < 6; i++) {
        const cur = await pxCall('GET', '/file?p=' + encodeURIComponent(p));
        const draft = clone(cur.data ?? defFor(p)); const r = fn(draft); const next = r === undefined ? draft : r;
        try { const w = await pxCall('PUT', '/file', { p, content: next, sha: cur.sha, msg }); return w.data ?? next; }
        catch (e) { if (e.status === 409 && e.code === 'BENTROK') { await sleep(250 + Math.random() * 500 * (i + 1)); continue; } throw e; }
      }
      throw err('CONFLICT', 'Data sedang diubah banyak orang sekaligus. Coba simpan lagi sebentar.');
    },
    async remove(p, msg) { await pxCall('POST', '/file/hapus', { p, msg }); },
    async putFoto(p, blob, msg) {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
      await pxCall('POST', '/foto', { p, b64, msg });
    },
    async getFoto(p) { const r = await pxCall('GET', '/foto?p=' + encodeURIComponent(p), null, { raw: true }); return new Blob([await r.arrayBuffer()], { type: 'image/jpeg' }); },
    async delFotos(paths, msg) { return (await pxCall('POST', '/foto/hapus', { paths, msg })).jumlah; }
  };

  const backend = () => mode() === 'proxy' ? px : mode() === 'github' ? gh : demo;

  async function load() {
    emit('loading');
    try { db = await backend().load(); lastLoad = Date.now(); emit('saved'); return db; }
    catch (e) { emit('error', e.message); throw e; }
  }
  async function update(p, fn, msg) {
    emit('saving');
    try { const next = await backend().write(p, fn, msg); setIn(db, p, next); emit('saved'); return next; }
    catch (e) { emit('error', e.message); throw e; }
  }
  /* ---------- Foto absen ---------- */
  const fotoCache = new Map();
  async function simpanFoto(p, blob, msg) {
    emit('saving');
    try { await backend().putFoto(p, blob, msg); fotoCache.set(p, Promise.resolve({ blob, url: URL.createObjectURL(blob) })); emit('saved'); }
    catch (e) { emit('error', e.message); throw e; }
  }
  /** URL foto yang siap dipasang di <img>. Hasil disimpan di memori. */
  function ambilFoto(p) {
    if (!fotoCache.has(p)) {
      const job = backend().getFoto(p).then(blob => ({ blob, url: URL.createObjectURL(blob) }));
      job.catch(() => fotoCache.delete(p));
      fotoCache.set(p, job);
    }
    return fotoCache.get(p);
  }
  const bacaFoto = p => ambilFoto(p).then(x => x.url);
  /** Foto sebagai Blob (untuk ekspor ZIP). */
  const blobFoto = p => ambilFoto(p).then(x => x.blob);
  async function hapusFoto(paths, msg) {
    if (!paths.length) return 0;
    emit('saving');
    try { const n = await backend().delFotos(paths, msg); paths.forEach(p => fotoCache.delete(p)); emit('saved'); return n; }
    catch (e) { emit('error', e.message); throw e; }
  }

  async function remove(p, msg) {
    emit('saving');
    try { await backend().remove(p, msg); setIn(db, p, undefined); emit('saved'); }
    catch (e) { emit('error', e.message); throw e; }
  }
  async function test() {
    const c = conn();
    const r = await req('GET', `/repos/${c.owner}/${c.repo}`);
    if (!r.ok) throw await httpErr(r);
    const j = await r.json();
    const b = await req('GET', `/repos/${c.owner}/${c.repo}/branches/${encodeURIComponent(c.branch)}`);
    if (b.status === 404) throw err('BRANCH', `Branch "${c.branch}" tidak ada. Branch utama repositori ini: "${j.default_branch}".`);
    return { private: j.private, defaultBranch: j.default_branch, fullName: j.full_name };
  }
  async function initRepo() {
    for (const p of ['pengaturan.json', 'siswa.json', 'materi.json', 'tugas.json'])
      await gh.write(p, cur => cur, `siapkan ${p}`);
  }
  function activationLink() {
    const c = conn();
    const payload = b64enc(JSON.stringify({ o: c.owner, r: c.repo, b: c.branch, p: c.path, t: c.token }));
    return location.origin + location.pathname + '#aktivasi=' + encodeURIComponent(payload);
  }
  function readActivation() {
    const m = location.hash.match(/^#aktivasi=(.+)$/);
    if (!m) return false;
    history.replaceState(null, '', location.pathname + location.search);
    const j = safeParse(b64dec(decodeURIComponent(m[1])));
    if (!j || !j.t) return false;
    setConn({ owner: j.o, repo: j.r, branch: j.b || 'main', path: j.p ?? 'data', token: j.t, useDemo: false });
    return true;
  }
  function resetDemo() { for (const k of LS.keys()) if (k.startsWith('data:') || k.startsWith('foto:')) LS.del(k); }

  /* ---------- Data contoh untuk mode demo ---------- */
  const LOKASI_CONTOH = { aktif: true, nama: 'SMK Negeri Contoh', lat: -5.147665, lng: 119.432731, radius: 150 };
  function seedDemo() {
    const now = new Date(), day = n => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };
    const dl = n => { const d = day(n); return `${ymd(d)}T23:59`; };
    const siswa = [
      ['0081234501', 'Aulia Rahmawati', 'Makassar', '2010-03-14', 'X TJKT 1', 'mandiri'],
      ['0081234502', 'Bima Prasetyo', 'Gowa', '2010-07-02', 'X TJKT 1', 'guru'],
      ['0081234503', 'Citra Lestari', 'Maros', '2010-11-21', 'X TJKT 2', 'guru'],
      ['0071234504', 'Dimas Saputra', 'Makassar', '2009-05-09', 'XI TJKT 1', 'mandiri'],
      ['0061234505', 'Nadia Putri Ramadhani', 'Pare-Pare', '2008-12-30', 'XII TJKT 2', 'guru']
    ].map(([nisn, nama, tempatLahir, tanggalLahir, kelas, sumber]) => ({ nisn, nama, tempatLahir, tanggalLahir, kelas, passHash: hashPass(nisn, 'siswa123'), sumber, dibuat: now.toISOString() }));
    const materi = [
      { id: 'm-glb', judul: 'Gerak Lurus Beraturan (GLB)', mapel: 'Fisika', kelas: 'Semua', tipe: 'teks', dibuat: day(-3).toISOString(),
        konten: '## Pengertian\nGerak lurus beraturan adalah gerak benda pada lintasan lurus dengan **kecepatan tetap**. Artinya, dalam selang waktu yang sama benda menempuh jarak yang sama.\n\n## Rumus\n`v = s / t`\n\n- v = kecepatan (m/s)\n- s = jarak tempuh (m)\n- t = waktu (s)\n\n## Contoh soal\nSebuah sepeda motor menempuh jarak 120 m dalam 8 s dengan kecepatan tetap. Kecepatannya adalah 120 / 8 = ==15 m/s==.\n\n> Ingat: pada GLB, percepatan bernilai nol.' },
      { id: 'm-sel', judul: 'Sel sebagai Unit Terkecil Kehidupan', mapel: 'Biologi', kelas: 'Semua', tipe: 'link', dibuat: day(-2).toISOString(),
        link: 'https://id.wikipedia.org/wiki/Sel_(biologi)', catatan: 'Baca bagian struktur sel dan perbedaan sel hewan dengan sel tumbuhan. Catat minimal 5 organel beserta fungsinya.' },
      { id: 'm-kuadrat', judul: 'Persamaan Kuadrat dan Akar-akarnya', mapel: 'Matematika', kelas: 'X TJKT 1', tipe: 'teks', dibuat: day(-1).toISOString(),
        konten: '## Bentuk umum\n`ax² + bx + c = 0`, dengan a ≠ 0.\n\n## Cara menentukan akar\n1. Memfaktorkan\n2. Melengkapkan kuadrat sempurna\n3. Rumus ABC\n\n## Diskriminan\n`D = b² − 4ac`\n- D > 0 : dua akar real berbeda\n- D = 0 : dua akar kembar\n- D < 0 : akar tidak real' }
    ];
    const tugas = [
      { id: 't-glb', judul: 'Kuis GLB', mapel: 'Fisika', kelas: 'Semua', mode: 'app', terbit: true, acak: false, tampilkanNilai: true,
        deskripsi: 'Kerjakan dengan jujur. Gunakan rumus v = s / t.', deadline: dl(3), dibuat: day(-3).toISOString(),
        soal: [
          { id: 'q1', tipe: 'pg', pertanyaan: 'Benda yang bergerak lurus beraturan memiliki …', opsi: ['Percepatan tetap', 'Kecepatan tetap', 'Kecepatan bertambah', 'Percepatan bertambah'], kunci: 1, bobot: 1 },
          { id: 'q2', tipe: 'pg', pertanyaan: 'Mobil menempuh 300 m dalam 20 s. Kecepatannya adalah …', opsi: ['10 m/s', '15 m/s', '20 m/s', '6.000 m/s'], kunci: 1, bobot: 1 },
          { id: 'q3', tipe: 'pg', pertanyaan: 'Satuan kecepatan dalam SI adalah …', opsi: ['km/jam', 'm/s²', 'm/s', 'cm/s'], kunci: 2, bobot: 1 },
          { id: 'q4', tipe: 'essay', pertanyaan: 'Jelaskan perbedaan GLB dan GLBB!', kataKunci: ['kecepatan tetap', 'percepatan', 'berubah'], rubrik: 'GLB: kecepatan tetap, percepatan nol. GLBB: kecepatan berubah karena ada percepatan tetap.', bobot: 3 }
        ] },
      { id: 't-kuadrat', judul: 'Latihan Persamaan Kuadrat', mapel: 'Matematika', kelas: 'X TJKT 1', mode: 'link', terbit: true,
        deskripsi: 'Kerjakan 10 soal di Google Form. Setelah selesai, kembali ke sini dan tekan "Saya sudah mengerjakan".', link: 'https://docs.google.com/forms', deadline: dl(5), dibuat: day(-1).toISOString(), soal: [] }
    ];
    const status = ['Hadir', 'Hadir', 'Terlambat', 'Hadir', 'Izin', 'Hadir', 'Sakit', 'Hadir'];
    for (const [i, s] of siswa.entries()) {
      const rec = [];
      for (let k = 7; k >= 1; k--) {
        const d = day(-k); if (d.getDay() === 0) continue;
        const st = status[(i * 3 + k) % status.length];
        const hadir = st === 'Hadir' || st === 'Terlambat', jr = 12 + ((i * 17 + k * 11) % 95);
        const pos = hadir ? Lokasi.geser(LOKASI_CONTOH, jr, (i * 70 + k * 40) % 360) : null;
        rec.push({ tanggal: ymd(d), jam: st === 'Terlambat' ? '07:48' : `07:${pad(5 + ((i * 7 + k) % 20))}`, status: st, keterangan: st === 'Izin' ? 'Acara keluarga' : st === 'Sakit' ? 'Demam' : '', oleh: 'siswa',
          ...(hadir ? { lokasi: { jarak: jr, akurasi: 6 + ((i + k) % 14), lat: +pos.lat.toFixed(5), lng: +pos.lng.toFixed(5) } } : {}) });
      }
      // Foto contoh untuk dua catatan Hadir terakhir.
      for (const a of rec.filter(x => x.lokasi).slice(-2)) {
        const path = `foto/${a.tanggal.slice(0, 7)}/${s.nisn}_${a.tanggal}.jpg`;
        const cv = Kamera.simulasi(s.nama, [`${s.nama} · NISN ${s.nisn}`, `${a.tanggal} ${a.jam}`, `${a.status} · ${a.lokasi.jarak} m dari ${LOKASI_CONTOH.nama}`]);
        try { LS.set('foto:' + path, cv.toDataURL('image/jpeg', .7)); a.foto = { path, sumber: 'simulasi' }; } catch { }
      }
      LS.set(`data:absensi/${s.nisn}.json`, JSON.stringify(rec));
    }
    LS.set('data:jawaban/0081234502.json', JSON.stringify([{ tugasId: 't-glb', mode: 'app', jawaban: { q1: 1, q2: 1, q3: 0, q4: 'GLB kecepatannya tetap, sedangkan GLBB kecepatannya berubah-ubah.' }, koreksi: {}, status: 'otomatis', nilai: 0, dikumpulkan: day(-1).toISOString() }]));
    LS.set('data:pengaturan.json', JSON.stringify({ ...defaultPengaturan(), lokasiAbsen: window.FORCE_DEMO ? LOKASI_CONTOH : { ...LOKASI_CONTOH, aktif: false } }));
    LS.set('data:siswa.json', JSON.stringify(siswa));
    LS.set('data:materi.json', JSON.stringify(materi));
    LS.set('data:tugas.json', JSON.stringify(tugas));
  }

  /* ---------- Akun lewat perantara ---------- */
  async function masuk(user, pass) {
    const j = await pxCall('POST', '/login', { user, pass });
    sesi.set(j.token, j.user); return j.user;
  }
  async function daftar(data, pass) {
    const j = await pxCall('POST', '/daftar', { ...data, pass });
    sesi.set(j.token, j.user); return j;
  }
  const gantiSandiSiswa = (lama, baru) => pxCall('POST', '/sandi', { lama, baru });
  const initProxy = () => pxCall('POST', '/init', {});
  const statusProxy = () => pxCall('GET', '/status');

  return {
    get db() { return db; }, get lastLoad() { return lastLoad; },
    sesi, masuk, daftar, gantiSandiSiswa, initProxy, statusProxy,
    mode, conn, setConn, onStatus: f => subs.add(f),
    load, update, remove, simpanFoto, bacaFoto, blobFoto, hapusFoto, test, initRepo, activationLink, readActivation, resetDemo,
    get local() { return LS; }, defaultPengaturan
  };
})();
