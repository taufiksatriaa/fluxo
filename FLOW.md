# Flow Aplikasi (Frontend Template)

Dokumen ini menjelaskan alur penggunaan aplikasi **Fluxo** versi template (tanpa API & tanpa database), dan bagaimana setiap menu saling terhubung lewat store global.

## Konsep utama

- Semua data hidup di **store global**: [appStore.tsx](file:///e:/Project/fluxo/client/src/store/appStore.tsx)
- Semua halaman baca & update store via `useAppStore()`
- Status yang dipakai:
  - Transaksi: `IN / OUT`
  - Approval status: `PENDING / APPROVED / REJECTED`
  - Opsi pengeluaran: `Material / Upah / Operasional / Other`
- Perhitungan yang konsisten di seluruh menu:
  - Cashflow dan laporan hanya menggunakan transaksi `APPROVED`
  - `IN` otomatis `APPROVED`
  - `OUT` default `PENDING` (harus diproses di menu Approval)
  - Budget total per project:
    - Jika ada RAB untuk project → `Budget Total = total RAB`
    - Jika tidak ada RAB → `Budget Total = budget plan project`
  - Budget terpakai per project → total transaksi `OUT` yang `APPROVED`

## Flow end-to-end (disarankan)

### 1) Buat atau siapkan Project

Menu: **Project** (`/projects`)  
File: [ProjectsPage.tsx](file:///e:/Project/fluxo/client/src/pages/ProjectsPage.tsx)

- Tambahkan project baru (kode, nama, owner, tanggal, budget plan).
- Isi progress (%) sesuai progress lapangan.
- Set status project (PLANNING/RUNNING/DONE/ON_HOLD).

Output yang mempengaruhi menu lain:
- Dashboard akan menampilkan project ini pada list progress.
- Laporan akan bisa memfilter berdasarkan project ini.

### 2) Susun RAB untuk Project (opsional tapi direkomendasikan)

Menu: **RAB** (`/budgets`)  
File: [BudgetsPage.tsx](file:///e:/Project/fluxo/client/src/pages/BudgetsPage.tsx)

- Pilih project di bagian Info.
- Buat section (A/B/C...) dan isi item-item RAB.
- Total otomatis dihitung:
  - Jumlah per item = qty × @harga
  - Subtotal per section
  - Grand total

Output yang mempengaruhi menu lain:
- Dashboard/Project/Laporan akan memakai **total RAB** sebagai `Budget Total` (menggantikan budget plan).

Opsional:
- Export Excel (CSV)
- Export PDF (Print/Save as PDF)

### 3) Input Transaksi (Kas Masuk/Keluar)

Menu: **Transaksi** (`/transactions`)  
File: [TransactionsPage.tsx](file:///e:/Project/fluxo/client/src/pages/TransactionsPage.tsx)

- Pilih project.
- Pilih type:
  - IN (kas masuk)
  - OUT (kas keluar)
- Untuk OUT pilih **Opsi**:
  - Material / Upah / Operasional / Other
- Isi nominal, tanggal, deskripsi.
- Upload bukti pembayaran/bon (image/pdf) bila ada.

Rules:
- IN → langsung `APPROVED`
- OUT → otomatis `PENDING`

Output yang mempengaruhi menu lain:
- Dashboard (kas masuk/keluar/net) akan berubah (hanya menghitung APPROVED).
- Approval akan bertambah jika transaksi OUT masih PENDING.
- Laporan akan berubah jika transaksi sudah APPROVED.

### 4) Proses Approval Pengeluaran (OUT)

Menu: **Approval** (`/approvals`)  
File: [ApprovalsPage.tsx](file:///e:/Project/fluxo/client/src/pages/ApprovalsPage.tsx)

- Semua transaksi OUT berstatus `PENDING` muncul di sini.
- Klik:
  - Approve → status jadi `APPROVED`
  - Reject → status jadi `REJECTED`
- Bisa lihat bukti (jika ada) sebelum approve/reject.

Output yang mempengaruhi menu lain:
- Dashboard:
  - Pending count berkurang
  - Kas keluar/net ikut berubah jika di-approve
- Laporan:
  - Cashflow (approved) dan breakdown OUT akan ikut berubah

### 5) Monitoring di Dashboard

Menu: **Dashboard** (`/`)  
File: [DashboardPage.tsx](file:///e:/Project/fluxo/client/src/pages/DashboardPage.tsx)

Yang ditampilkan:
- KPI cashflow: total IN/OUT/net (approved-only)
- Pending approvals
- Project aktif (status RUNNING)
- Progress tiap project (weighted by budget)
- Budget terpakai per project (OUT approved)

### 6) Laporan

Menu: **Laporan** (`/reports`)  
File: [ReportsPage.tsx](file:///e:/Project/fluxo/client/src/pages/ReportsPage.tsx)

- Filter berdasarkan project dan rentang tanggal.
- Summary:
  - Total IN/OUT/NET (approved-only)
  - Budget vs realisasi
  - Sisa budget
- Breakdown OUT per opsi (Material/Upah/Operasional/Other)

## Catatan pengembangan (next step)

- Persist store (localStorage) supaya data tidak reset saat refresh.
- Tambah master kategori dinamis (tidak hardcode).
- Integrasi backend:
  - DB untuk project/transaksi/approval/rab
  - Upload bukti transaksi ke storage (S3/MinIO/local) + simpan URL
