/* ================================================================
   kamera.js — foto selfie saat absen.
   - Membuka kamera HP langsung di aplikasi (getUserMedia).
   - Foto dipotong 3:4, diperkecil ke 360×480 px, diberi cap
     nama, NISN, waktu, status, dan jarak lokasi, lalu disimpan
     sebagai JPG ±20–40 KB.
   - Bila kamera tidak bisa dibuka, siswa bisa memakai aplikasi
     kamera HP (ditandai "berkas" agar guru tahu).
   ================================================================ */
const Kamera = (() => {
  const W = 360, H = 480, Q = 0.72;
  let stream = null;
  const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };

  function pesanError(e) {
    if (!window.isSecureContext) return 'Kamera hanya bisa dibuka bila aplikasi dibuka lewat alamat https://.';
    if (!navigator.mediaDevices?.getUserMedia) return 'Browser ini tidak mendukung kamera langsung.';
    const n = e && e.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') return 'Izin kamera ditolak. Izinkan akses kamera untuk situs ini di pengaturan browser, lalu coba lagi.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Kamera tidak ditemukan di perangkat ini.';
    if (n === 'NotReadableError' || n === 'AbortError') return 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi tersebut, lalu coba lagi.';
    return 'Kamera tidak bisa dibuka.';
  }

  /** Gambar sumber ke kanvas 3:4 lalu beri cap identitas. */
  function render(src, sw, sh, { mirror = false, cap = [] } = {}) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const r = W / H; let cw = sw, ch = sw / r; if (ch > sh) { ch = sh; cw = sh * r; }
    const sx = (sw - cw) / 2, sy = (sh - ch) / 2;
    g.save(); if (mirror) { g.translate(W, 0); g.scale(-1, 1); }
    g.drawImage(src, sx, sy, cw, ch, 0, 0, W, H); g.restore();
    capi(g, cap);
    return c;
  }
  function capi(g, cap) {
    if (!cap.length) return;
    const lh = 17, h = 16 + cap.length * lh;
    const grd = g.createLinearGradient(0, H - h - 30, 0, H);
    grd.addColorStop(0, 'rgba(4,22,34,0)'); grd.addColorStop(.35, 'rgba(4,22,34,.72)'); grd.addColorStop(1, 'rgba(4,22,34,.86)');
    g.fillStyle = grd; g.fillRect(0, H - h - 30, W, h + 30);
    g.textBaseline = 'alphabetic';
    cap.forEach((t, i) => {
      g.font = `${i === 0 ? 700 : 500} ${i === 0 ? 14 : 12}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
      g.fillStyle = i === 0 ? '#ffffff' : 'rgba(225,242,252,.92)';
      g.fillText(String(t).slice(0, 52), 12, H - h + 8 + (i + 1) * lh - 4);
    });
    g.fillStyle = '#87CEEB'; g.fillRect(0, H - 3, W, 3);
  }
  const keBlob = c => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Foto gagal diproses.')), 'image/jpeg', Q));

  /** Foto contoh untuk pratinjau (tanpa kamera). */
  function simulasi(nama, cap = []) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), h = hueOf(nama);
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, `hsl(${(h + 180) % 360} 45% 78%)`); bg.addColorStop(1, `hsl(${(h + 210) % 360} 55% 58%)`);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = `hsl(${h} 35% 28%)`;
    g.beginPath(); g.arc(W / 2, 205, 74, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(W / 2, 420, 150, 120, 0, Math.PI, 0); g.fill();
    g.fillStyle = 'rgba(255,255,255,.92)'; g.font = '700 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(initials(nama), W / 2, 207);
    g.font = '700 11px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('FOTO SIMULASI', W / 2, 28);
    g.textAlign = 'left';
    capi(g, cap);
    return c;
  }

  /** Waktu lengkap untuk cap foto, mis. "Rabu, 11 November 2026 07.15.32 WITA". */
  function waktuCap(d = new Date()) {
    const tz = (d.toLocaleTimeString('id-ID', { timeZoneName: 'short' }).match(/[A-Z]{3,5}|GMT[+-]\d+/) || [''])[0];
    return `${d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ${tz}`.trim();
  }

  /**
   * Buka jendela kamera. Mengembalikan { blob, url, sumber, waktu } atau null bila dibatalkan.
   * opsi: judul, cap (fungsi → array baris cap), nama (untuk foto contoh), depan (true = kamera depan)
   */
  function ambil({ judul = 'Foto absen', cap = () => [], nama = '', depan = true, petunjuk = '' } = {}) {
    return new Promise(resolve => {
      let facing = depan ? 'user' : 'environment', hasil = null, selesai = false;
      const done = v => { if (selesai) return; selesai = true; stop(); if (!v && hasil) URL.revokeObjectURL(hasil.url); resolve(v); };
      const { el, close } = UI.modal({
        title: judul, size: 'sm', autofocus: false,
        body: `<div class="cam" id="cam">
            <video id="cam-v" playsinline muted autoplay></video>
            <img id="cam-img" alt="Hasil foto" hidden>
            <div class="cam-guide" id="cam-guide" aria-hidden="true"></div>
            <div class="cam-state" id="cam-state"><span class="spin"></span><p>Membuka kamera…</p></div>
            <div class="cam-flash" id="cam-flash"></div>
          </div>
          <p class="hint center" id="cam-hint">${esc(petunjuk || 'Posisikan wajah di dalam bingkai, pastikan cahaya cukup.')}</p>
          <div class="cam-alt" id="cam-alt" hidden>
            <p class="alert warn" id="cam-err"></p>
            <label class="btn soft block">${icon('image')} Ambil foto dengan aplikasi kamera HP<input type="file" accept="image/*" capture="user" id="cam-file" hidden></label>
            ${window.FORCE_DEMO ? `<button type="button" class="btn ghost block" data-act="contoh">${icon('user')} Pakai foto contoh (pratinjau)</button>` : ''}
            <button type="button" class="btn ghost block" data-act="coba">${icon('refresh')} Coba buka kamera lagi</button>
          </div>`,
        foot: `<div class="cam-foot" id="cam-live">
            <button type="button" class="icon-btn lg" data-act="flip" aria-label="Ganti kamera depan/belakang" title="Ganti kamera">${icon('refresh')}</button>
            <button type="button" class="shutter" data-act="jepret" aria-label="Ambil foto" disabled><span></span></button>
            <button type="button" class="icon-btn lg" data-act="__close" aria-label="Batal" title="Batal">${icon('x')}</button>
          </div>
          <div class="cam-foot" id="cam-review" hidden>
            <button type="button" class="btn ghost" data-act="ulang">${icon('refresh')} Ulangi</button>
            <button type="button" class="btn primary" data-act="pakai">${icon('check')} Pakai foto ini</button>
          </div>`,
        onClose: () => done(null),
        actions: {
          flip: () => { facing = facing === 'user' ? 'environment' : 'user'; mulai(); },
          coba: () => mulai(),
          jepret: async () => {
            const v = $('#cam-v', el); if (!v.videoWidth) return;
            const fl = $('#cam-flash', el); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
            tampil(render(v, v.videoWidth, v.videoHeight, { mirror: facing === 'user', cap: cap() }), 'kamera');
          },
          contoh: () => tampil(simulasi(nama, cap()), 'simulasi'),
          ulang: () => { if (hasil) URL.revokeObjectURL(hasil.url); hasil = null; $('#cam-img', el).hidden = true; $('#cam-review', el).hidden = true; $('#cam-live', el).hidden = false; $('#cam-guide', el).hidden = false; if (stream) $('#cam-v', el).hidden = false; else mulai(); },
          pakai: () => { const h = hasil; hasil = null; done(h); close(); }
        }
      });
      const tampil = async (canvas, sumber) => {
        try {
          const blob = await keBlob(canvas);
          if (hasil) URL.revokeObjectURL(hasil.url);
          hasil = { blob, url: URL.createObjectURL(blob), sumber, waktu: Date.now() };
          $('#cam', el).hidden = false;
          const img = $('#cam-img', el); img.src = hasil.url; img.hidden = false;
          $('#cam-v', el).hidden = true; $('#cam-guide', el).hidden = true; $('#cam-state', el).hidden = true;
          $('#cam-live', el).hidden = true; $('#cam-review', el).hidden = false; $('#cam-alt', el).hidden = true;
          stop();
        } catch (e) { UI.toast(e.message, 'bad'); }
      };
      const gagal = msg => {
        $('#cam', el).hidden = true;
        $('#cam-state', el).hidden = true; $('#cam-guide', el).hidden = true; $('#cam-v', el).hidden = true;
        $('#cam-err', el).textContent = msg; $('#cam-alt', el).hidden = false; $('#cam-live', el).hidden = true;
        $('#cam-hint', el).hidden = true;
      };
      async function mulai() {
        stop();
        $('#cam', el).hidden = false; $('#cam-alt', el).hidden = true; $('#cam-live', el).hidden = false; $('#cam-hint', el).hidden = false;
        $('#cam-state', el).hidden = false; $('#cam-guide', el).hidden = false;
        const v = $('#cam-v', el); v.hidden = false; v.classList.toggle('mirror', facing === 'user');
        $('[data-act=jepret]', el.closest('.modal-wrap')).disabled = true;
        try {
          if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw { name: 'Unsupported' };
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 960 }, height: { ideal: 1280 } }, audio: false });
          if (selesai) return stop();
          v.srcObject = stream; await v.play().catch(() => { });
          $('#cam-state', el).hidden = true;
          $('[data-act=jepret]', el.closest('.modal-wrap')).disabled = false;
        } catch (e) { stop(); gagal(pesanError(e)); }
      }
      // Cadangan: aplikasi kamera bawaan HP.
      $('#cam-file', el).addEventListener('change', e => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        const img = new Image(), u = URL.createObjectURL(f);
        img.onload = () => { tampil(render(img, img.naturalWidth, img.naturalHeight, { cap: cap() }), 'berkas'); URL.revokeObjectURL(u); };
        img.onerror = () => { URL.revokeObjectURL(u); UI.toast('Berkas bukan gambar yang bisa dibaca.', 'bad'); };
        img.src = u; e.target.value = '';
      });
      mulai();
    });
  }

  return { ambil, simulasi, keBlob, waktuCap, stop, W, H };
})();
