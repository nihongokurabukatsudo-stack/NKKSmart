# Nihongo Kurabu Katsudo · NKKSmart

Website publik Nihongo Kurabu Katsudo dan dashboard administrasi NKKSmart berjalan sebagai satu aplikasi React. Aplikasi memakai satu entry point `index.html`, satu direktori source `src/`, satu direktori aset `public/assets/`, dan Supabase sebagai backend.

## Fitur

### Website publik

- Beranda organisasi, profil, dan galeri kegiatan.
- Formulir pendaftaran anggota.
- NKK Learning: materi bahasa Jepang, pembelajaran Hiragana/Katakana, tes penempatan, latihan, dan quiz.
- Leaderboard kehadiran dan pencarian kartu anggota/QR melalui Supabase.

### Dashboard admin

- Dashboard statistik dan pemindaian QR.
- Pengelolaan anggota, pengurus, pendaftar, dan jadwal pertemuan.
- Pengaturan lokasi/geofence.
- Cetak kartu anggota dengan QR.
- Rekap absensi, bulanan, dan semester.
- Pengaturan admin dan dokumentasi project.

## Teknologi dan susunan folder

- React 19, TypeScript 6, Vite 8, React Router, Tailwind CSS.
- Supabase Auth, Postgres, Row Level Security (RLS), dan RPC.
- `html5-qrcode` untuk scan, `qrcode` untuk QR, `xlsx` dan `papaparse` untuk data, serta `docx` untuk dokumen.

```text
.
├── index.html
├── public/assets/       # logo, gambar, audio, galeri, dan aset kartu
├── src/
│   ├── components/      # komponen umum dan layout dashboard
│   ├── contexts/        # autentikasi dan state bersama
│   ├── data/            # konten belajar dan data statis
│   ├── pages/           # route publik, login, scan, dan admin
│   ├── lib/             # koneksi Supabase dan helper
│   └── types/           # tipe TypeScript
├── supabase/            # SQL schema yang tersedia di repository
├── docs/                # panduan project
└── package.json
```

## Route

| Route | Akses | Keterangan |
| --- | --- | --- |
| `/` | Publik | Beranda |
| `/register` | Publik | Pendaftaran |
| `/tentang` | Publik | Profil organisasi |
| `/galeri` | Publik | Galeri |
| `/belajar/*` | Publik | NKK Learning |
| `/login` | Publik | Login admin |
| `/scan` | Admin | Route scan lama, wajib login |
| `/admin/*` | Admin | Dashboard dan pengelolaan NKKSmart |

Alamat lama seperti `/anggota`, `/pertemuan`, `/rekap`, dan `/pengaturan` diarahkan ke route dashboard yang sesuai. Route `/tim-inti` sudah dihapus.

## Persiapan lokal

Persyaratan: Node.js 22.12.x dan npm.

```powershell
npm ci
npm run dev
```

Buat file `.env` di root project dan isi nilai yang diberikan dari project Supabase:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Jangan taruh `service_role` key atau kredensial database di frontend. `.env` diabaikan Git. Akun admin harus dibuat pada Supabase Auth dan profil admin yang cocok harus tersedia pada tabel `admins`; project ini tidak menyediakan username/password contoh atau default.

## Autentikasi

Route `/scan` dan seluruh route `/admin/*` dilindungi `ProtectedRoute`. Jika belum login, pengguna diarahkan ke `/login` dan sesudah login dikembalikan ke route yang diminta. Sesi autentikasi hanya ada di memori aplikasi, sehingga halaman perlu login kembali setelah reload atau dibuka ulang. Form mendukung autofill `username` dan `current-password` milik password manager browser; aplikasi tidak menyimpan password ke local storage.

## Supabase

SQL yang tersedia di repository adalah `supabase/blank_project_schema.sql`, sebuah schema awal untuk project Supabase baru. Tinjau isinya dan cocokkan dengan project sebelum menjalankannya. Jangan jalankan schema awal pada database produksi yang sudah memiliki data. Repository ini tidak menyertakan kredensial Supabase maupun service role key.

Setelah schema siap, pastikan tabel, RPC, RLS, dan policy yang dipakai fitur sudah diterapkan pada project Supabase yang URL-nya sama dengan `VITE_SUPABASE_URL`. Jangan mengubah database produksi dengan menebak schema.

## Build dan deployment

```powershell
npm run build
npm run preview
```

Untuk Vercel gunakan framework Vite, build command `npm run build`, output directory `dist`, dan atur `VITE_SUPABASE_URL` serta `VITE_SUPABASE_ANON_KEY` pada Environment Variables. `vercel.json` menangani SPA rewrite agar route React Router dapat dibuka atau di-refresh langsung.

## Panduan tambahan

Lihat [`docs/PANDUAN_EKOSISTEM.md`](docs/PANDUAN_EKOSISTEM.md) untuk catatan struktur dan alur kerja repository.
