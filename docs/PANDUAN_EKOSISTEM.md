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
└── supabase/                  # satu script setup SQL
```

Route website publik: `/`, `/register`, `/tentang`, `/tim-inti`, `/galeri`, `/belajar/hiragana`, dan `/belajar/katakana`. Route admin: `/login` dan `/admin/*`. URL lama seperti `/scan` diarahkan ke route admin yang sesuai.

## Koneksi Supabase

Satu aplikasi memakai `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari project NKKSmart yang sama. Isi `.env` lokal dan Environment Variables Vercel dengan nilai tersebut. Jangan memakai `service_role` di browser atau Vercel frontend.

Website publik mengirim pendaftaran melalui RPC `submit_pendaftaran`; admin memproses antrean lewat `/admin/pendaftar`. Leaderboard dan pencarian kartu juga memakai RPC, bukan akses tabel anggota langsung dari browser.

## Schema dan migration

Schema yang dipakai aplikasi adalah NKKSmart: `admins`, `anggota`, `barcode`, `pertemuan`, `absensi`, `geofence_settings`, dan `app_settings`.

Untuk database NKKSmart yang sudah berisi data, **jangan jalankan blank-install schema**. Gunakan `supabase/nkksmart_all_changes.sql` setelah meninjau preflight-nya; file tersebut menambah RPC pendaftaran, persetujuan, leaderboard, pencarian kartu, status/catatan absensi, dan rekap semester tanpa mengosongkan tabel.

Untuk project Supabase baru yang ingin diserahkan/dijual dalam keadaan tanpa data anggota, gunakan urutan berikut di SQL Editor project baru:

1. Jalankan `supabase/blank_project_schema.sql`. File ini membuat tabel dan RPC dasar, tanpa memasukkan anggota, pertemuan, presensi, koordinat, atau akun admin. Jangan jalankan pada database produksi karena ini ditujukan sebagai template instalasi baru.
2. Jalankan `supabase/nkksmart_all_changes.sql` untuk menambah RPC dan schema fitur NKKSmart.
3. Buat akun di Supabase Auth, lalu jalankan contoh INSERT admin yang dikomentari di bagian akhir file schema dengan UUID akun tersebut.
4. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` untuk website. Jangan menyimpan service role key di frontend.

Leaderboard diurutkan berdasarkan jumlah hadir pada pertemuan non-libur yang sudah berlangsung dalam periode terpilih, lalu nama anggota A–Z sebagai pemecah seri. Setiap orang mendapat peringkat unik; hasil dibatasi maksimal 9 anggota dan tiga peringkat teratas tampil di podium. Jalankan `supabase/fix_leaderboard_rank.sql` pada database aktif untuk menerapkan aturan ini.

Dokumentasi admin dapat disunting di Dashboard Admin → Pengaturan → Dokumentasi Project. Isinya disimpan pada `app_settings` dengan key `admin_documentation`; buat schema dan policy `app_settings` terlebih dahulu.

Tabel Inggris seperti `members`, `meetings`, dan `attendance` berasal dari schema berbeda dan tidak ditargetkan oleh query tersebut. Bila pemeriksaan tabel/kolom gagal, hentikan dan cocokkan project serta schema sebelum menjalankan SQL lain.

## Build dan Vercel

Gunakan Node.js **22.12+**. Jalankan `npm install`, salin `.env.example` menjadi `.env` jika belum ada, kemudian `npm run dev`. Untuk produksi jalankan `npm run build`.

Di Vercel pilih framework Vite, build command `npm run build`, dan output `dist`. `vercel.json` mengatur SPA rewrite agar refresh pada route React Router tidak menghasilkan 404. Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` untuk Preview dan Production.
