# Panduan: Cleaning Management dengan Google Sheets + Drive + Google Sign-In

```
Aplikasi React ─ login Google ─▶ Apps Script (Web App) ─▶ Google Sheets (data + daftar pengguna)
                                                        └▶ Google Drive  (foto Before / After)
```
Aplikasi tidak lagi memakai Base44 sama sekali. Login memakai akun Google; hanya email yang
terdaftar di sheet **Pengguna** yang bisa masuk.

## Langkah 1 — Spreadsheet
1. Unggah `Database_Cleaning_Management.xlsx` ke Google Drive, buka dengan Google Sheets, lalu **File → Save as Google Sheets**.
2. Pastikan ada 5 tab: `Pengguna`, `Petugas`, `ShiftLog`, `ShiftSchedule`, `Transaksi`.
   (Kalau tab `Pengguna` belum ada, `setup()` di Langkah 3 akan membuatnya.)

## Langkah 2 — Buat Client ID Google (sekali saja)
1. Buka https://console.cloud.google.com → buat **project baru** (nama bebas).
2. Menu **APIs & Services → OAuth consent screen** (atau *Google Auth Platform*): isi nama aplikasi dan email dukungan, pilih **External**.
3. Atur agar pengguna bisa masuk: klik **Publish app** (untuk login dasar email/profil tidak perlu verifikasi Google), **atau** tambahkan email petugas di **Test users** (maksimal 100, tetapi harus ditambahkan satu per satu).
4. **Credentials → Create credentials → OAuth client ID → Application type: Web application**.
5. Di **Authorized JavaScript origins** tambahkan:
   - `http://localhost:5173` (uji lokal)
   - alamat hosting nanti, contoh `https://nama-app.vercel.app`
   Bagian *Redirect URIs* dikosongkan.
6. Klik **Create**, salin **Client ID** (berakhiran `.apps.googleusercontent.com`).
   Perubahan origin kadang butuh beberapa menit agar aktif.

## Langkah 3 — Pasang Apps Script
1. Di spreadsheet: **Extensions → Apps Script**. Hapus isi `Code.gs`, tempel isi `apps-script/Code.gs`.
2. Ubah dua baris di bagian `CONFIG`:
   - `GOOGLE_CLIENT_ID`: isi Client ID dari Langkah 2.
   - `ADMIN_EMAILS`: isi email Google kamu, misalnya `['namakamu@gmail.com']`.
3. `FOLDER_BEFORE_ID` / `FOLDER_AFTER_ID` sudah berisi folder dari prototype. Kosongkan keduanya jika ingin dibuatkan folder baru.
4. Pilih fungsi **setup** → **Run** → setujui izin (Spreadsheet, Drive, dan *koneksi ke layanan eksternal*). Klik *Advanced → Go to ... (unsafe)* bila muncul peringatan; itu normal untuk script milik sendiri.

## Langkah 4 — Deploy Web App
1. **Deploy → New deployment → ikon roda gigi → Web app**.
2. *Execute as*: **Me**. *Who has access*: **Anyone**.
3. **Deploy**, salin **Web app URL** (berakhiran `/exec`).
4. Membuka URL itu di browser harus menampilkan `{"ok":true,"service":"cleaning-management-api"}`.

> Setiap kali `Code.gs` diubah: **Deploy → Manage deployments → Edit → Version: New version → Deploy**. URL tetap sama.

## Langkah 5 — Hubungkan frontend
1. Salin `.env.example` menjadi `.env` (Windows: `copy .env.example .env`), lalu isi:
   ```
   VITE_SHEETS_API_URL=<Web app URL dari Langkah 4>
   VITE_GOOGLE_CLIENT_ID=<Client ID dari Langkah 2>
   ```
2. `npm install` lalu `npm run dev`, buka `http://localhost:5173`.
3. Klik tombol Google dan masuk dengan email yang ada di `ADMIN_EMAILS`.
4. Saat hosting, isi dua variabel yang sama di *Environment Variables* layanan hosting, dan pastikan alamat hosting sudah ada di *Authorized JavaScript origins* (Langkah 2.5).

## Langkah 6 — Daftarkan pengguna
Buka tab **Pengguna** dan tambahkan satu baris per orang:

| email | nama | role | petugas_kode | aktif |
|---|---|---|---|---|
| budi@gmail.com | Budi | user | OB01 | TRUE |

- `role`: `admin` (melihat Monitoring, mengatur penugasan) atau `user` (petugas biasa).
- `aktif` **harus diisi `TRUE`**; kosong dianggap nonaktif.
- `petugas_kode` opsional: jika diisi, pilihan petugas terisi otomatis saat masuk.
- Kolom `id` dan lainnya boleh dikosongkan.
- Menonaktifkan orang: ubah `aktif` menjadi `FALSE` (berlaku maksimal sekitar 2 menit).

## Langkah 7 (opsional) — Pindahkan foto lama dari Base44 ke Drive
1. Di Apps Script jalankan **previewOldPhotos** (hanya menghitung), lalu **migrateOldPhotos**. Hasilnya ada di *Execution log*.
2. Bila log menyebut waktu habis, jalankan lagi; foto yang sudah pindah dilewati.
3. Lakukan **sebelum** aplikasi Base44 dihapus, dan buat salinan spreadsheet dulu.

## Keamanan
- Identitas diverifikasi Google; Apps Script memeriksa tokennya ke Google, lalu menerbitkan token sesi bertanda tangan (berlaku 7 hari). Tidak ada kunci rahasia di kode frontend.
- Hak akses dijaga di server: hanya admin yang boleh mengubah `Petugas`/`ShiftSchedule` dan menghapus data. Sheet `Pengguna` tidak bisa diakses lewat API.
- Foto dibuat "siapa saja dengan link bisa melihat" (`PUBLIC_PHOTOS: true`) agar tampil di aplikasi; link-nya sulit ditebak tetapi bukan privat.
- Sebaiknya akses edit spreadsheet dibatasi hanya untuk admin, karena siapa pun yang bisa mengedit sheet `Pengguna` bisa mengangkat dirinya jadi admin.

## Yang berubah dari versi Base44
- Login: Google Sign-In (`pages/Login.jsx`, `lib/AuthContext.jsx`). Halaman Daftar, Lupa/Reset Kata Sandi, dan OAuthConsent dihapus.
- Fitur "Hapus Akun" di Pengaturan dihapus (diganti: admin menonaktifkan di sheet `Pengguna`).
- Folder `base44/` dan paket `@base44/*` dihapus. `vite.config.js` dibuat ulang (kosong di ekspor).
- `UserNotRegistered.jsx` diganti nama menjadi `UserNotRegisteredError.jsx` agar sesuai import.
- Logo di `SuperLogo.jsx` masih memuat gambar dari `media.base44.com`. Unduh logonya dan simpan di folder `public/` agar tidak bergantung pada Base44.
