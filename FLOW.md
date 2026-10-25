# Alur Operasional Sistem (End-to-End Business Flow)

Dokumen ini menjelaskan alur operasional dan integrasi data antar modul pada **Fluxo**, mulai dari inisiasi proyek, penyusunan anggaran (RAB), pencatatan transaksi kas, alokasi material gudang, penugasan peralatan kerja, hingga evaluasi serapan anggaran dan pelaporan eksekutif.

---

## 1. Konsep Inti & Aturan Bisnis

1. **Sumber Data Tunggal (Unified State)**:
   - Seluruh modul terhubung melalui satu store global terintegrasi ([appStore.tsx](file:///e:/Project/fluxo/client/src/store/appStore.tsx)).
   - Data otomatis tersimpan persisten ke `localStorage` (`fluxo_state_v2`), sehingga perubahan tidak hilang saat browser dimuat ulang.
2. **Integritas Perhitungan Keuangan (Approved-Only)**:
   - Kas Masuk (`IN`) otomatis berstatus `APPROVED` dan langsung menambah saldo kas riil.
   - Kas Keluar (`OUT`) memiliki status awal `PENDING` dan wajib melalui proses otorisasi di menu **Approval**.
   - Hanya transaksi `APPROVED` yang dihitung ke dalam Kas Keluar Riil, Net Cashflow, dan Serapan Anggaran Proyek.
3. **Hirarki Pagu Anggaran Proyek**:
   - Jika proyek telah memiliki dokumen RAB (Bill of Quantities), maka **Pagu Total Anggaran = Grand Total RAB**.
   - Jika proyek belum memiliki RAB, maka sistem menggunakan nilai acuan rencana awal (**Budget Plan Proyek**).
4. **Relasi Biaya ke Item Pekerjaan (BOQ Tracking)**:
   - Setiap pengeluaran material atau upah dapat dikaitkan langsung ke baris item RAB (`sectionId` dan `itemId`) untuk melacak serapan anggaran per pekerjaan secara riil.

---

## 2. Alur Kerja Harian (Workflow Step-by-Step)

```text
[ 1. Inisiasi Proyek ] 
        │
        ▼
[ 2. Susun RAB / BOQ ] ─────────────┐
        │                           │
        ▼                           ▼
[ 3. Alokasi Logistik ]     [ 5. Input Transaksi ]
  ├─ Material (Inventory)     ├─ Pembayaran Klien (IN -> Approved)
  └─ Peralatan (Equipment)    ├─ Pengeluaran Kas (OUT -> Pending)
        │                     └─ Upah Mandor/Tukang (SDM -> Pending)
        │                           │
        │                           ▼
        │                   [ 6. Verifikasi & Approval ]
        │                     ├─ Approve -> Masuk Kas Keluar & Serapan RAB
        │                     └─ Reject  -> Catat Alasan Penolakan
        ▼                           │
[ 4. Pengembalian Alat ]            ▼
        └─────────────────► [ 7. Monitoring & Laporan ]
                              ├─ Dashboard Visual D3.js
                              ├─ Matriks Realisasi vs Pagu RAB
                              └─ Rekap Finansial & Export CSV/PDF
```

---

### Langkah 1: Inisiasi Proyek Baru
* **Menu:** **Project** (`/projects`) | **File:** [ProjectsPage.tsx](file:///e:/Project/fluxo/client/src/pages/ProjectsPage.tsx)
* **Tindakan:**
  - Tambahkan proyek baru dengan mengisi: Kode Proyek (misal: `PRJ-004`), Nama Proyek, Penanggung Jawab (*Project Manager*), Tanggal Mulai s/d Selesai, dan Estimasi Anggaran Rencana (*Budget Plan Total*).
  - Tentukan status awal: `PLANNING` atau `RUNNING`.
* **Dampak Sistem:**
  - Proyek muncul di Dashboard dan dropdown seluruh modul aplikasi.

---

### Langkah 2: Penyusunan Dokumen RAB (Bill of Quantities)
* **Menu:** **RAB** (`/budgets`) | **File:** [BudgetsPage.tsx](file:///e:/Project/fluxo/client/src/pages/BudgetsPage.tsx)
* **Tindakan:**
  - Pilih proyek yang bersangkutan.
  - Tambahkan section pekerjaan (misal: *Section A: Pekerjaan Tanah & Pondasi*, *Section B: Pekerjaan Dinding & Plesteran*).
  - Isi rincian item: Nomor, Deskripsi Pekerjaan, Spesifikasi Teknis, Kuantitas (Volume), Satuan (`m2`, `m3`, `sak`, `unit`, `ls`), dan Harga Satuan (@Harga).
  - Sistem menghitung subtotal section dan Grand Total secara otomatis.
* **Dampak Sistem:**
  - Grand Total RAB menggantikan *Budget Plan* sebagai pagu anggaran resmi proyek pada Dashboard, Laporan, dan Detail Proyek.
  - Tersedia fitur ekspor ke **Excel (CSV)** dan cetak dokumen **PDF**.

---

### Langkah 3: Alokasi Material & Penugasan Peralatan Kerja

#### A. Material Gudang (Inventory)
* **Menu:** **Inventory** (`/inventory`) | **File:** [InventoryPage.tsx](file:///e:/Project/fluxo/client/src/pages/InventoryPage.tsx)
* **Alur Mutasi:**
  - **Penerimaan (IN):** Catat material masuk dari supplier ke gudang utama (menambah stok).
  - **Pengeluaran (OUT):** Catat alokasi material ke proyek (mengurangi stok gudang fisik).
  - **Deteksi Kritis:** Sistem otomatis memberikan label peringatan merah jika stok material di bawah ambang batas minimum.

#### B. Peralatan Kerja (Equipment)
* **Menu:** **Peralatan** (`/equipment`) | **File:** [EquipmentPage.tsx](file:///e:/Project/fluxo/client/src/pages/EquipmentPage.tsx)
* **Alur Penugasan:**
  - Pilih alat berat, genset, molen, atau perancah berstatus `TERSEDIA`.
  - Klik **Tugaskan Proyek**, pilih proyek target dan nama penanggung jawab (Mandor / PIC).
  - Status alat berubah menjadi `DIPAKAI PROYEK` dan lokasi tercatat di site proyek terkait.
  - Saat selesai, klik **Kembalikan** dan lakukan cek fisik (Kondisi Baik, Perlu Servis, atau Rusak).

---

### Langkah 4: Pencatatan Kas & Upah Tenaga Kerja

#### A. Kas Masuk & Kas Keluar Umum
* **Menu:** **Transaksi** (`/transactions`) | **File:** [TransactionsPage.tsx](file:///e:/Project/fluxo/client/src/pages/TransactionsPage.tsx)
* **Aturan Input:**
  - **Kas Masuk (IN):** Untuk penerimaan termin pembayaran atau uang muka (DP) dari pemilik proyek. Otomatis berstatus `APPROVED`.
  - **Kas Keluar (OUT):** Pilih kategori biaya (*Material*, *Operasional*, *Other*), tentukan referensi section dan item RAB yang dibelanjakan (`rabRef`), masukkan nominal, dan unggah foto struk/nota bukti transfer (tersimpan persisten via format DataURL). Otomatis berstatus `PENDING`.

#### B. Upah Harian SDM (Mandor & Tukang)
* **Menu:** **SDM & Upah** (`/sdm`) | **File:** [SdmPage.tsx](file:///e:/Project/fluxo/client/src/pages/SdmPage.tsx)
* **Aturan Pembayaran:**
  - Pilih tenaga kerja terdaftar, masukkan jumlah hari kerja dan tarif harian.
  - Sistem secara otomatis menerbitkan satu entri transaksi pengeluaran `OUT` berkategori `UPAH` berstatus `PENDING` ke antrean persetujuan.

---

### Langkah 5: Otorisasi & Verifikasi Pengeluaran (Approval)
* **Menu:** **Approval** (`/approvals`) | **File:** [ApprovalsPage.tsx](file:///e:/Project/fluxo/client/src/pages/ApprovalsPage.tsx)
* **Wewenang:** Hanya pengguna dengan peran `ADMIN`.
* **Tindakan:**
  - Buka pratinjau bukti nota (*image/receipt preview*).
  - **Approve:** Transaksi resmi menjadi kas keluar sah (`APPROVED`), menambah total serapan anggaran proyek, dan masuk ke buku kas.
  - **Reject:** Muncul dialog penolakan. Admin memilih/mengetik alasan penolakan spesifik (misal: *"Harga melebihi standar RAB"* atau *"Struk nota tidak terbaca"*). Transaksi ditandai `REJECTED` dan alasan penolakan langsung terlihat oleh pembuat transaksi.

---

### Langkah 6: Monitoring Eksekutif & Evaluasi Serapan

#### A. Dashboard Grafis D3.js
* **Menu:** **Dashboard** (`/`) | **File:** [DashboardPage.tsx](file:///e:/Project/fluxo/client/src/pages/DashboardPage.tsx)
* **Fitur Visual:**
  - **Tren Arus Kas (D3 Area Chart):** Grafik interpolasi kurva halus memantau laju kas masuk vs kas keluar kumulatif dilengkapi garis *crosshair* interaktif.
  - **Distribusi Pengeluaran (D3 Donut Chart):** Komposisi biaya material, upah, operasional, dan overhead.
  - **Evaluasi Pagu vs Realisasi (D3 Grouped Bar Chart):** Komparasi visual pagu rencana vs uang riil yang terserap per proyek.

#### B. Evaluasi Serapan Real-Time per Item RAB
* **Menu:** **RAB** (`/budgets`) | Tombol: **Realisasi vs Pagu**
* **Tampilan Matriks:**
  - Menampilkan kolom komparasi per baris pekerjaan: `Pagu Rencana` vs `Realisasi Kas Keluar` vs `Sisa Pagu`.
  - Peringatan otomatis **Over-Budget** jika realisasi pengeluaran melampaui alokasi biaya item RAB yang direncanakan.

#### C. Detail Komprehensif Proyek
* **Menu:** **Detail Proyek** (`/projects/:id`) | **File:** [ProjectDetailPage.tsx](file:///e:/Project/fluxo/client/src/pages/ProjectDetailPage.tsx)
* **4 Tab Terpadu:**
  1. Riwayat Transaksi khusus proyek bersangkutan.
  2. Rincian Dokumen RAB dan ringkasan nilai per section.
  3. Riwayat Pembayaran Upah Tenaga Kerja proyek.
  4. Daftar Mesin & Peralatan yang saat ini bertugas di lokasi proyek.
