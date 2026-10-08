# Panduan proyek NKK

Website resmi dan dashboard NKKSmart berada dalam satu repository dan satu aplikasi React + Vite. Kerjakan keduanya dalam folder project ini; tidak ada project website kedua yang perlu digabungkan.

## Struktur utama

```text
Nihongo Kurabu Katsudo/
├── index.html
├── public/assets/       # aset publik
├── src/
│   ├── components/      # komponen dan layout
│   ├── contexts/        # autentikasi dan state bersama
│   ├── data/            # konten pembelajaran
│   ├── pages/           # website publik, login, scan, dan admin
│   ├── lib/             # Supabase client dan helper
│   └── types/           # tipe TypeScript
├── supabase/            # schema SQL yang tersedia
└── docs/
```

## Route dan akses

- Website publik: `/`, `/register`, `/tentang`, `/galeri`, dan `/belajar/*`.
- Login admin: `/login`.
- Scan dan seluruh dashboard: `/scan` serta `/admin/*`; wajib login.
- URL dashboard lama diarahkan ke route admin yang sesuai.
- `/tim-inti` sudah dihapus dan tidak lagi tampil di navigasi.

Sesi Supabase tidak dipersist ke local storage. Admin harus login lagi setelah reload atau membuka ulang aplikasi. Login mengembalikan pengguna ke route yang semula diminta. Browser dapat menawarkan penyimpanan kredensial melalui password manager; aplikasi sendiri tidak menyimpan password.

## Koneksi Supabase

Isi `.env` lokal dan Environment Variables Vercel dengan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari project yang digunakan. Jangan pernah memakai `service_role` key di browser.

Login menggunakan Supabase Auth dan mengharuskan user memiliki profil admin pada tabel `admins`. Tidak ada username atau password default di source code.

## Schema

`supabase/blank_project_schema.sql` adalah schema awal untuk project Supabase baru. Tinjau dan cocokkan schema sebelum menjalankannya. Jangan jalankan template awal pada database produksi yang sudah berisi data. Pastikan RPC, tabel, grants, RLS, dan policy untuk fitur yang digunakan sudah tersedia pada project Supabase tersebut.

## Pengembangan dan deploy

Gunakan Node.js 22.12.x.

```powershell
npm ci
npm run dev
npm run build
```

Vercel: framework Vite, build command `npm run build`, output `dist`. Environment Variables harus berisi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. `vercel.json` menyediakan SPA rewrite untuk refresh route React Router.
