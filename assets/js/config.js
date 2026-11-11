b/* ================================================================
   KONFIGURASI KELAS LANGIT
   ----------------------------------------------------------------
   CARA YANG DISARANKAN — perantara Cloudflare:
     Isi "proxy" dengan alamat Cloudflare Worker Anda, misalnya
     'https://kelas-langit-api.namaanda.workers.dev'.
     Siswa cukup membuka link aplikasi lalu langsung bisa daftar/masuk.
     Token GitHub tersimpan rahasia di Cloudflare (lihat README).

   CARA LAMA — token per perangkat:
     Kosongkan "proxy" dan isi bagian "github". Setiap perangkat
     perlu link aktivasi dari guru.

   Jika keduanya kosong, aplikasi berjalan dalam MODE DEMO
   (data hanya tersimpan di browser yang sedang dipakai).

   JANGAN menulis token GitHub di file ini.
   Saat memperbarui aplikasi, JANGAN menimpa file ini.
   ================================================================ */
window.APP_CONFIG = {
  proxy: 'cobaapi.muhammadrahman02.workers.dev',            // contoh: 'https://kelas-langit-api.namaanda.workers.dev'
  github: {
    owner: 'erjehub',          // contoh: 'erje-guru'  (username GitHub Anda)
    repo: 'kjonline_data',           // contoh: 'kelas-langit-data'
    branch: 'main',     // branch repositori data
    path: 'data'        // folder tempat file JSON disimpan
  }
};
