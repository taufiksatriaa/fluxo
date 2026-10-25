# Fluxo Server (Backend REST API & PostgreSQL No-ORM)

Backend layanan operasional dan keuangan proyek konstruksi Fluxo, dirancang dengan arsitektur **Pure SQL (No-ORM)** di atas **PostgreSQL 16+**, memanfaatkan connection pooling (`pg.Pool`), transaksi ACID terisolasi, dan parameterization `$1, $2` untuk mencegah SQL Injection serta menjamin integritas finansial.

---

## 1. Karakteristik Arsitektur

- **Zero ORM / Pure Parameterized SQL**: Bebas dari abstraksi berat (Prisma/TypeORM/Drizzle), kueri ditulis langsung dalam SQL native berkinerja tinggi.
- **ACID Transaction Safety**: Operasi mutasi stok inventaris (`FOR UPDATE`), pencatatan upah, dan persetujuan pengeluaran dieksekusi dalam blok transaksi `withTransaction(client)`.
- **Database Migrations Otomatis**: Migration runner mandiri (`src/db/migrate.js`) mendeteksi keberadaan database, membuat database jika belum ada, serta mengeksekusi skema DDL berurutan.
- **Role-Based Access Control (RBAC)**: Autentikasi berbasis JWT dengan role: `ADMIN`, `FINANCE`, dan `VIEWER`.
- **Large Payload Support**: Parser JSON disiapkan hingga 10MB untuk mendukung bukti transaksi/nota berbasis Base64 DataURL.

---

## 2. Struktur Direktori

```
server/
├── migrations/
│   ├── 001_initial_schema.sql         # Skema DDL tabel inti (UUID, ENUM, FK, Indeks)
│   ├── 002_seed_data.sql              # Data awal user, kategori, proyek, RAB, SDM, alat, logistik
│   └── 003_fix_equipment_log_columns.sql # Kolom riwayat inspeksi alat
├── src/
│   ├── db/
│   │   ├── pool.js                    # pg.Pool singleton, query(), withTransaction()
│   │   └── migrate.js                 # Runner migrasi otomatis
│   ├── repositories/                  # Lapisan akses data murni SQL
│   │   ├── userRepo.js
│   │   ├── projectRepo.js
│   │   ├── categoryRepo.js
│   │   ├── rabRepo.js
│   │   ├── transactionRepo.js
│   │   ├── employeeRepo.js
│   │   ├── wageRepo.js
│   │   ├── inventoryRepo.js
│   │   ├── equipmentRepo.js
│   │   └── reportRepo.js
│   ├── api.js                         # Routing Express & validasi Zod
│   └── index.js                       # Bootstrap Express server
├── test/
│   └── verify-api.js                  # Automated test suite (17 verifikasi endpoint)
├── .env
├── package.json
└── README.md
```

---

## 3. Konfigurasi Lingkungan (.env)

Buat file `.env` di dalam direktori `server/`:

```env
PORT=4000
JWT_SECRET=super_secret_jwt_key_fluxo_2026_min16char
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fluxo_db
```

---

## 4. Perintah Operasional

```bash
# Menjalankan migrasi database PostgreSQL
npm run migrate

# Menjalankan automated integration test suite (17 langkah)
npm run test

# Menjalankan server dalam mode development (live watch)
npm run dev

# Menjalankan server production
npm start
```

---

## 5. Akun Awal (Seed Data)

Kata sandi default untuk seluruh akun seed: `password123`

| Email | Peran | Nama |
| :--- | :--- | :--- |
| `admin@fluxo.id` | `ADMIN` | Admin Konstruksi |
| `finance@fluxo.id` | `FINANCE` | Siti Rahma (Finance) |
| `viewer@fluxo.id` | `VIEWER` | Budi Santoso (Site Mgr) |

---

## 6. Katalog Endpoint REST API

Semua respons API mengikuti standar:
- Sukses: `{ "ok": true, "data": { ... } }`
- Gagal: `{ "ok": false, "error": { "code": "...", "message": "...", "details": ... } }`

### Autentikasi
- `POST /api/auth/login`: Autentikasi email dan kata sandi, mengembalikan JWT Bearer token.
- `POST /api/auth/register`: Pendaftaran pengguna baru.
- `GET /api/me`: Mengambil profil pengguna yang sedang login.

### Proyek
- `GET /api/projects`: Mengambil daftar seluruh proyek aktif & arsip.
- `GET /api/projects/:id`: Detail proyek tertentu.
- `POST /api/projects`: Membuat proyek baru (Admin).
- `PATCH /api/projects/:id`: Memperbarui status, progres fisik, atau pagu proyek.

### Kategori & Transaksi Keuangan
- `GET /api/categories`: Daftar kategori kas masuk dan kas keluar.
- `POST /api/categories`: Menambahkan kategori (Admin).
- `GET /api/transactions`: Mengambil transaksi dengan filter `projectId`, `status`, `type`.
- `GET /api/transactions/:id`: Detail transaksi lengkap dengan lampiran nota.
- `POST /api/transactions`: Mencatat transaksi kas masuk / pengajuan pengeluaran kas.

### Persetujuan (Approvals)
- `GET /api/approvals/pending`: Antrean pengeluaran kas yang menunggu persetujuan (Admin).
- `POST /api/approvals/:transactionId`: Menyetujui (`APPROVED`) atau menolak (`REJECTED`) dengan catatan penolakan.

### RAB (Rencana Anggaran Biaya)
- `GET /api/rab/:projectId`: Mengambil dokumen RAB terstruktur (Sections & Items).
- `PUT /api/rab/:projectId`: Menyimpan/memperbarui RAB dan menyinkronkan total pagu proyek secara atomik.

### Tenaga Kerja & Upah (SDM)
- `GET /api/employees`: Mengambil data master tukang dan mandor.
- `POST /api/employees`: Mendaftarkan tenaga kerja baru.
- `PATCH /api/employees/:id`: Memperbarui tarif harian atau status aktif.
- `GET /api/wages`: Mengambil riwayat pembayaran upah proyek.
- `POST /api/wages`: Mencatat pembayaran upah dan secara atomik membuat transaksi kas keluar `UPAH`.

### Inventaris & Logistik
- `GET /api/inventory`: Daftar item material, stok saat ini, stok minimum, dan lokasi gudang.
- `POST /api/inventory`: Menambahkan master material baru.
- `PATCH /api/inventory/:id`: Memperbarui data material.
- `GET /api/inventory/movements`: Riwayat mutasi stok masuk dan keluar.
- `POST /api/inventory/movements`: Mencatat mutasi keluar/masuk dengan row-level lock `FOR UPDATE` untuk mencegah overselling stok.

### Peralatan & Armada
- `GET /api/equipments`: Daftar alat berat, armada angkut, status dan kondisi terkini.
- `POST /api/equipments`: Mendaftarkan alat baru.
- `PATCH /api/equipments/:id`: Memperbarui data alat.
- `GET /api/equipments/logs`: Riwayat mutasi penugasan dan pengembalian alat.
- `POST /api/equipments/:id/assign`: Menugaskan alat ke proyek tertentu.
- `POST /api/equipments/:id/return`: Mengembalikan alat dari proyek dengan inspeksi kondisi (Baik / Perlu Servis / Rusak).

### Laporan & Analitik D3
- `GET /api/reports/cashflow`: Ringkasan arus kas (total in, out, net), breakdown kategori biaya, dan tren bulanan.
- `GET /api/reports/budget-vs-actual`: Evaluasi pagu anggaran RAB vs realisasi pengeluaran riil per proyek.
