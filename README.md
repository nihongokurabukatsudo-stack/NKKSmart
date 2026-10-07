# NKKSmart

Website resmi NIHONGO KURABU KATSUDO dan dashboard NKKSmart berada dalam satu aplikasi Vite + React, memakai satu `index.html`, satu `src/`, satu direktori aset `public/assets/`, dan project Supabase NKKSmart yang sama.

## Struktur utama

```text
Nihongo Kurabu Katsudo/
├── public/assets/       # gambar, logo, audio, galeri, dan aset kartu
├── src/                 # website publik dan dashboard admin
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── ...
├── supabase/migrations/ # perubahan schema Supabase
├── index.html           # entry point tunggal
└── package.json
```

Website publik memakai `/`, `/register`, `/tentang`, `/tim-inti`, `/galeri`, dan `/belajar/*`. Dashboard berada pada `/admin/*`; alamat dashboard lama tetap diarahkan ke jalur admin.

## Menjalankan lokal

Gunakan Node.js **22.12 atau lebih baru**:

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Isi `.env` dengan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari project Supabase NKKSmart. Jangan pernah memakai service role key di frontend. Vercel memerlukan dua nilai yang sama pada Environment Variables.

## Database

SQL disimpan di `supabase/migrations/`. Sebelum menerapkan migration, pastikan project Supabase dan migration history sesuai. `202610070001_ecosystem_consolidation.sql` masih draft dan belum diterapkan. Jangan menyalin schema dari project Supabase lain.

## Build dan deployment

```powershell
npm run build
```

Vercel: framework Vite, build command `npm run build`, output directory `dist`. `vercel.json` mengarahkan refresh pada URL React Router ke `index.html`.
