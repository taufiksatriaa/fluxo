# Fluxo

Sistem Manajemen Cashflow, Anggaran Proyek (RAB / BOQ), Otorisasi Pengeluaran, dan Upah Tenaga Kerja.

---

## 📌 Ringkasan Proyek

**Fluxo** dirancang untuk kontraktor, konsultan, dan pemilik proyek yang membutuhkan pemantauan arus kas ketat dan disiplin anggaran. Berbeda dari aplikasi pencatatan keuangan umum, Fluxo menghubungkan setiap transaksi pengeluaran langsung dengan item spesifik dalam Rencana Anggaran Biaya (RAB) serta mewajibkan proses verifikasi bertingkat (approval workflow).

### Fitur Utama
1. **Dashboard Eksekutif**: Metrik KPI kas masuk, kas keluar, net cashflow, antrean persetujuan, dan progres fisik/finansial proyek.
2. **Manajemen Proyek**: Pelacakan siklus hidup proyek (Planning, Running, Done, On Hold) beserta pagu anggaran rencana.
3. **RAB & BOQ Builder**: Penyusunan Rencana Anggaran Biaya berjenjang (Section & Item pekerjaan), kalkulasi otomatis subtotal dan grand total, serta ekspor ke format Excel (CSV) dan PDF siap cetak.
4. **Pencatatan Transaksi**: Kas Masuk (IN - auto approved) dan Kas Keluar (OUT - default pending), pengelompokan biaya (Material, Upah, Operasional, Lainnya), referensi item RAB, dan unggah bukti transfer/bon.
5. **Approval Workflow**: Otorisasi berjenjang oleh Manajemen/Admin untuk menyetujui (`APPROVED`) atau menolak (`REJECTED`) setiap pengeluaran kas.
6. **Manajemen SDM & Upah**: Database tukang/pekerja harian, tarif standar harian, dan pembayaran upah otomatis yang terintegrasi langsung ke buku kas dan modul approval.
7. **Laporan & Analisis Serapan**: Rekonsiliasi anggaran vs realisasi riil, sisa pagu, serta rincian distribusi pengeluaran per kategori.

---

## 🛠️ Tech Stack & Keputusan Arsitektur

### 1. Frontend (`/client`)
- **Framework**: React 19 + TypeScript
- **Bundler & Tooling**: Vite 8, ESLint 9
- **Routing**: React Router v7
- **Desain & Gaya**: Vanilla CSS dengan token semantik modern, responsif multi-viewport, bebas dependensi CSS berat.

### 2. Backend (`/server`)
- **Runtime**: Node.js (ES Modules)
- **Framework Web**: Express 4
- **Keamanan**: Helmet, CORS, JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), Validasi Skema (`zod`)
- **Logging**: Morgan HTTP logger

### 3. Database: PostgreSQL 16+ (Native Driver / No-ORM)
Arsitektur database mengadopsi pendekatan **Native PostgreSQL Driver (`pg`) tanpa ORM**.

#### Alasan Memilih Tanpa ORM:
- **Zero Abstraction Overhead**: Latensi eksekusi kueri mendekati nol tanpa overhead mapping relasional ORM.
- **Kontrol Transaksi Finansial Penuh**: Integritas data cashflow dijamin dengan blok transaksi eksplisit (`BEGIN`, `COMMIT`, `ROLLBACK`) dan tingkat isolasi terukur.
- **Prediktabilitas SQL**: Menghilangkan masalah *N+1 query* dan query otomatis yang tidak efisien.
- **Presisi Moneter Mutlak**: Semua kalkulasi uang dihitung dengan tipe data `NUMERIC(15,2)` langsung pada engine database, mencegah floating-point rounding error pada JavaScript.

---

## 📂 Struktur Direktori Proyek

```text
fluxo/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── src/
│   │   ├── components/         # Komponen UI Reusable (Layout, Nav, Modal)
│   │   ├── pages/              # Halaman Aplikasi (Dashboard, Projects, Budgets, dll.)
│   │   ├── store/              # Global State Management (appStore.tsx)
│   │   ├── lib/                # HTTP API Client & Helper
│   │   ├── App.tsx             # Deklarasi Routing & Guard
│   │   ├── index.css           # Design Tokens & Utility Classes
│   │   └── main.tsx            # Entry point React
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Backend REST API (Express + PostgreSQL)
│   ├── src/
│   │   ├── db/                 # Koneksi pg.Pool & Migration Runner (No-ORM)
│   │   ├── repositories/       # Query SQL mentah terisolasi (Data Access Layer)
│   │   ├── api.js              # REST API Router & Controller
│   │   └── index.js            # Entry point Express Server
│   ├── migrations/             # Skrip DDL SQL murni
│   └── package.json
├── FLOW.md                     # Panduan Alur Bisnis & Integrasi Modul
├── PRD.md                      # Product Requirements Document & Spesifikasi Teknis Lengkap
├── package.json                # Root Workspace Monorepo
└── README.md                   # Dokumentasi Utama
```

---

## 🚀 Panduan Menjalankan Proyek Secara Lokal

### Prasyarat
- **Node.js**: Versi `>= 20.x`
- **npm**: Versi `>= 10.x`
- **PostgreSQL**: Versi `>= 15.x` (opsional jika menjalankan mode template prototype)

### 1. Kloning & Instalasi Dependensi
Jalankan perintah berikut di root direktori proyek untuk menginstal semua dependensi workspace:

```bash
# Clone repositori
git clone <url-repo-fluxo>
cd fluxo

# Install seluruh workspace (client dan server)
npm install
```

### 2. Konfigurasi Environment Variables

#### Backend (`server/.env`):
Salin file `.env.example` ke `.env`:
```bash
cp server/.env.example server/.env
```
Sesuaikan variabel berikut:
```env
PORT=4000
JWT_SECRET=super_secret_jwt_key_minimal_16_karakter
DATABASE_URL=postgresql://postgres:password@localhost:5432/fluxo_db
```

#### Frontend (`client/.env`):
Salin file `.env.example` ke `.env`:
```bash
cp client/.env.example client/.env
```
Isi variabel target API:
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

### 3. Setup Database PostgreSQL (No-ORM)
Pastikan PostgreSQL berjalan di sistem lokal, lalu jalankan runner migrasi otomatis (yang otomatis membuat database `fluxo_db` jika belum ada dan menyemai data awal seed):

```bash
# Menjalankan migrasi & seed awal (Idempotent)
npm run migrate

# Menjalankan test verifikasi API 17-langkah
npm run test:server
```

### 4. Menjalankan Aplikasi

#### Menjalankan Keduanya Bersamaan:
Buka dua terminal atau jalankan script workspace:

```bash
# Terminal 1: Backend Express Server
npm run dev:server

# Terminal 2: Frontend Vite Dev Server
npm run dev:client
```

Aplikasi frontend dapat diakses melalui browser pada:
`http://localhost:5173/`

Endpoint API backend dapat diakses pada:
`http://localhost:4000/api`

---

## 🔒 Hak Akses & Matriks Peran (RBAC)

Fluxo menerapkan kontrol akses berbasis peran (Role-Based Access Control):
- **ADMIN**: Akses penuh ke seluruh modul, membuat proyek baru, mengelola pengguna, dan memproses Approval (Approve / Reject).
- **FINANCE**: Membuat transaksi kas masuk & keluar, menyusun RAB, mencatat pembayaran upah SDM, dan mengekspor laporan.
- **VIEWER**: Akses hanya-baca (Read-Only) untuk melihat dashboard, progres proyek, dan ringkasan laporan keuangan tanpa wewenang mutasi data.

---

## 📖 Dokumentasi Terkait
- [PRD.md](file:///e:/Project/fluxo/PRD.md): Spesifikasi teknis terperinci, sintaks EARS, DDL PostgreSQL, kontrak OpenAPI 3.1, dan arsitektur pengujian TDD.
- [FLOW.md](file:///e:/Project/fluxo/FLOW.md): Alur operasional bisnis harian end-to-end.

---

## 📄 Lisensi
Hak Cipta Dilindungi Undang-Undang © 2026 Fluxo Project.
