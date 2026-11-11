/* ================================================================
   lokasi.js — lokasi absen (geofence).
   Guru menentukan titik lokasi dan radius (meter). Saat siswa
   memilih "Hadir", HP membaca GPS, lalu jarak ke titik dihitung.
   Absen Hadir hanya bisa dikirim bila siswa berada di dalam radius.
   ================================================================ */
const Lokasi = (() => {
  const R = 6371008.8; // jari-jari bumi (m)
  const rad = d => d * Math.PI / 180;

  /** Jarak dua titik dalam meter (rumus haversine). */
  function jarak(a, b) {
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  /** Arah dari a ke b dalam derajat (0 = utara, searah jarum jam). */
  function arah(a, b) {
    const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  /** Titik baru berjarak m meter ke arah deg dari a (dipakai simulasi). */
  function geser(a, m, deg) {
    const d = m / R, t = rad(deg), la = rad(a.lat), lo = rad(a.lng);
    const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(t));
    const lo2 = lo + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    return { lat: la2 * 180 / Math.PI, lng: lo2 * 180 / Math.PI };
  }
  const fmtM = m => m >= 1000 ? `${(m / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km` : `${Math.round(m)} m`;

  /** Baca koordinat dari "-5.1477, 119.4327" atau link Google Maps. */
  function parse(t) {
    t = String(t || '').trim();
    const pats = [/@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i, /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, /(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)/];
    for (const p of pats) {
      const m = t.match(p); if (!m) continue;
      const lat = parseFloat(m[1].replace(',', '.')), lng = parseFloat(m[2].replace(',', '.'));
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    }
    return null;
  }
  const mapsLink = p => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;

  /** Pengaturan lokasi dengan nilai bawaan. */
  const conf = () => ({ aktif: false, nama: '', lat: null, lng: null, radius: 100, ...(SET().lokasiAbsen || {}) });
  const siap = c => c.aktif && Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.radius > 0;
  /** Batas akurasi GPS yang masih diterima. */
  const batasAkurasi = c => Math.max(150, c.radius * 1.5);

  /** Ambil posisi perangkat. Menolak dengan pesan yang mudah dipahami. */
  function posisi() {
    return new Promise((res, rej) => {
      if (!window.isSecureContext) return rej(new Error('Lokasi hanya bisa dibaca bila aplikasi dibuka lewat alamat https://.'));
      if (!navigator.geolocation) return rej(new Error('Browser ini tidak mendukung lokasi. Gunakan Chrome atau Safari terbaru.'));
      navigator.geolocation.getCurrentPosition(
        p => res({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: p.coords.accuracy, waktu: Date.now() }),
        e => rej(new Error(
          e.code === 1 ? 'Izin lokasi ditolak. Izinkan akses lokasi untuk situs ini di pengaturan browser, lalu coba lagi.'
            : e.code === 3 ? 'Lokasi tidak ditemukan dalam 20 detik. Pastikan GPS menyala, lalu coba lagi di tempat terbuka.'
              : 'Lokasi tidak bisa dibaca. Nyalakan GPS (Lokasi) di HP, lalu coba lagi.')),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    });
  }

  /** Nilai posisi terhadap lokasi absen. */
  function nilai(fix, c) {
    const pusat = { lat: c.lat, lng: c.lng }, j = jarak(pusat, fix);
    const r = { ...fix, jarak: j, arah: arah(pusat, fix), ok: false, alasan: '' };
    if (fix.akurasi > batasAkurasi(c)) r.lemah = true, r.alasan = `Lokasi kurang akurat (±${fmtM(fix.akurasi)}). Nyalakan GPS, keluar ruangan atau dekati jendela, lalu cek lagi.`;
    else if (j > c.radius) r.alasan = `Kamu berada ${fmtM(j)} dari ${c.nama || 'lokasi absen'}. Absen Hadir hanya bisa dalam radius ${fmtM(c.radius)}.`;
    else r.ok = true;
    return r;
  }

  /** Gambar radar: lingkaran radius, titik lokasi, dan posisi siswa. */
  function radar(c, fix, { size = 220 } = {}) {
    const cx = 110, cy = 110, maxPx = 92;
    const span = Math.max(c.radius * 1.35, fix ? Math.min(fix.jarak * 1.15, c.radius * 8) : 0);
    const k = maxPx / span, rPx = c.radius * k;
    const rings = [.33, .66, 1].map(f => `<circle cx="${cx}" cy="${cy}" r="${(maxPx * f).toFixed(1)}" class="rd-grid"/>`).join('');
    let dot = '';
    if (fix) {
      const d = Math.min(fix.jarak * k, maxPx + 6), t = rad(fix.arah);
      const x = cx + d * Math.sin(t), y = cy - d * Math.cos(t);
      const acc = Math.min(fix.akurasi * k, maxPx);
      const out = fix.jarak * k > maxPx + 6;
      dot = `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="rd-line ${fix.ok ? 'ok' : 'bad'}"/>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(acc, 4).toFixed(1)}" class="rd-acc ${fix.ok ? 'ok' : 'bad'}"/>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" class="rd-me ${fix.ok ? 'ok' : 'bad'}"/>
        ${out ? `<text x="${x.toFixed(1)}" y="${(y + (y > cy ? -12 : 20)).toFixed(1)}" class="rd-lbl" text-anchor="middle">${fmtM(fix.jarak)}</text>` : ''}`;
    }
    return `<svg class="radar" viewBox="0 0 220 220" width="${size}" height="${size}" role="img" aria-label="${fix ? `Posisimu ${fmtM(fix.jarak)} dari titik absen, batas ${fmtM(c.radius)}` : `Radius absen ${fmtM(c.radius)}`}">
      ${rings}<line x1="${cx}" y1="14" x2="${cx}" y2="206" class="rd-grid"/><line x1="14" y1="${cy}" x2="206" y2="${cy}" class="rd-grid"/>
      <circle cx="${cx}" cy="${cy}" r="${rPx.toFixed(1)}" class="rd-zone"/>
      <text x="${cx}" y="11" class="rd-n" text-anchor="middle">U</text>
      <text x="${(cx + rPx * .7071 + 4).toFixed(1)}" y="${(cy - rPx * .7071 - 4).toFixed(1)}" class="rd-lbl">${fmtM(c.radius)}</text>
      <circle cx="${cx}" cy="${cy}" r="5" class="rd-center"/>${dot}
    </svg>`;
  }

  return { jarak, arah, geser, fmtM, parse, mapsLink, conf, siap, batasAkurasi, posisi, nilai, radar };
})();
