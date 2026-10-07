# Panduan ekosistem NKK

Panduan ini menjelaskan repo mana yang dibuka, alur data, dan lokasi schema. Kedua aplikasi sengaja tetap menjadi dua repo karena deployment dan tanggung jawabnya berbeda; keduanya memakai project Supabase NKKSmart yang sama.

## Peta folder

Di komputer ini, kedua folder berada di bawah `Nihongo Kurabu Katsudo`:

| Folder | Peran | Yang dikerjakan di sini |
|---|---|---|
| `NKK_Project` | Website resmi publik | Landing, profil, galeri, materi belajar, pendaftaran publik, leaderboard, pencarian QR anggota. |
| `nkksmart-web` | Dashboard admin NKKSmart | Login admin, data anggota, kamera presensi, jadwal, cetak kartu, rekap, pengaturan, persetujuan pendaftar. |

Jangan mencampur source `src/` dari kedua folder. Untuk mengerjakan website, buka folder `NKK_Project`; untuk dashboard dan schema Supabase, buka `nkksmart-web`.

```text
Nihongo Kurabu Katsudo/
├── NKK_Project/                 # website resmi
└── nkksmart-web/                # dashboard admin + schema Supabase
    ├── src/                     # aplikasi admin
    └── supabase/migrations/     # perubahan schema SQL
```

## Alur data sederhana

```text
Website publik (NKK_Project) ── RPC submit_pendaftaran ──┐
Website publik ──────────────── RPC leaderboard/kartu ──┤
                                                        ├── Supabase NKKSmart
Dashboard admin (nkksmart-web) ── login + CRUD/RPC ─────┘
```

- Kedua repo memakai `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` yang menunjuk ke **project NKKSmart yang sama**.
- Jangan memakai `service_role` di browser, `.env`, atau Vercel frontend.
- Website publik tidak membaca tabel anggota secara langsung. Leaderboard dan pencarian kartu memakai RPC; pencarian kartu hanya menerima nama lengkap yang cocok persis dan hanya mengembalikan informasi kartu.
- Pendaftaran publik mengirim ke RPC `submit_pendaftaran`. Admin memproses antrean melalui halaman `/admin/pendaftar`; persetujuan membuat anggota dan barcode.
- Data lama pada project Supabase website sebelumnya belum dipindahkan. Jangan menghapus project atau antrean lama sebelum inventaris dan pemindahan data disetujui.

## Menjalankan dua web di localhost

Pakai Node.js **22.12+**. Buka dua terminal PowerShell.

Terminal 1 — website publik:

```powershell
Set-Location "C:\Users\ThinkPad\Documents\Nihongo Kurabu Katsudo\NKK_Project"
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Terminal 2 — dashboard admin:

```powershell
Set-Location "C:\Users\ThinkPad\Documents\Nihongo Kurabu Katsudo\nkksmart-web"
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev -- --port 5174
```

Isi kedua `.env` menggunakan Project URL dan anon/public key yang sama dari Supabase NKKSmart. Website publik berjalan di port 5173 dan dashboard di 5174. `.env` tidak boleh masuk Git.

Untuk menguji hasil produksi lokal:

```powershell
npm run build
npm run preview
```

Jalankan perintah dari folder repo yang sedang diuji.

## Sumber schema dan urutannya

Schema aktif yang ditargetkan adalah schema legacy NKKSmart: `admins`, `anggota`, `barcode`, `pertemuan`, `absensi`, dan `geofence_settings`. Daftar `members`, `meetings`, `attendance`, `profiles` dari screenshot sebelumnya bukan target project ini.

| File | Fungsi | Status yang diketahui |
|---|---|---|
| `202610060001_attendance_status_and_notes.sql` | Status absensi izin/sakit/alpha dan kolom catatan. | Berlabel DRAFT; cek apakah sudah diterapkan sebelum mengambil tindakan. |
| `202610060002_rekap_semester_rpc.sql` | RPC rekap semester untuk tabel NKKSmart legacy. | Status live belum dikonfirmasi; cek migration history. |
| `202610070001_ecosystem_consolidation.sql` | Antrean pendaftar, akses admin/RPC, leaderboard publik, dan pencarian kartu. | DRAFT; belum diterapkan. |

Jangan mengeksekusi file hanya karena nomor tanggalnya berurutan. Sebelum perubahan database: pastikan nama project Supabase NKKSmart, cek migration history, buat backup, tinjau isi SQL, lalu terapkan hanya file yang belum diterapkan dan sudah disetujui. File `NKK_Project/docs/pending_schema.sql` adalah rancangan historis lama untuk tabel `pending`; jangan jalankan untuk alur baru.

## Build dan deployment

Untuk **masing-masing repo**:

```powershell
npm run build
```

Konfigurasi Vercel untuk keduanya: framework Vite, build command `npm run build`, output `dist`. Tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` pada Environment Variables Vercel untuk Preview dan Production. Setelah mengubah env, redeploy agar nilainya masuk ke build.

## Commit dan push

Setiap repo mempunyai Git history sendiri. Commit perubahan di repo yang sesuai. Jangan push sebelum pemilik meminta atau menyetujuinya.
