# Fluxo

Sistem management pencatatan keuangan / cashflow project.

Saat ini fokusnya adalah **kerangka frontend** (template UI) untuk modul-modul cashflow project, dengan data dummy yang saling terintegrasi lewat 1 store global (tanpa API & tanpa database dulu).

## Menjalankan aplikasi (frontend)

1. Install dependency

   ```bash
   npm install
   ```

2. Jalankan frontend

   ```bash
   npm run dev
   ```

3. Buka aplikasi

   - URL biasanya: `http://localhost:5173/` (kalau bentrok port, Vite akan pakai port lain)

## Struktur & integrasi data (tanpa API)

Semua halaman menggunakan satu sumber data agar modul saling terhubung:

- Store global: [appStore.tsx](file:///e:/Project/fluxo/client/src/store/appStore.tsx)
- Provider dipasang di root app: [main.tsx](file:///e:/Project/fluxo/client/src/main.tsx)

Dengan ini:

- Tambah transaksi di **Transaksi** akan mengubah KPI di **Dashboard** dan angka di **Laporan**
- Approve/Reject di **Approval** akan mengubah pending count dan perhitungan cashflow (approved-only)
- RAB per project akan menjadi acuan **Budget Total** di **Dashboard/Project/Laporan** (jika belum ada RAB, fallback ke budget plan project)

Catatan: Data masih in-memory di browser. Refresh halaman akan mengembalikan ke dummy awal.

## Penjelasan menu / modul

### 1) Dashboard

File: [DashboardPage.tsx](file:///e:/Project/fluxo/client/src/pages/DashboardPage.tsx)

- KPI: Kas Masuk, Kas Keluar, Net Cashflow (hanya transaksi APPROVED), pending approval, project aktif
- Progress project: progress % per project + overall progress (weighted by budget)
- Budget terpakai diambil dari total OUT APPROVED per project

### 2) Project

File: [ProjectsPage.tsx](file:///e:/Project/fluxo/client/src/pages/ProjectsPage.tsx)

- Tambah project (kode, nama, owner, tanggal mulai/selesai, budget plan)
- Ubah status project: PLANNING/RUNNING/DONE/ON_HOLD
- Ubah progress (%) project
- Menampilkan:
  - Budget Total: total RAB jika ada, kalau tidak pakai budget plan
  - Budget Terpakai: total transaksi OUT APPROVED

### 3) Transaksi

File: [TransactionsPage.tsx](file:///e:/Project/fluxo/client/src/pages/TransactionsPage.tsx)

- Tambah transaksi IN/OUT dengan:
  - Opsi: Material / Upah / Operasional / Other
  - Kategori (berdasarkan type)
  - Nominal, tanggal, deskripsi
  - Upload bukti/bon (image/pdf) untuk template
- Rules (template):
  - IN → auto APPROVED
  - OUT → default PENDING (menunggu approval)
- Filter: project, type, opsi, status, pencarian

### 4) Approval

File: [ApprovalsPage.tsx](file:///e:/Project/fluxo/client/src/pages/ApprovalsPage.tsx)

- Menampilkan transaksi OUT yang statusnya PENDING
- Tombol Approve/Reject (mengubah status transaksi di store)
- Bisa melihat bukti/bon yang diupload pada transaksi

### 5) RAB (Budget)

File: [BudgetsPage.tsx](file:///e:/Project/fluxo/client/src/pages/BudgetsPage.tsx)

- RAB per project (pilih project di bagian Info)
- Model tabel seperti BOQ:
  - Section (A, B, C, ...) + items
  - Kolom: No, Description, Spesifikasi, Qty, Unit, @Harga, Jumlah
  - Subtotal per section dan Grand total + terbilang
- Export:
  - Export Excel: download CSV (Excel bisa buka)
  - Export PDF: open tab print → Save as PDF

### 6) Laporan

File: [ReportsPage.tsx](file:///e:/Project/fluxo/client/src/pages/ReportsPage.tsx)

- Filter: project + range tanggal
- Ringkasan cashflow (approved-only)
- Budget vs realisasi:
  - Budget: total RAB (jika ada) atau budget plan
  - Realisasi: total OUT APPROVED
  - Sisa budget
- Breakdown pengeluaran (OUT) per opsi (Material/Upah/Operasional/Other)

## Routing

Semua route ada di: [App.tsx](file:///e:/Project/fluxo/client/src/App.tsx)

- `/` Dashboard
- `/projects` Project
- `/transactions` Transaksi
- `/approvals` Approval
- `/budgets` RAB
- `/reports` Laporan

## Catatan

- Ini masih template UI (belum ada backend API & database untuk versi sekarang).
- Next step umum untuk produksi: simpan state ke database via API, dan file bukti/bon ke storage (S3/MinIO/local) lalu simpan URL-nya.  
