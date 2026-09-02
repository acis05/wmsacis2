# GudangKu WMS — Simple Barcode Inventory

MVP WMS sederhana untuk UMKM: master produk & barcode, lokasi rak, stok masuk/keluar, stock opname, low-stock dashboard, audit trail, dan scan barcode via kamera/scanner USB.

## Stack
- Next.js (App Router)
- React
- PostgreSQL (`pg`, raw SQL)
- Native `BarcodeDetector` untuk kamera browser yang mendukung
- Railway-ready standalone build

## Fitur MVP
1. Dashboard: total SKU, total stock, low stock, barang masuk/keluar hari ini.
2. Master produk: SKU, nama, barcode, kategori, satuan, minimum stok.
3. Lokasi gudang/rak.
4. Barang masuk & barang keluar per lokasi.
5. Scan barcode: kamera, USB barcode scanner, atau input manual.
6. Stock opname dengan adjustment otomatis.
7. Riwayat stock movement (before/after qty + actor + timestamp).
8. Proteksi stok negatif dengan transaksi database + row lock.

## Menjalankan lokal
Prasyarat: Node.js 20+ dan PostgreSQL.

```bash
cp .env.example .env.local
# edit DATABASE_URL di .env.local
npm install
set -a && source .env.local && set +a
npm run db:migrate
npm run db:seed
npm run dev
```

Buka http://localhost:3000

> Windows PowerShell: `$env:DATABASE_URL="postgresql://..."` sebelum menjalankan `npm run db:migrate` / `npm run db:seed`.

## Upload ke GitHub
Buat repository kosong di GitHub, lalu dari folder ini:

```bash
git init
git add .
git commit -m "Initial GudangKu WMS MVP"
git branch -M main
git remote add origin https://github.com/USERNAME/gudangku-wms.git
git push -u origin main
```

## Deploy ke Railway
1. Login Railway → **New Project**.
2. Pilih **Deploy from GitHub repo** → pilih repository `gudangku-wms`.
3. Di project canvas klik **+ New → Database → PostgreSQL**.
4. Buka service aplikasi → **Variables** → tambah **Reference Variable** `DATABASE_URL` yang mengarah ke `Postgres.DATABASE_URL`.
5. Buka service aplikasi → **Settings → Deploy → Pre-deploy Command** dan isi:

```bash
npm run db:migrate
```

6. Redeploy aplikasi.
7. Setelah deploy sukses, buka **Settings → Networking → Generate Domain**.
8. Untuk data demo, dari Railway CLI atau shell service jalankan sekali:

```bash
npm run db:seed
```

Seed **tidak wajib** untuk production; tanpa seed aplikasi mulai kosong.

## Barcode
- **USB scanner:** paling sederhana. Klik field Barcode/SKU di halaman Scan lalu scan; scanner USB biasanya bekerja seperti keyboard dan mengirim Enter.
- **Kamera:** tekan `Buka Kamera`. Fitur membutuhkan HTTPS dan browser dengan `BarcodeDetector` (umumnya Chromium modern). Jika tidak tersedia, UI akan menyarankan scanner USB/manual.
- Barcode produk harus unik.

## Struktur database
- `products`: master SKU/barcode.
- `locations`: rak/bin.
- `inventory`: saldo per product + location.
- `stock_movements`: audit trail immutable untuk perubahan stok.

## Catatan production
Versi MVP ini belum memiliki login/role, purchase order, sales order, transfer antar lokasi, batch/expired date, serial number, atau multi-tenant. **Jangan membuka aplikasi ke publik untuk data bisnis nyata sebelum menambah autentikasi dan authorization.**

## Health check
Endpoint: `GET /api/health` → `{ "ok": true }` jika aplikasi bisa terhubung ke PostgreSQL.

## Penting: struktur root GitHub/Railway
Railway harus melihat file/folder berikut langsung di root repository:

```text
app/
components/
lib/
scripts/
package.json
next.config.ts
railway.json
```

Jangan menaruh seluruh project di subfolder `gudangku-wms/` di dalam repository kecuali Railway `Root Directory` juga di-set ke subfolder tersebut.

## Troubleshooting Railway: DATABASE_URL saat build

Aplikasi memakai lazy database initialization. `DATABASE_URL` tidak dibaca saat modul di-import oleh `next build`, sehingga build dapat selesai tanpa koneksi database aktif.

Namun `DATABASE_URL` tetap WAJIB tersedia untuk `npm run db:migrate` pada pre-deploy dan saat aplikasi berjalan.

Di Railway, buka service aplikasi -> Variables lalu buat variable/reference:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Nama service PostgreSQL bisa berbeda. Gunakan reference picker Railway agar nilainya menunjuk ke variable `DATABASE_URL` milik service PostgreSQL.
