# Kelas Langit

Sistem informasi pembelajaran jarak jauh berbasis web. Berjalan di **GitHub Pages**, menyimpan data sebagai file JSON di **repositori GitHub**, tanpa server dan tanpa biaya.

## Tampilan & animasi

Gaya kaca (*glassmorphism*) di atas latar gradien biru langit–teal. Saat berpindah menu, konten lama memudar dan mengabur, judul lalu kartu muncul satu per satu dari blur ke tajam, angka menghitung naik, batang grafik tumbuh, dan sorotan menu di sidebar meluncur ke menu yang dipilih. Animasi otomatis dimatikan bila perangkat diatur "kurangi gerakan", dan efek blur dikurangi di layar HP agar tetap lancar.

## Fitur

**Guru (akun `erje`, admin utama)**
- **Materi**: tulis langsung di aplikasi (tebal, miring, subjudul, daftar, gambar, tautan) atau tempel link. YouTube, Google Drive, Google Docs/Slides, dan PDF tampil langsung di aplikasi.
- **Tugas & soal**: pilihan ganda (2–6 pilihan, kunci jawaban, bobot) dan esai. Bisa juga memakai **link Google Form**. Opsi acak urutan soal, terbit/draf, tampilkan nilai langsung.
- **Koreksi otomatis**: pilihan ganda dinilai langsung. Esai dinilai dari **kata kunci** (skor = bobot × kata kunci yang ditemukan ÷ jumlah kata kunci). Guru bisa mengubah skor esai, memberi catatan, atau meminta siswa mengerjakan ulang. Nilai Google Form dimasukkan guru di menu Penilaian.
- **Data siswa**: tambah, lihat detail, edit, atur ulang sandi, hapus. Ringkasan jumlah siswa per kelas. "Tambah banyak" untuk menempel daftar dari Excel (kolom: NISN, nama, tempat lahir, tanggal lahir, kelas).
- **Absensi**: lihat per tanggal, ubah status (Hadir, Terlambat, Izin, Sakit, Alpa), edit jam dan keterangan, hapus catatan, tandai Alpa sekaligus, rekap bulanan, ekspor CSV.
- **Foto absen**: siswa wajib berfoto dengan kamera HP saat absen (bisa dimatikan di Pengaturan). Foto diberi cap nama, NISN, waktu, status, dan jarak lokasi. Guru melihatnya di kolom Foto dan tab **Galeri foto** menu Absensi, lalu mengekspor per hari atau per bulan sebagai **ZIP** (foto per tanggal/kelas, `absensi-foto.csv`, dan `rekap.html` yang siap dicetak). Foto lama bisa dihapus per bulan untuk menghemat ruang.
- **Lokasi absen**: tentukan titik sekolah (tempel koordinat/link Google Maps atau pakai lokasi HP saat di sekolah) dan radius dalam meter. Siswa hanya bisa absen **Hadir** bila GPS HP-nya di dalam radius. Jarak dan akurasi GPS tiap siswa tampil di menu Absensi dan ikut diekspor ke CSV.
- **Pengaturan**: nama sekolah, KKM, jam buka/tutup absen, batas terlambat, ganti sandi, koneksi GitHub, link aktivasi siswa, cadangan data.

**Siswa**
- **Registrasi mandiri**: tombol *Daftar akun siswa* di halaman masuk. Isi NISN, nama lengkap, tempat lahir, tanggal lahir, kelas (X/XI/XII TJKT 1–2), dan kata sandi. Guru bisa menutup pendaftaran di Pengaturan.
- **Masuk dengan NISN** dan kata sandi.
- **Absen harian** sekali sehari (Hadir, Izin, Sakit). Otomatis tercatat Terlambat bila lewat batas jam. Siswa memotret selfie dengan kamera HP (kamera depan/belakang, bisa diulang; foto berlaku 5 menit). Bila lokasi absen aktif, HP membaca GPS dan menampilkan jarak ke sekolah; Izin dan Sakit tidak memerlukan lokasi. Kalender kehadiran per bulan.
- **Materi**: membaca materi, menonton video, membuka dokumen. Penanda "sudah dibaca".
- **Tugas**: mengerjakan soal dengan navigasi nomor, jawaban sementara tersimpan otomatis, lalu dikumpulkan. Melihat nilai dan pembahasan (kunci jawaban baru tampil setelah tenggat).
- **Nilai saya**: daftar nilai, rata-rata, status tuntas terhadap KKM.

## Isi folder

```
index.html                 halaman utama
assets/css/style.css       tampilan (warna dasar skyblue)
assets/js/config.js        ← ISI DI SINI: owner & repo data GitHub
assets/js/ui.js            fungsi bantu tampilan
assets/js/motion.js        animasi transisi antarhalaman
assets/js/lokasi.js        lokasi & radius absen (GPS)
assets/js/kamera.js        kamera & foto absen
assets/js/vendor/jszip.min.js  pustaka ZIP untuk ekspor foto (MIT)
assets/js/store.js         penyimpanan (GitHub API / mode demo)
assets/js/app.js           login, menu, navigasi
assets/js/pages-admin.js   halaman guru
assets/js/pages-siswa.js   halaman siswa
```

## Coba dulu (mode demo)

Selama `config.js` belum diisi, aplikasi berjalan dalam **mode demo** dengan data contoh yang tersimpan di browser.
- Guru: `erje` / `erje123`
- Siswa: NISN `0081234501` / `siswa123` (juga `0081234502`, `0081234503`, `0071234504`, `0061234505`)
- Atau tekan **Daftar akun siswa** untuk mencoba registrasi.

## Pemasangan (±25 menit, sekali saja)

Dipakai tiga bagian, semuanya gratis:

| Bagian | Isi | Siapa yang melihat |
|---|---|---|
| Repositori **aplikasi** (publik) | isi ZIP ini, tampil lewat GitHub Pages | semua orang (hanya kode, tanpa data) |
| Repositori **data** (privat) | `data/…` siswa, absen, nilai, foto | hanya Anda |
| **Cloudflare Worker** (perantara) | `cloudflare/worker.js` + token GitHub rahasia | tidak ada; siswa hanya bicara dengan perantara |

Dengan perantara ini **siswa cukup membuka link aplikasi** lalu langsung bisa daftar atau masuk dengan NISN. Tidak ada token di HP siswa, tidak perlu link aktivasi.

### 1. Repositori data (privat)
1. GitHub → **New repository** → nama `kelas-langit-data` → **Private** → centang *Add a README file* → Create.

### 2. Token GitHub (hanya untuk Cloudflare)
1. Foto profil → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. *Expiration*: sampai akhir tahun ajaran.
3. *Repository access*: **Only select repositories** → `kelas-langit-data`.
4. *Permissions → Repository permissions → Contents*: **Read and write**.
5. Generate, salin token (`github_pat_…`). Simpan sementara; nanti ditempel di Cloudflare.

### 3. Cloudflare Worker (perantara)
1. Daftar gratis di **dash.cloudflare.com** (cukup email).
2. Menu **Compute (Workers) → Workers & Pages → Create → Create Worker** (pilih *Start with Hello World*). Beri nama `kelas-langit-api` → **Deploy**.
3. Tekan **Edit code**. Hapus semua isi `worker.js`, tempel seluruh isi berkas `cloudflare/worker.js` dari ZIP ini → **Deploy**.
4. Kembali ke halaman worker → **Settings → Variables and Secrets → Add**:

   | Jenis | Nama | Nilai |
   |---|---|---|
   | Text | `OWNER` | username GitHub Anda |
   | Text | `REPO` | `kelas-langit-data` |
   | Text | `BRANCH` | `main` |
   | Text | `DATA_PATH` | `data` |
   | Text | `ALLOWED_ORIGIN` | `https://USERNAME.github.io` (alamat GitHub Pages Anda, tanpa garis miring di akhir) |
   | **Secret** | `GITHUB_TOKEN` | token dari langkah 2 |
   | **Secret** | `SESSION_SECRET` | kalimat acak minimal 32 karakter, mis. ketik asal-asalan huruf & angka |

   Tekan **Deploy** setelah menambah variabel.
5. Salin alamat worker, contohnya `https://kelas-langit-api.namaanda.workers.dev`. Buka alamat itu di browser: harus muncul tulisan `"ok":true`.

### 4. Repositori aplikasi (publik) + GitHub Pages
1. New repository → `kelas-langit` → **Public**.
2. Unggah **isi** folder ZIP ini (yang terlihat di halaman utama repo harus `index.html` dan folder `assets`, bukan folder `kelas-langit`).
3. Edit `assets/js/config.js`, isi baris `proxy:` dengan alamat worker:
   ```js
   proxy: 'https://kelas-langit-api.namaanda.workers.dev',
   ```
   Bagian `github` biarkan kosong. Commit.
4. **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → Save. Tunggu sampai tab **Actions** hijau.

### 5. Mulai pakai
1. Buka `https://USERNAME.github.io/kelas-langit/` → tekan **Buat data awal** (sekali saja).
2. Masuk `erje` / `erje123` → **segera ganti sandi** di Pengaturan, isi nama sekolah, jam absen, lokasi absen.
3. Bagikan link aplikasi ke grup kelas. Siswa menekan **Daftar akun siswa**, lalu masuk dengan NISN.

### Memperbarui aplikasi nanti
Timpa semua berkas di repositori aplikasi **kecuali `assets/js/config.js`**. Bila `cloudflare/worker.js` ikut berubah, tempel ulang isinya di Cloudflare → Deploy. Nomor versi tampil di bawah kotak masuk; bila HP masih menampilkan nomor lama, tunggu beberapa menit atau buka di tab samaran.

### Cara lama tanpa Cloudflare (token per perangkat)
Kosongkan `proxy`, isi `github.owner` dan `github.repo` di `config.js`. Setiap perangkat lalu perlu token atau link aktivasi dari menu Pengaturan. Cara ini tidak disarankan karena token ikut tersimpan di HP siswa.

## Struktur data di repositori data

```
data/pengaturan.json        profil sekolah, akun guru, KKM, jam absen
data/siswa.json             daftar siswa, NISN sebagai kunci utama
data/materi.json            materi
data/tugas.json             tugas dan bank soal
data/absensi/<NISN>.json    riwayat absen per siswa
data/jawaban/<NISN>.json    jawaban dan nilai per siswa
data/foto/<YYYY-MM>/<NISN>_<YYYY-MM-DD>.jpg   foto absen (±10–30 KB)
```

Contoh satu data siswa di `siswa.json` (diurutkan per kelas X TJKT 1 → XII TJKT 2, lalu nama):
```json
{
  "nisn": "0081234501",
  "nama": "Aulia Rahmawati",
  "tempatLahir": "Makassar",
  "tanggalLahir": "2010-03-14",
  "kelas": "X TJKT 1",
  "passHash": "…",
  "sumber": "mandiri",
  "dibuat": "2026-11-11T00:40:00.000Z"
}
```
`sumber` bernilai `mandiri` (daftar sendiri) atau `guru` (ditambah guru). Sandi tidak pernah disimpan dalam bentuk asli. NISN wajib 10 digit dan tidak bisa dipakai dua kali; nama dan tempat lahir otomatis dirapikan huruf besarnya.
Absensi dan jawaban dipisah per siswa (nama file = NISN) supaya banyak siswa bisa menyimpan bersamaan. Jika dua perangkat menyimpan file yang sama pada saat bersamaan, aplikasi membaca ulang versi terbaru lalu mencoba lagi, sehingga data tidak saling menimpa. Setiap perubahan tercatat sebagai commit, jadi riwayatnya bisa dilihat di tab *Commits*.

## Batasan yang perlu diketahui

- **Keamanan dengan perantara Cloudflare**: token GitHub tidak pernah sampai ke HP. Siswa hanya menerima data dirinya sendiri (tanpa sandi siapa pun), hanya bisa *menambah* absen hari ini, jawaban tugas, dan foto absennya sendiri, dan tidak bisa mengubah nilai, koreksi, atau data siswa lain. Kunci jawaban baru dikirim ke HP siswa setelah tugas itu ia kumpulkan. Sesi masuk berlaku 30 hari. Paket gratis Cloudflare melayani 100.000 permintaan per hari.
- **Cara lama (token per perangkat).** Siapa pun yang memegang token (lewat link aktivasi) secara teknis bisa membaca dan mengubah isi repositori data, termasuk kunci jawaban. Bagikan link hanya ke grup kelas. Jika link tersebar, cabut token di GitHub, buat token baru, masukkan di Pengaturan, lalu bagikan link aktivasi baru. Untuk ujian penting, gunakan mode Google Form.
- **Sandi** disimpan sebagai hash SHA-256, bukan teks asli. Sandi pendek tetap mudah ditebak, jadi minta siswa memakai sandi minimal 8 karakter.
- **Kuota GitHub**: 5.000 permintaan per jam per token, ditambah batas penulisan beruntun. Cukup untuk beberapa kelas; bila ratusan siswa absen di menit yang sama, sebagian mungkin perlu menekan Kirim sekali lagi.
- Jawaban yang sedang dikerjakan tersimpan di perangkat siswa sampai dikumpulkan. Penanda "sudah dibaca" pada materi juga hanya tersimpan di perangkat.
- Jam absen mengikuti jam di perangkat siswa.
- **Foto absen** disimpan sebagai berkas JPG kecil (360×480 px, ±10–30 KB) di repositori data, satu commit per foto. Untuk 200 siswa selama setahun ajaran ±1 GB; GitHub menyarankan repositori di bawah 1–5 GB, jadi **ekspor ZIP lalu hapus foto per bulan** secara rutin (menu Absensi → Rekap bulanan). Bila kamera tidak bisa dibuka, siswa bisa memakai aplikasi kamera HP; foto seperti ini diberi tanda *berkas* agar guru bisa memeriksanya.
- **Lokasi absen** dibaca dari GPS browser di HP siswa, jadi hanya berjalan lewat https (GitHub Pages sudah https) dan setelah siswa mengizinkan akses lokasi. Aplikasi pemalsu lokasi (*fake GPS*) bisa mengelabui pemeriksaan ini; gunakan kolom jarak dan tautan Google Maps di menu Absensi untuk memeriksa kejanggalan.

## Ekspor

Penilaian, data siswa, absensi harian, dan rekap bulanan bisa diekspor ke CSV (pemisah titik koma, langsung terbaca Excel berbahasa Indonesia). Cadangan seluruh data tersedia di Pengaturan.
