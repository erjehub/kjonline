/* =================================================================
   Kelas Langit — perantara (proxy) Cloudflare Worker
   -----------------------------------------------------------------
   Token GitHub disimpan sebagai RAHASIA di Cloudflare, tidak pernah
   dikirim ke HP siswa. Aplikasi berbicara dengan worker ini; worker
   memeriksa siapa yang masuk lalu meneruskan ke repositori data.

   Variabel (Settings → Variables and Secrets):
     OWNER           username GitHub pemilik repositori data   (teks)
     REPO            nama repositori data, mis. kelas-langit-data (teks)
     BRANCH          main                                        (teks, opsional)
     DATA_PATH       data                                        (teks, opsional)
     ALLOWED_ORIGIN  https://USERNAME.github.io                  (teks, disarankan)
     GITHUB_TOKEN    token fine-grained, Contents: Read and write (RAHASIA)
     SESSION_SECRET  kalimat acak panjang ≥ 32 karakter            (RAHASIA)

   Hak akses:
     - Guru  : baca & ubah semua data.
     - Siswa : baca materi, tugas, pengaturan, data dirinya sendiri;
               hanya MENAMBAH absen hari ini, jawaban tugas, dan foto
               absennya sendiri. Tidak bisa mengubah nilai/koreksi,
               tidak bisa melihat data atau sandi siswa lain.
     - Tamu  : daftar akun siswa (bila dibuka guru) dan masuk.
   ================================================================= */

const KELAS = ['X TJKT 1', 'X TJKT 2', 'XI TJKT 1', 'XI TJKT 2', 'XII TJKT 1', 'XII TJKT 2'];
const SESI_HARI = 30;
const enc = new TextEncoder(), dec = new TextDecoder();

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(request, env);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      const status = e.status || 500;
      const body = { error: e.code || 'SERVER', message: status === 500 ? 'Terjadi kesalahan di server perantara.' : e.message };
      if (status === 500) console.error(e && e.stack || e);
      return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });
    }
  }
};

/* ---------------- Utilitas ---------------- */
const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
function corsHeaders(request, env) {
  const allow = (env.ALLOWED_ORIGIN || '*').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin') || '';
  const pick = allow.includes('*') ? '*' : allow.includes(origin) ? origin : allow[0];
  return { 'Access-Control-Allow-Origin': pick, 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Authorization,Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
}
const b64e = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = b64 => Uint8Array.from(atob(String(b64).replace(/\s/g, '')), c => c.charCodeAt(0));
const b64url = bytes => b64e(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = s => b64d(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
async function sha256hex(s) { const h = await crypto.subtle.digest('SHA-256', enc.encode(s)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join(''); }
const hashPass = (user, pass) => sha256hex('kelaslangit:' + String(user).trim().toLowerCase() + ':' + pass);
const pad = n => String(n).padStart(2, '0');
const ymdUTC = (d = new Date()) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
async function body(request) { try { return await request.json(); } catch { throw fail(400, 'BAD', 'Permintaan tidak valid.'); } }
function cekPath(p) {
  p = String(p || '');
  if (!/^[A-Za-z0-9_\-./]+$/.test(p) || p.includes('..') || p.startsWith('/')) throw fail(400, 'PATH', 'Nama berkas tidak valid.');
  return p;
}

/* ---------------- Sesi bertanda tangan (HMAC) ---------------- */
async function kunci(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw fail(500, 'CONFIG', 'SESSION_SECRET belum diatur.');
  return crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function buatSesi(env, user) {
  const payload = b64url(enc.encode(JSON.stringify({ ...user, exp: Date.now() + SESI_HARI * 864e5 })));
  const sig = b64url(new Uint8Array(await crypto.subtle.sign('HMAC', await kunci(env), enc.encode(payload))));
  return payload + '.' + sig;
}
async function bacaSesi(request, env) {
  const t = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t) return null;
  const [payload, sig] = t.split('.');
  if (!payload || !sig) throw fail(401, 'SESI', 'Sesi tidak valid. Silakan masuk lagi.');
  const raw = unb64url(sig);
  const ok = b64url(raw) === sig && await crypto.subtle.verify('HMAC', await kunci(env), raw, enc.encode(payload));
  if (!ok) throw fail(401, 'SESI', 'Sesi tidak valid. Silakan masuk lagi.');
  const u = JSON.parse(dec.decode(unb64url(payload)));
  if (!u.exp || u.exp < Date.now()) throw fail(401, 'SESI', 'Sesi sudah berakhir. Silakan masuk lagi.');
  return u;
}
async function wajibSesi(request, env, peran) {
  const u = await bacaSesi(request, env);
  if (!u) throw fail(401, 'SESI', 'Silakan masuk terlebih dahulu.');
  if (peran && u.role !== peran) throw fail(403, 'AKSES', 'Anda tidak punya akses untuk tindakan ini.');
  return u;
}

/* ---------------- Batas percobaan masuk (per instance) ---------------- */
const percobaan = new Map();
function batasi(key, max = 8, ms = 5 * 60e3) {
  const now = Date.now(), r = percobaan.get(key) || { n: 0, t: now };
  if (now - r.t > ms) { r.n = 0; r.t = now; }
  r.n++; percobaan.set(key, r);
  if (percobaan.size > 5000) percobaan.clear();
  if (r.n > max) throw fail(429, 'BATAS', 'Terlalu banyak percobaan. Tunggu 5 menit lalu coba lagi.');
}

/* ---------------- GitHub ---------------- */
function gh(env) {
  const owner = env.OWNER, repo = env.REPO, branch = env.BRANCH || 'main';
  const root = String(env.DATA_PATH ?? 'data').replace(/^\/+|\/+$/g, '');
  if (!owner || !repo || !env.GITHUB_TOKEN) throw fail(500, 'CONFIG', 'OWNER, REPO, atau GITHUB_TOKEN belum diatur.');
  const full = p => (root ? root + '/' : '') + p;
  const encPath = p => p.split('/').map(encodeURIComponent).join('/');
  const req = async (method, path, b, accept) => {
    const r = await fetch('https://api.github.com' + path, {
      method, body: b ? JSON.stringify(b) : undefined,
      headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'kelas-langit-proxy', ...(b ? { 'Content-Type': 'application/json' } : {}) }
    });
    return r;
  };
  const ghFail = async r => {
    const t = await r.text().catch(() => '');
    if (r.status === 401) return fail(502, 'TOKEN', 'Token GitHub di perantara tidak valid atau kedaluwarsa. Guru perlu memperbarui GITHUB_TOKEN di Cloudflare.');
    if (r.status === 403) return fail(502, 'GITHUB', 'GitHub menolak permintaan (izin token atau batas kuota).');
    if (r.status === 404) return fail(502, 'REPO', 'Repositori data tidak ditemukan atau token tidak punya akses.');
    return fail(502, 'GITHUB', `GitHub menolak permintaan (${r.status}). ${t.slice(0, 120)}`);
  };
  const contents = p => `/repos/${owner}/${repo}/contents/${encPath(full(p))}`;
  const api = {
    full, branch,
    async get(p) {
      const r = await req('GET', `${contents(p)}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`);
      if (r.status === 404) return null;
      if (!r.ok) throw await ghFail(r);
      const j = await r.json();
      let data = null; try { data = JSON.parse(dec.decode(b64d(j.content || ''))); } catch { }
      return { data, sha: j.sha };
    },
    async put(p, data, sha, msg) {
      const r = await req('PUT', contents(p), { message: msg || `perbarui ${full(p)}`, content: b64e(enc.encode(JSON.stringify(data, null, 2) + '\n')), branch, ...(sha ? { sha } : {}) });
      if (r.status === 409 || r.status === 422) return { conflict: true };
      if (!r.ok) throw await ghFail(r);
      return { sha: (await r.json()).content.sha };
    },
    async del(p, msg) {
      const cur = await req('GET', `${contents(p)}?ref=${encodeURIComponent(branch)}`);
      if (cur.status === 404) return;
      if (!cur.ok) throw await ghFail(cur);
      const r = await req('DELETE', contents(p), { message: msg || `hapus ${full(p)}`, sha: (await cur.json()).sha, branch });
      if (!r.ok && r.status !== 404) throw await ghFail(r);
    },
    async putBin(p, b64, msg) {
      for (let i = 0; i < 4; i++) {
        const cur = await req('GET', `${contents(p)}?ref=${encodeURIComponent(branch)}`);
        let sha; if (cur.status === 200) sha = (await cur.json()).sha; else if (cur.status !== 404) throw await ghFail(cur);
        const r = await req('PUT', contents(p), { message: msg || `foto ${full(p)}`, content: b64, branch, ...(sha ? { sha } : {}) });
        if (r.ok) return;
        if (r.status !== 409 && r.status !== 422) throw await ghFail(r);
      }
      throw fail(409, 'BENTROK', 'Foto gagal disimpan karena bentrok. Coba lagi.');
    },
    async getBin(p) {
      const r = await req('GET', `${contents(p)}?ref=${encodeURIComponent(branch)}`, null, 'application/vnd.github.raw+json');
      if (r.status === 404) throw fail(404, 'NOFOTO', 'Foto tidak ditemukan.');
      if (!r.ok) throw await ghFail(r);
      return r.arrayBuffer();
    },
    async delMany(paths, msg) {
      const g = `/repos/${owner}/${repo}/git`, j = async r => { if (!r.ok) throw await ghFail(r); return r.json(); };
      for (let i = 0; i < 4; i++) {
        const head = (await j(await req('GET', `${g}/ref/heads/${encodeURIComponent(branch)}`))).object.sha;
        const commit = await j(await req('GET', `${g}/commits/${head}`));
        const tree = await j(await req('GET', `${g}/trees/${commit.tree.sha}?recursive=1`));
        const ada = new Set((tree.tree || []).filter(x => x.type === 'blob').map(x => x.path));
        const hapus = paths.map(full).filter(p => ada.has(p));
        if (!hapus.length) return 0;
        const nt = await j(await req('POST', `${g}/trees`, { base_tree: commit.tree.sha, tree: hapus.map(path => ({ path, mode: '100644', type: 'blob', sha: null })) }));
        const nc = await j(await req('POST', `${g}/commits`, { message: msg || `hapus ${hapus.length} foto`, tree: nt.sha, parents: [head] }));
        const up = await req('PATCH', `${g}/refs/heads/${encodeURIComponent(branch)}`, { sha: nc.sha });
        if (up.ok) return hapus.length;
        if (up.status !== 409 && up.status !== 422) throw await ghFail(up);
      }
      throw fail(409, 'BENTROK', 'Data sedang berubah. Coba lagi.');
    },
    /** Ambil semua berkas JSON dalam satu permintaan GraphQL. */
    async loadAll() {
      const blob = '... on Blob{text}';
      const query = `query($o:String!,$r:String!,$e:String!){repository(owner:$o,name:$r){object(expression:$e){... on Tree{entries{name type object{${blob} ... on Tree{entries{name type object{${blob}}}}}}}}}}`;
      const r = await req('POST', '/graphql', { query, variables: { o: owner, r: repo, e: `${branch}:${root}` } });
      if (r.status === 401) throw await ghFail(r);
      const res = r.ok ? await r.json() : null;
      if (!res || res.errors?.length) return api.loadREST(); // cadangan bila GraphQL tidak tersedia untuk token
      const tree = res.data?.repository?.object;
      const d = { pengaturan: null, siswa: [], materi: [], tugas: [], absensi: {}, jawaban: {} };
      const parse = t => { try { return JSON.parse(t); } catch { return null; } };
      for (const e of tree?.entries || []) {
        if (e.type === 'blob' && e.object?.text != null) {
          const k = e.name.replace(/\.json$/, '');
          if (k in d && !['absensi', 'jawaban'].includes(k)) d[k] = parse(e.object.text) ?? d[k];
        }
        if (e.type === 'tree' && (e.name === 'absensi' || e.name === 'jawaban'))
          for (const f of e.object?.entries || []) if (f.type === 'blob' && f.name.endsWith('.json') && f.object?.text != null) d[e.name][f.name.slice(0, -5)] = parse(f.object.text) || [];
      }
      return d;
    },
    /** Cadangan tanpa GraphQL: baca isi folder lewat REST. */
    async loadREST() {
      const list = async p => { const r = await req('GET', `/repos/${owner}/${repo}/contents/${encPath(p)}?ref=${encodeURIComponent(branch)}`); if (r.status === 404) return []; if (!r.ok) throw await ghFail(r); return r.json(); };
      const d = { pengaturan: null, siswa: [], materi: [], tugas: [], absensi: {}, jawaban: {} };
      for (const k of ['pengaturan', 'siswa', 'materi', 'tugas']) { const f = await api.get(k + '.json'); if (f?.data) d[k] = f.data; }
      for (const dir of ['absensi', 'jawaban']) {
        const items = (await list(full(dir))).filter(x => x.type === 'file' && x.name.endsWith('.json'));
        await Promise.all(items.map(async x => { const f = await api.get(`${dir}/${x.name}`); d[dir][x.name.slice(0, -5)] = f?.data || []; }));
      }
      return d;
    },
    /** Baca → ubah → simpan, ulangi bila bentrok. */
    async update(p, fn, msg, def = []) {
      for (let i = 0; i < 6; i++) {
        const cur = await api.get(p);
        const next = await fn(structuredClone(cur?.data ?? def));
        const w = await api.put(p, next, cur?.sha, msg);
        if (!w.conflict) return next;
        await new Promise(r => setTimeout(r, 200 + Math.random() * 400 * (i + 1)));
      }
      throw fail(409, 'BENTROK', 'Data sedang diubah banyak orang. Coba lagi sebentar.');
    }
  };
  return api;
}

/* ---------------- Aturan data ---------------- */
const tanpaHash = p => p ? { ...p, admin: { ...(p.admin || {}), passHash: undefined } } : p;
const kelasUrut = k => { const i = KELAS.indexOf(k); return i < 0 ? 99 : i; };
function rapikanTeks(t) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  if (t !== t.toLowerCase() && t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s.'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}
function rapikanSiswa(list) {
  return (list || []).filter(s => s && s.nisn).map(s => ({
    nisn: String(s.nisn), nama: s.nama, tempatLahir: s.tempatLahir || '', tanggalLahir: s.tanggalLahir || '', kelas: s.kelas,
    passHash: s.passHash, sumber: s.sumber || 'guru', dibuat: s.dibuat || new Date().toISOString(), ...(s.diubah ? { diubah: s.diubah } : {})
  })).sort((a, b) => kelasUrut(a.kelas) - kelasUrut(b.kelas) || String(a.kelas).localeCompare(b.kelas) || a.nama.localeCompare(b.nama, 'id'));
}
function cekDataSiswa(v) {
  if (!/^\d{10}$/.test(v.nisn)) return 'NISN harus 10 digit angka.';
  if (v.nama.length < 3 || !/^[\p{L} .,'-]+$/u.test(v.nama)) return 'Nama lengkap minimal 3 huruf dan hanya berisi huruf.';
  if (v.tempatLahir.length < 2) return 'Tempat lahir wajib diisi.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.tanggalLahir) || isNaN(new Date(v.tanggalLahir))) return 'Tanggal lahir belum valid.';
  const umur = (Date.now() - new Date(v.tanggalLahir)) / 31557600000;
  if (umur < 10 || umur > 30) return 'Periksa kembali tanggal lahir.';
  if (!KELAS.includes(v.kelas)) return 'Pilih kelas yang tersedia.';
  return '';
}
function defaultPengaturan(adminHash) {
  return { namaAplikasi: 'Kelas Langit', sekolah: 'Nama Sekolah', tahunAjaran: '2026/2027', kkm: 75, jamMasuk: '07:30', bukaAbsen: '06:00', tutupAbsen: '14:00', registrasiTerbuka: true, wajibFoto: true, lokasiAbsen: { aktif: false, nama: '', lat: null, lng: null, radius: 100 }, admin: { username: 'erje', nama: 'Erje', passHash: adminHash } };
}
/** Sembunyikan kunci jawaban tugas yang belum dikerjakan siswa. */
function tugasUntukSiswa(tugas, jawabanSaya) {
  const sudah = new Set((jawabanSaya || []).map(j => j.tugasId));
  return (tugas || []).filter(t => t.terbit).map(t => {
    if (sudah.has(t.id)) return t;
    return { ...t, soal: (t.soal || []).map(q => { const { kunci, kataKunci, rubrik, ...rest } = q; return rest; }) };
  });
}
/** Siswa hanya boleh MENAMBAH satu catatan absen untuk hari ini (±1 hari zona waktu). Catatan lama tetap dari server. */
function cekAbsenSiswa(lama, baru) {
  lama = Array.isArray(lama) ? lama : [];
  if (!Array.isArray(baru)) throw fail(400, 'BAD', 'Format absen tidak valid.');
  const ada = new Set(lama.map(r => r.tanggal));
  const tambah = baru.filter(r => r && !ada.has(r.tanggal));
  if (!tambah.length) throw fail(409, 'SUDAH', 'Kamu sudah absen hari ini.');
  if (tambah.length > 1) throw fail(403, 'AKSES', 'Siswa hanya bisa menambah satu catatan absen.');
  const r = tambah[0], t = new Date();
  const boleh = [-1, 0, 1].map(k => ymdUTC(new Date(t.getTime() + k * 864e5)));
  if (!boleh.includes(r.tanggal)) throw fail(403, 'AKSES', 'Absen hanya bisa untuk hari ini.');
  if (!['Hadir', 'Terlambat', 'Izin', 'Sakit'].includes(r.status)) throw fail(403, 'AKSES', 'Status absen tidak valid.');
  const bersih = { tanggal: r.tanggal, jam: String(r.jam || '').slice(0, 5), status: r.status, keterangan: String(r.keterangan || '').slice(0, 300), oleh: 'siswa', diterima: t.toISOString() };
  if (r.lokasi && typeof r.lokasi === 'object') bersih.lokasi = { jarak: +r.lokasi.jarak || 0, akurasi: +r.lokasi.akurasi || 0, lat: +r.lokasi.lat, lng: +r.lokasi.lng };
  if (r.foto && typeof r.foto === 'object') bersih.foto = { path: String(r.foto.path || ''), sumber: String(r.foto.sumber || ''), ukuran: +r.foto.ukuran || 0 };
  return [...lama, bersih].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}
/** Siswa hanya boleh MENAMBAH jawaban tugas baru; jawaban lama, koreksi & nilai tetap dari server. */
function cekJawabanSiswa(lama, baru, tugas) {
  lama = Array.isArray(lama) ? lama : [];
  if (!Array.isArray(baru)) throw fail(400, 'BAD', 'Format jawaban tidak valid.');
  const ada = new Set(lama.map(r => r.tugasId));
  const tambah = baru.filter(r => r && !ada.has(r.tugasId));
  if (!tambah.length) throw fail(409, 'SUDAH', 'Tugas ini sudah pernah dikumpulkan.');
  const out = [...lama];
  for (const r of tambah) {
    const t = (tugas || []).find(x => x.id === r.tugasId && x.terbit);
    if (!t) throw fail(403, 'AKSES', 'Tugas tidak ditemukan.');
    if (out.some(o => o.tugasId === t.id)) continue;
    out.push({ tugasId: t.id, mode: t.mode, jawaban: t.mode === 'app' && r.jawaban && typeof r.jawaban === 'object' ? r.jawaban : {}, koreksi: {}, status: t.mode === 'app' ? 'terkirim' : 'menunggu', dikumpulkan: new Date().toISOString() });
  }
  return out;
}

/* ---------------- Rute ---------------- */
async function route(request, env) {
  const url = new URL(request.url), p = url.pathname.replace(/\/+$/, '') || '/', m = request.method;
  const G = gh(env);

  if (p === '/' || p === '/status') return json({ ok: true, aplikasi: 'kelas-langit-proxy', repo: `${env.OWNER}/${env.REPO}`, branch: G.branch });

  // Data umum untuk halaman masuk (tanpa sandi).
  if (p === '/publik' && m === 'GET') {
    const cur = await G.get('pengaturan.json');
    return json({ punyaData: !!cur?.data, pengaturan: tanpaHash(cur?.data) || null });
  }

  // Siapkan data awal — hanya bila repositori masih kosong.
  if (p === '/init' && m === 'POST') {
    if (await G.get('pengaturan.json')) throw fail(409, 'SUDAH', 'Data awal sudah ada.');
    await G.put('pengaturan.json', defaultPengaturan(await hashPass('admin', 'erje123')), null, 'siapkan pengaturan.json');
    for (const f of ['siswa.json', 'materi.json', 'tugas.json']) if (!(await G.get(f))) await G.put(f, [], null, `siapkan ${f}`);
    return json({ ok: true });
  }

  if (p === '/login' && m === 'POST') {
    const { user, pass } = await body(request);
    const u = String(user || '').trim();
    batasi((request.headers.get('CF-Connecting-IP') || 'x') + ':' + u.toLowerCase());
    const pg = (await G.get('pengaturan.json'))?.data;
    if (!pg) throw fail(409, 'NO_DATA', 'Data aplikasi belum disiapkan.');
    if (u.toLowerCase() === String(pg.admin.username).toLowerCase()) {
      if (await hashPass('admin', pass || '') !== pg.admin.passHash) throw fail(401, 'SALAH', 'NISN/username atau kata sandi salah.');
      const sesi = { role: 'admin', id: 'admin' };
      return json({ token: await buatSesi(env, sesi), user: sesi });
    }
    const s = ((await G.get('siswa.json'))?.data || []).find(x => x.nisn === u);
    if (!s) throw fail(401, 'BELUM', 'NISN belum terdaftar. Tekan "Daftar akun siswa" untuk membuat akun.');
    if (await hashPass(s.nisn, pass || '') !== s.passHash) throw fail(401, 'SALAH', 'NISN/username atau kata sandi salah.');
    const sesi = { role: 'siswa', id: s.nisn };
    return json({ token: await buatSesi(env, sesi), user: sesi });
  }

  if (p === '/daftar' && m === 'POST') {
    const b = await body(request);
    batasi('daftar:' + (request.headers.get('CF-Connecting-IP') || 'x'), 10, 10 * 60e3);
    const pg = (await G.get('pengaturan.json'))?.data;
    if (!pg) throw fail(409, 'NO_DATA', 'Data aplikasi belum disiapkan.');
    if (pg.registrasiTerbuka === false) throw fail(403, 'TUTUP', 'Pendaftaran sedang ditutup guru.');
    const v = { nisn: String(b.nisn || '').replace(/\D/g, ''), nama: rapikanTeks(b.nama), tempatLahir: rapikanTeks(b.tempatLahir), tanggalLahir: String(b.tanggalLahir || ''), kelas: String(b.kelas || '') };
    const salah = cekDataSiswa(v) || (String(b.pass || '').length < 6 ? 'Kata sandi minimal 6 karakter.' : '');
    if (salah) throw fail(422, 'DATA', salah);
    const passHash = await hashPass(v.nisn, b.pass);
    await G.update('siswa.json', l => {
      if (l.some(x => x.nisn === v.nisn)) throw fail(409, 'SUDAH', `NISN ${v.nisn} sudah terdaftar. Silakan masuk, atau hubungi guru bila lupa sandi.`);
      return rapikanSiswa([...l, { ...v, passHash, sumber: 'mandiri', dibuat: new Date().toISOString() }]);
    }, `registrasi siswa: ${v.nama} (${v.nisn})`);
    const sesi = { role: 'siswa', id: v.nisn };
    return json({ token: await buatSesi(env, sesi), user: sesi, siswa: { ...v, sumber: 'mandiri' } });
  }

  /* ----- Butuh sesi ----- */
  const u = await wajibSesi(request, env);
  const guru = u.role === 'admin';

  if (p === '/load' && m === 'GET') {
    const d = await G.loadAll();
    if (!d.pengaturan) throw fail(409, 'NO_DATA', 'Data aplikasi belum disiapkan.');
    if (guru) return json({ user: u, data: d });
    const saya = (d.siswa || []).find(s => s.nisn === u.id);
    if (!saya) throw fail(401, 'SESI', 'Akun tidak ditemukan. Silakan masuk lagi.');
    const { passHash, ...diri } = saya;
    const jaw = d.jawaban[u.id] || [];
    return json({ user: u, data: { pengaturan: tanpaHash(d.pengaturan), siswa: [diri], materi: d.materi, tugas: tugasUntukSiswa(d.tugas, jaw), absensi: { [u.id]: d.absensi[u.id] || [] }, jawaban: { [u.id]: jaw } } });
  }

  if (p === '/file' && m === 'GET') {
    const path = cekPath(url.searchParams.get('p'));
    if (!guru && !siswaBolehBaca(path, u.id)) throw fail(403, 'AKSES', 'Anda tidak punya akses ke data ini.');
    const cur = await G.get(path);
    let data = cur?.data ?? null;
    if (!guru && path === 'pengaturan.json') data = tanpaHash(data);
    if (!guru && path === 'tugas.json') data = tugasUntukSiswa(data, (await G.get(`jawaban/${u.id}.json`))?.data);
    return json({ data, sha: cur?.sha || null });
  }

  if (p === '/file' && m === 'PUT') {
    const b = await body(request), path = cekPath(b.p);
    if (guru) {
      const w = await G.put(path, b.content, b.sha || null, String(b.msg || '').slice(0, 200));
      if (w.conflict) throw fail(409, 'BENTROK', 'Data berubah. Coba lagi.');
      return json({ ok: true, sha: w.sha, data: b.content });
    }
    // Siswa: hanya absen & jawaban miliknya, dan hanya menambah.
    let next;
    if (path === `absensi/${u.id}.json`) {
      next = await G.update(path, lama => cekAbsenSiswa(lama, b.content), String(b.msg || `absen siswa ${u.id}`).slice(0, 200));
    } else if (path === `jawaban/${u.id}.json`) {
      const tugas = (await G.get('tugas.json'))?.data || [];
      next = await G.update(path, lama => cekJawabanSiswa(lama, b.content, tugas), String(b.msg || `jawaban siswa ${u.id}`).slice(0, 200));
    } else throw fail(403, 'AKSES', 'Anda tidak punya akses untuk mengubah data ini.');
    return json({ ok: true, data: next });
  }

  if (p === '/file/hapus' && m === 'POST') {
    if (!guru) throw fail(403, 'AKSES', 'Hanya guru yang bisa menghapus data.');
    const b = await body(request);
    await G.del(cekPath(b.p), String(b.msg || '').slice(0, 200));
    return json({ ok: true });
  }

  if (p === '/sandi' && m === 'POST') {
    if (guru) throw fail(400, 'BAD', 'Guru mengganti sandi lewat menu Pengaturan.');
    const b = await body(request);
    batasi('sandi:' + u.id);
    if (String(b.baru || '').length < 6) throw fail(422, 'DATA', 'Sandi baru minimal 6 karakter.');
    const lamaHash = await hashPass(u.id, b.lama || ''), baruHash = await hashPass(u.id, b.baru);
    await G.update('siswa.json', l => {
      const s = l.find(x => x.nisn === u.id);
      if (!s) throw fail(404, 'TIDAK_ADA', 'Akun tidak ditemukan.');
      if (s.passHash !== lamaHash) throw fail(401, 'SALAH_LAMA', 'Sandi lama tidak cocok.');
      s.passHash = baruHash; return rapikanSiswa(l);
    }, `ubah sandi siswa ${u.id}`);
    return json({ ok: true });
  }

  if (p === '/foto' && m === 'GET') {
    const path = cekPath(url.searchParams.get('p'));
    if (!path.startsWith('foto/')) throw fail(400, 'PATH', 'Bukan berkas foto.');
    if (!guru && !fotoMilik(path, u.id)) throw fail(403, 'AKSES', 'Anda tidak punya akses ke foto ini.');
    return new Response(await G.getBin(path), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' } });
  }

  if (p === '/foto' && m === 'POST') {
    const b = await body(request), path = cekPath(b.p);
    if (!path.startsWith('foto/')) throw fail(400, 'PATH', 'Bukan berkas foto.');
    if (!guru && !fotoMilik(path, u.id)) throw fail(403, 'AKSES', 'Foto hanya bisa disimpan untuk akunmu sendiri.');
    const bytes = b64d(b.b64 || '');
    if (bytes.length < 500 || bytes.length > 600 * 1024) throw fail(422, 'FOTO', 'Ukuran foto tidak wajar.');
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) throw fail(422, 'FOTO', 'Berkas bukan foto JPG.');
    await G.putBin(path, b.b64, String(b.msg || '').slice(0, 200));
    return json({ ok: true });
  }

  if (p === '/foto/hapus' && m === 'POST') {
    if (!guru) throw fail(403, 'AKSES', 'Hanya guru yang bisa menghapus foto.');
    const b = await body(request);
    const paths = (b.paths || []).map(cekPath).filter(x => x.startsWith('foto/'));
    return json({ ok: true, jumlah: await G.delMany(paths, String(b.msg || '').slice(0, 200)) });
  }

  throw fail(404, 'TIDAK_ADA', 'Alamat tidak dikenal.');
}
function siswaBolehBaca(path, nisn) {
  return ['pengaturan.json', 'materi.json', 'tugas.json'].includes(path) || path === `absensi/${nisn}.json` || path === `jawaban/${nisn}.json`;
}
const fotoMilik = (path, nisn) => new RegExp(`^foto/\\d{4}-\\d{2}/${nisn}_\\d{4}-\\d{2}-\\d{2}\\.jpg$`).test(path);
