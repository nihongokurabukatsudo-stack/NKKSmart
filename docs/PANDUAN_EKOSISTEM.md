# Panduan proyek NKK

Website resmi dan dashboard NKKSmart sekarang satu aplikasi dan satu repository aktif. Kerjakan perubahan website dan dashboard langsung di folder `Nihongo Kurabu Katsudo`; jangan menjalankan dua dev server atau menggabungkan `src/` dari project kedua.

## Peta struktur

```text
Nihongo Kurabu Katsudo/
├── index.html                 # satu entry point Vite
├── public/assets/             # semua gambar, logo, audio, dan aset statis
├── src/                       # website publik + dashboard admin
│   ├── components/            # komponen bersama dan layout
│   ├── pages/                 # halaman publik dan admin
│   ├── services/              # koneksi data/RPC
│   └── ...
└── supabase/migrations/       # perubahan schema database
```

Route website publik: `/`, `/register`, `/tentang`, `/tim-inti`, `/galeri`, `/belajar/hiragana`, dan `/belajar/katakana`. Route admin: `/login` dan `/admin/*`. URL lama seperti `/scan` diarahkan ke route admin yang sesuai.

## Koneksi Supabase

Satu aplikasi memakai `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari project NKKSmart yang sama. Isi `.env` lokal dan Environment Variables Vercel dengan nilai tersebut. Jangan memakai `service_role` di browser atau Vercel frontend.

Website publik mengirim pendaftaran melalui RPC `submit_pendaftaran`; admin memproses antrean lewat `/admin/pendaftar`. Leaderboard dan pencarian kartu juga memakai RPC, bukan akses tabel anggota langsung dari browser.

## Schema dan migration

Schema aktif yang dituju adalah schema NKKSmart legacy: `admins`, `anggota`, `barcode`, `pertemuan`, `absensi`, dan `geofence_settings`. Daftar tabel `members`, `meetings`, `attendance`, dan `profiles` dari screenshot project lain bukan target schema ini.

| File | Fungsi | Status yang diketahui |
|---|---|---|
| `202610060001_attendance_status_and_notes.sql` | Status izin/sakit/alpha dan catatan absensi. | Draft; cek migration history sebelum diterapkan. |
| `202610060002_rekap_semester_rpc.sql` | RPC rekap semester untuk schema legacy. | Status live belum dikonfirmasi. |
| `202610070001_ecosystem_consolidation.sql` | Pendaftaran, leaderboard, pencarian kartu, serta akses RPC. | Draft; belum diterapkan. |

Pastikan project Supabase dan migration history, buat backup, lalu terapkan hanya migration yang sudah ditinjau dan belum ada di database. Jangan menjalankan query dari project Supabase yang berbeda.

## Build dan Vercel

Gunakan Node.js **22.12+**. Jalankan `npm install`, salin `.env.example` menjadi `.env` jika belum ada, kemudian `npm run dev`. Untuk produksi jalankan `npm run build`.

Di Vercel pilih framework Vite, build command `npm run build`, dan output `dist`. `vercel.json` mengatur SPA rewrite agar refresh pada route React Router tidak menghasilkan 404. Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` untuk Preview dan Production.
