# WMS ACIS V8

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


## V9 — Responsive + Scan Action Hub
- Layout responsif untuk desktop, tablet, dan HP.
- Sidebar berubah menjadi menu hamburger di layar kecil.
- Dashboard/cards/charts/forms menyesuaikan lebar viewport.
- Halaman Scan menampilkan action hub setelah produk ditemukan.
- Aksi dari scan: Terima Barang, Kirim Barang, Pindah Rak, Pindah Gudang, Stock Opname, dan Lihat Stok.
- Produk hasil scan otomatis dipilih saat membuka form transaksi.

## V10 update
- Pesan duplikasi produk kini membedakan SKU dan barcode/QR.
- Daftar produk memiliki Edit dan Hapus (soft delete; stok harus 0).
- Produk hasil scan otomatis terpilih saat membuka Barang Masuk, Barang Keluar, Pindah Rak, dan Pindah Gudang.
- Scanner kamera mendukung barcode 1D dan QR Code melalui BarcodeDetector browser. QR dapat berisi nilai langsung, JSON (`barcode`/`sku`/`code`), atau URL dengan query `barcode`/`sku`/`code`.

## V11 - Laporan Inventory
- Menu Laporan lengkap untuk Barang Masuk, Barang Keluar, Pindah Gudang, dan Pindah Rak.
- Kartu Stok dengan saldo sebelum/sesudah per mutasi.
- Stok per Gudang.
- Stok per Rak/Lokasi.
- Filter tanggal, produk, gudang, rak, dan jenis transaksi.
- Export CSV dari laporan yang sedang ditampilkan.


## V12
- Perbaikan master Gudang dan Rak: form submit stabil, error API lebih jelas, reload data otomatis setelah simpan.
- Kode rak sekarang unik per gudang (A-01 boleh digunakan pada gudang berbeda).
- Validasi gudang sebelum menambah rak.

## V13 - Packing List
- Menu Packing List terhubung dengan transaksi Barang Keluar.
- Satu packing list dapat berisi beberapa transaksi Barang Keluar.
- Status: Draft, Packed, Shipped, Cancelled.
- Data penerima, perusahaan, telepon, alamat, referensi, petugas, catatan.
- Preview dan cetak packing list.
- Transaksi Barang Keluar yang sudah dipakai tidak dapat dimasukkan ke packing list lain.
- Menghapus packing list tidak mengubah stok karena dokumen packing hanya mengelompokkan transaksi OUT yang sudah terjadi.

## V14 - Login, Trial, Admin Trial & Hak Akses

Tambahan V14:
- Login dengan session cookie HttpOnly bertanda tangan.
- Registrasi trial 7 hari melalui `/register`.
- Super Admin dapat mengontrol trial di `/admin/trials` (extend 7/30 hari, suspend/aktifkan).
- Menu `/access` untuk membuat Role + Permission dan user internal.
- Menu sidebar otomatis mengikuti permission user.
- Status Packing List dapat diubah langsung dari daftar atau detail/cetak tanpa mengirim ulang item packing.

### Environment Variable baru
Tambahkan pada Railway service WMS ACIS:

```env
AUTH_SECRET=isi-dengan-random-string-panjang
SUPERADMIN_EMAIL=admin@acisapps.id
SUPERADMIN_PASSWORD=password-yang-kuat
```

`SUPERADMIN_EMAIL` dan `SUPERADMIN_PASSWORD` dipakai untuk bootstrap Super Admin saat login pertama. Ganti contoh password sebelum production.

### Trial
User dapat klik **Mulai Trial Gratis 7 Hari** dari halaman login. Setelah 7 hari, akses operasional diblokir sampai trial diperpanjang/akun diaktifkan oleh Super Admin.

Catatan hak akses: bila role seorang user diubah saat user tersebut sedang login, lakukan logout/login agar permission pada session cookie diperbarui.


## V15 - Logout
- Tombol Logout eksplisit di bagian bawah sidebar.
- Logout menghapus session cookie HttpOnly melalui `/api/auth/logout` dan kembali ke halaman login.
- Tampil konsisten di desktop, tablet, dan mobile.


## V16 — Multi-tenant isolation
Setiap akun/perusahaan trial memiliki `account_id` sendiri. Semua produk, gudang, rak, stok, transaksi, packing list, laporan, dan konfigurasi AOLINX difilter berdasarkan tenant. Akun trial baru dimulai dengan data operasional kosong. Data lama saat upgrade otomatis dikaitkan ke akun perusahaan pertama agar tidak hilang.


## V17 - Fix registrasi trial
- Memperbaiki error `there is no unique or exclusion constraint matching the ON CONFLICT specification`.
- Schema bootstrap sekarang konsisten dengan multi-tenant V16.
- Tidak lagi membuat gudang/AOLINX global saat bootstrap; tenant trial baru tetap kosong.
- Menambahkan unique index case-insensitive untuk email user.
