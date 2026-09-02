# GudangKu WMS V5

MVP inventory/WMS cloud berbasis Next.js + PostgreSQL, disiapkan untuk GitHub dan Railway.

## Fitur
- Dashboard modern + KPI + 3 visualisasi: arus stok 7 hari, stok per gudang, komposisi kategori.
- Master produk + barcode.
- Master gudang & rak.
- Barang Masuk: tambah, daftar, edit, hapus.
- Barang Keluar: tambah, daftar, edit, hapus.
- Pindah Gudang: tambah, daftar, edit, hapus.
- Pindah Rak: tambah, daftar, edit, hapus.
- Edit/hapus transaksi otomatis melakukan reversal stok agar saldo tetap konsisten.
- Scan barcode kamera/browser, scanner USB, atau manual.
- Stock opname + audit history.
- AOLINX: halaman konfigurasi connector Accurate Online (credential, status, mapping roadmap). Sinkronisasi OAuth/API Accurate perlu credential resmi sebelum diaktifkan.

## Deploy Railway
1. Push semua file project ke root repository GitHub. `app/` harus sejajar dengan `package.json`.
2. Railway > New Project > Deploy from GitHub.
3. Tambah PostgreSQL service.
4. Pada service aplikasi, buat variable `DATABASE_URL` sebagai reference ke `Postgres.DATABASE_URL`.
5. Redeploy. `railway.json` akan menjalankan `npm run db:migrate` sebelum start.
6. Generate Domain pada Settings > Networking.

## Setelah upgrade dari V4
Tidak perlu menghapus database. Migration V5 bersifat additive dan akan:
- membuat tabel `warehouses`, `stock_operations`, dan `integration_settings`;
- menambah `warehouse_id` ke rak lama;
- memasukkan rak lama ke `Gudang Utama`;
- menambah relasi operasi pada audit stock movement.

## Lokal
```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

## AOLINX / Accurate Online
Halaman `/aolinx` adalah connector layer awal. Jangan commit Client Secret atau token ke GitHub. Untuk production, simpan credential sebagai Railway Variables dan lanjutkan implementasi OAuth/API Accurate Online menggunakan credential aplikasi resmi.


## Railway V6 migration safety
Pada V6, `npm run start` akan menjalankan `npm run db:migrate` terlebih dahulu sebelum Next.js server aktif. Ini memastikan database runtime yang sama selalu memiliki tabel `products`, `locations`, `inventory`, dan tabel transaksi. Migration aman dijalankan berulang karena bersifat idempotent.
