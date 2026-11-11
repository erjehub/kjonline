/* ================================================================
   ui.js — fungsi bantu tampilan: ikon, format tanggal, modal,
   toast, markdown sederhana, embed link, ekspor CSV, hash sandi.
   ================================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const toDate = s => new Date(String(s).length === 10 ? s + 'T00:00:00' : s);
const fmtTgl = (s, opt) => toDate(s).toLocaleDateString('id-ID', opt || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtTglPendek = s => s ? fmtTgl(s, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtWaktu = s => s ? toDate(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const initials = n => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const hueOf = s => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const norm = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const round1 = n => Math.round(n * 10) / 10;

function sisaWaktu(iso) {
  if (!iso) return { lewat: false, teks: 'Tanpa tenggat' };
  const ms = toDate(iso) - Date.now();
  if (ms < 0) return { lewat: true, teks: 'Tenggat lewat' };
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
  return { lewat: false, mendesak: ms < 864e5, teks: d ? `${d} hari ${h} jam lagi` : h ? `${h} jam ${mm} mnt lagi` : `${mm} menit lagi` };
}
function sapaan() { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }

/* ---------- SHA-256 (sinkron, tanpa dependensi) ---------- */
function sha256(msg) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const b = new TextEncoder().encode(msg), l = b.length, n = ((l + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(n); m.set(b); m[l] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor(l * 8 / 4294967296));
  const w = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
  for (let i = 0; i < n; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = r(w[t - 15], 7) ^ r(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = r(w[t - 2], 17) ^ r(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, bb, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) >>> 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
    }
    H = [H[0] + a, H[1] + bb, H[2] + c, H[3] + d, H[4] + e, H[5] + f, H[6] + g, H[7] + h].map(x => x >>> 0);
  }
  return H.map(x => x.toString(16).padStart(8, '0')).join('');
}
const hashPass = (user, pass) => sha256('kelaslangit:' + String(user).trim().toLowerCase() + ':' + pass);

/* ---------- Base64 UTF-8 ---------- */
function b64enc(s) {
  const bytes = new TextEncoder().encode(s); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64dec(b) {
  const bin = atob(String(b).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

const UI = (() => {
  /* ---------- Ikon garis 24px ---------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    video: '<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m22 8-6 4 6 4z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    cloud: '<path d="M17.5 19H8a6 6 0 1 1 5.7-7.9A4.5 4.5 0 1 1 17.5 19z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14 9l2 2"/>',
    git: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="8" r="3"/><path d="M6 9v6M18 11a6 6 0 0 1-6 6H9"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    form: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    pen: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    flag: '<path d="M4 22V4a1 1 0 0 1 1-1h12l-2 4 2 4H5"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.alert}</svg>`;

  const avatar = (name, cls = '') => `<span class="avatar ${cls}" style="--h:${hueOf(name)}">${esc(initials(name))}</span>`;
  const mapelChip = m => m ? `<span class="chip mapel" style="--h:${hueOf(m)}">${esc(m)}</span>` : '';

  /* ---------- Toast ---------- */
  function toast(msg, type = 'ok', ms = 3200) {
    const box = $('#toasts'); if (!box) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${icon(type === 'bad' ? 'alert' : type === 'info' ? 'cloud' : 'check')}<span>${esc(msg)}</span>`;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
  }

  /* ---------- Modal ---------- */
  function modal({ title, body, foot = '', size = '', actions = {}, onMount, onClose, autofocus = true }) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal ${size}" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn" data-act="__close" aria-label="Tutup">${icon('x')}</button></header>
      <div class="modal-body">${body}</div>${foot ? `<footer class="modal-foot">${foot}</footer>` : ''}</div>`;
    const m = wrap.firstElementChild;
    m._actions = actions;
    const close = () => {
      wrap.classList.add('out'); document.removeEventListener('keydown', onKey);
      setTimeout(() => wrap.remove(), 200); onClose && onClose();
    };
    actions.__close = close;
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });
    document.body.appendChild(wrap);
    const first = m.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),textarea,select');
    setTimeout(() => { if (m.contains(document.activeElement) && document.activeElement !== m) return; (autofocus && first ? first : m).focus({ preventScroll: true }); }, 60);
    onMount && onMount(m, close);
    return { el: m, close };
  }

  function confirm({ title = 'Yakin?', msg = '', ok = 'Hapus', danger = true } = {}) {
    return new Promise(res => {
      let done = false;
      const { close } = modal({
        title, size: 'sm', body: `<p class="confirm-msg">${msg}</p>`,
        foot: `<button class="btn ghost" data-act="no">Batal</button><button class="btn ${danger ? 'danger' : 'primary'}" data-act="yes">${esc(ok)}</button>`,
        actions: { yes: () => { done = true; res(true); close(); }, no: () => close() },
        onClose: () => { if (!done) res(false); }
      });
    });
  }

  function empty(ic, title, text = '', extra = '') {
    return `<div class="empty"><div class="empty-ic">${icon(ic)}</div><h3>${esc(title)}</h3>${text ? `<p>${text}</p>` : ''}${extra}</div>`;
  }

  /* ---------- Cincin progres ---------- */
  function ring(pct, label = '', size = 76) {
    const r = 15.9155, v = Math.max(0, Math.min(100, pct || 0));
    return `<div class="ring ${v === 0 ? 'zero' : ''}" style="--s:${size}px"><svg viewBox="0 0 36 36"><circle class="ring-bg" cx="18" cy="18" r="${r}"/><circle class="ring-fg" cx="18" cy="18" r="${r}" stroke-dasharray="${v} 100"/></svg><span>${label || Math.round(v) + '%'}</span></div>`;
  }

  /* ---------- Markdown sederhana & aman ---------- */
  function md(src) {
    const lines = esc(src || '').split(/\r?\n/);
    const out = []; let list = null, para = [];
    const inline = s => s
      .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>');
    const flushP = () => { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } };
    const flushL = () => { if (list) { out.push(`<${list.t}>` + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + `</${list.t}>`); list = null; } };
    for (const raw of lines) {
      const l = raw.trimEnd(); let m;
      if (!l.trim()) { flushP(); flushL(); continue; }
      if ((m = l.match(/^(#{1,3})\s+(.*)$/))) { flushP(); flushL(); const n = m[1].length + 1; out.push(`<h${n}>${inline(m[2])}</h${n}>`); continue; }
      if ((m = l.match(/^\s*[-*]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
      if ((m = l.match(/^\s*\d+[.)]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
      if ((m = l.match(/^&gt;\s?(.*)$/))) { flushP(); flushL(); out.push('<blockquote>' + inline(m[1]) + '</blockquote>'); continue; }
      if (/^-{3,}$/.test(l.trim())) { flushP(); flushL(); out.push('<hr>'); continue; }
      flushL(); para.push(l);
    }
    flushP(); flushL();
    return out.join('');
  }
  const plain = s => String(s || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#*`>=_-]/g, '').replace(/\s+/g, ' ').trim();

  /* ---------- Link: deteksi jenis & embed ---------- */
  function linkInfo(u) {
    try {
      const url = new URL(u); const h = url.hostname.replace(/^(www|m)\./, '');
      let embed = '', kind = 'Tautan', ic = 'link';
      if (h === 'youtu.be') { embed = 'https://www.youtube.com/embed/' + url.pathname.slice(1); kind = 'Video'; ic = 'video'; }
      else if (h === 'youtube.com') {
        kind = 'Video'; ic = 'video';
        const v = url.searchParams.get('v'), m = url.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/);
        if (v) embed = 'https://www.youtube.com/embed/' + v; else if (m) embed = 'https://www.youtube.com/embed/' + m[2];
      } else if (h === 'drive.google.com') {
        kind = 'Dokumen'; ic = 'file';
        const m = url.pathname.match(/\/file\/d\/([\w-]+)/); if (m) embed = `https://drive.google.com/file/d/${m[1]}/preview`;
      } else if (h === 'docs.google.com') {
        const m = url.pathname.match(/^\/(document|presentation|spreadsheets|forms)\/d\/(e\/)?([\w-]+)/);
        if (m && m[1] === 'forms') { kind = 'Google Form'; ic = 'form'; embed = `https://docs.google.com/forms/d/${m[2] || ''}${m[3]}/viewform?embedded=true`; }
        else if (m) { kind = 'Dokumen'; ic = 'file'; embed = `https://docs.google.com/${m[1]}/d/${m[3]}/preview`; }
      } else if (h === 'forms.gle' || h === 'forms.office.com') { kind = 'Form'; ic = 'form'; }
      else if (/\.pdf$/i.test(url.pathname)) { kind = 'PDF'; ic = 'file'; embed = u; }
      if (window.NO_EMBED) embed = '';
      return { ok: /^https?:$/.test(url.protocol), embed, kind, ic, host: h };
    } catch { return { ok: false, embed: '', kind: 'Tautan', ic: 'link', host: '' }; }
  }

  /* ---------- Salin & ekspor ---------- */
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Disalin ke papan klip'); return true; }
    catch { toast('Tidak bisa menyalin otomatis. Pilih teksnya lalu salin manual.', 'info'); return false; }
  }
  const csv = rows => rows.map(r => r.map(v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
  /** Simpan berkas ke perangkat. Di pratinjau Claude memakai kemampuan "downloads". */
  async function saveFile(name, data, type = 'application/octet-stream') {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    if (!window.NO_DOWNLOAD) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast(`${name} diunduh`); return true;
    }
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
    if (!dl) return false;
    try { await dl.save({ filename: name, data: blob }); toast(`${name} disimpan`); return true; }
    catch (e) { if (e && e.code !== 'declined') toast(e.code === 'too_large' ? 'Berkas terlalu besar. Ekspor rentang yang lebih kecil.' : 'Berkas tidak bisa disimpan di tampilan ini.', 'bad'); return e && e.code === 'declined' ? null : false; }
  }
  async function exportText(name, text, type = 'text/csv') {
    const ok = await saveFile(name, new Blob(['﻿' + text], { type: type + ';charset=utf-8' }));
    if (ok !== false) return;
    modal({
      title: 'Ekspor ' + name, size: 'lg',
      body: `<p class="muted">Salin isi di bawah, lalu tempel ke Excel atau Google Sheets.</p><textarea id="exp-text" class="mono" rows="12" readonly>${esc(text)}</textarea>`,
      foot: `<button class="btn primary" data-act="cp">${icon('copy')} Salin</button>`,
      actions: { cp: () => copy(text) }
    });
  }

  /** Muat semua <img data-foto="path"> di dalam root, paling banyak 4 sekaligus. */
  function fotos(root = document) {
    const imgs = [...root.querySelectorAll('img[data-foto]:not([data-muat])')];
    imgs.forEach(im => im.setAttribute('data-muat', '1'));
    let k = 0;
    const kerja = async () => {
      while (k < imgs.length) {
        const im = imgs[k++];
        try { im.src = await Store.bacaFoto(im.dataset.foto); im.closest('.foto-box')?.classList.add('loaded'); }
        catch { const box = im.closest('.foto-box') || im.parentElement; box?.classList.add('missing'); im.replaceWith(Object.assign(document.createElement('span'), { className: 'foto-missing', textContent: 'Foto tidak tersedia' })); }
      }
    };
    for (let w = 0; w < 4; w++) kerja();
  }

  return { icon, avatar, mapelChip, toast, modal, confirm, empty, ring, md, plain, linkInfo, copy, csv, exportText, saveFile, fotos };
})();
const icon = UI.icon;
