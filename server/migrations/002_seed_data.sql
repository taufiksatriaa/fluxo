-- ====================================================================
-- Fluxo PostgreSQL Seed Data (Idempotent / ON CONFLICT DO NOTHING)
-- Catatan: UUID harus menggunakan karakter hexadesimal valid [0-9a-f]
-- ====================================================================

-- 1. Seed Users (password: password123)
-- Hash: $2a$10$i6TcP4qFsy.UJQOULAqcA.hPSqoKhiPxHiejdfCSBpVQPatz/6oO6
INSERT INTO users (id, email, password_hash, name, role)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'admin@fluxo.id', '$2a$10$i6TcP4qFsy.UJQOULAqcA.hPSqoKhiPxHiejdfCSBpVQPatz/6oO6', 'Admin Konstruksi', 'ADMIN'),
    ('a0000000-0000-0000-0000-000000000002', 'finance@fluxo.id', '$2a$10$i6TcP4qFsy.UJQOULAqcA.hPSqoKhiPxHiejdfCSBpVQPatz/6oO6', 'Siti Rahma (Finance)', 'FINANCE'),
    ('a0000000-0000-0000-0000-000000000003', 'viewer@fluxo.id', '$2a$10$i6TcP4qFsy.UJQOULAqcA.hPSqoKhiPxHiejdfCSBpVQPatz/6oO6', 'Budi Santoso (Site Mgr)', 'VIEWER')
ON CONFLICT (email) DO NOTHING;

-- 2. Seed Categories
INSERT INTO categories (id, name, type)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'Pembayaran Termin Konsumen', 'IN'),
    ('c0000000-0000-0000-0000-000000000002', 'Pencairan Modal Proyek', 'IN'),
    ('c0000000-0000-0000-0000-000000000003', 'Material & Bahan Bangunan', 'OUT'),
    ('c0000000-0000-0000-0000-000000000004', 'Upah Tenaga Kerja Lapangan', 'OUT'),
    ('c0000000-0000-0000-0000-000000000005', 'Sewa Alat & Mob-Demob', 'OUT'),
    ('c0000000-0000-0000-0000-000000000006', 'Operasional Kantor & Lapangan', 'OUT')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Projects
INSERT INTO projects (id, code, name, description, owner, start_date, end_date, status, progress_pct, budget_plan_total, created_by)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'PRJ-001', 'Renovasi Gedung Arsip Bappeda', 'Pekerjaan struktur pembongkaran, partisi gypsum, instalasi elektrikal dan HVAC', 'Dinas Perpustakaan & Arsip', '2026-01-10', '2026-06-30', 'RUNNING', 45, 1500000000.00, 'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', 'PRJ-002', 'Pembangunan Ruko Grand City Blok A', 'Konstruksi 3 lantai beton bertulang, finishing tampak depan kaca curtain wall', 'PT Megah Perkasa Prima', '2026-02-01', '2026-11-30', 'RUNNING', 20, 2800000000.00, 'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000003', 'PRJ-003', 'Paving Block & Drainase Industri', 'Perkerasan jalan akses pabrik dan pembuatan saluran u-ditch', 'PT Sentra Logistik Nasional', '2026-03-15', '2026-07-15', 'PLANNING', 5, 650000000.00, 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 4. Seed RAB & Sections & Items for PRJ-001
INSERT INTO rabs (id, project_id, title, version)
VALUES ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'RAB Definitif Renovasi Gedung Bappeda', 1)
ON CONFLICT (project_id) DO NOTHING;

INSERT INTO rab_sections (id, rab_id, code, title, sort_order)
VALUES 
    ('d1000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'SEC-01', 'Pekerjaan Persiapan & Bongkaran', 1),
    ('d1000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'SEC-02', 'Pekerjaan Struktur & Dinding Partisi', 2),
    ('d1000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'SEC-03', 'Pekerjaan Mekanikal & Elektrikal (MEP)', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rab_items (id, section_id, item_no, title, spec, qty, unit, unit_price, sort_order)
VALUES 
    ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', '1.1', 'Pembersihan Lahan & Proteksi Debu', 'Terpal 6x8m + Kayu Kaso 5/7', 1.00, 'ls', 15000000.00, 1),
    ('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', '1.2', 'Pembongkaran Partisi Eksisting', 'Partisi triplek eksisting tebal 9mm', 240.00, 'm2', 45000.00, 2),
    ('d2000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000002', '2.1', 'Partisi Gypsum 9mm Rangka Hollow', 'Jayaboard + Hollow 40x40 0.35', 380.00, 'm2', 175000.00, 1),
    ('d2000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000002', '2.2', 'Pengecatan Interior Dinding & Plafon', 'Dulux Catylac Interior White', 760.00, 'm2', 38000.00, 2),
    ('d2000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', '3.1', 'Instalasi Titik Lampu LED Downlight', 'Philips LED 12W + Pipa Conduit 20mm', 85.00, 'unit', 185000.00, 1)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Employees (SDM)
INSERT INTO employees (id, name, role_title, default_daily_rate, active)
VALUES 
    ('e0000000-0000-0000-0000-000000000001', 'Bambang Sutrisno', 'Mandor Struktur', 250000.00, TRUE),
    ('e0000000-0000-0000-0000-000000000002', 'Joko Widodo', 'Tukang Besi & Pembesian', 180000.00, TRUE),
    ('e0000000-0000-0000-0000-000000000003', 'Agus Setiawan', 'Tukang Finishing & Partisi', 180000.00, TRUE),
    ('e0000000-0000-0000-0000-000000000004', 'Slamet Riyadi', 'Pekerja Lapangan / Kenek', 130000.00, TRUE),
    ('e0000000-0000-0000-0000-000000000005', 'Deni Kurnia', 'Operator Alat Berat', 220000.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Inventory Items
INSERT INTO inventory_items (id, code, name, category, unit, min_stock, current_stock, unit_price, location, notes)
VALUES 
    ('f1000000-0000-0000-0000-000000000001', 'MAT-001', 'Semen Gresik 50kg', 'Material Semen', 'sak', 50.00, 150.00, 68000.00, 'Gudang Utama - Rak A1', 'Penyimpanan beralas pallet kering'),
    ('f1000000-0000-0000-0000-000000000002', 'MAT-002', 'Besi Beton Ulir 12mm SNI', 'Material Besi', 'btg', 100.00, 320.00, 115000.00, 'Gudang Utama - Rak B2', 'Sertifikat uji tarik tersedia'),
    ('f1000000-0000-0000-0000-000000000003', 'MAT-003', 'Pasir Pasang Hitam', 'Agregat', 'm3', 15.00, 45.00, 280000.00, 'Depo Pasir Lapangan', 'Kadar lumpur di bawah 5%'),
    ('f1000000-0000-0000-0000-000000000004', 'MAT-004', 'Batu Pecah / Split 2/3', 'Agregat', 'm3', 20.00, 8.00, 310000.00, 'Depo Split', 'Perhatian: stok menipis di bawah minimum'),
    ('f1000000-0000-0000-0000-000000000005', 'MAT-005', 'Triplek Phenolic 12mm', 'Bekisting', 'lbr', 30.00, 80.00, 175000.00, 'Gudang Utama - Rak C1', 'Tahan air untuk bekisting cor'),
    ('f1000000-0000-0000-0000-000000000006', 'MAT-006', 'Kawat Bendrat Galvanis', 'Aksesoris Besi', 'kg', 25.00, 95.00, 26000.00, 'Gudang Utama - Rak B1', 'Kawat pengikat tulangan')
ON CONFLICT (code) DO NOTHING;

-- 7. Seed Equipments
INSERT INTO equipments (id, code, name, category, serial_no, condition, status, current_project_id, assigned_to, assigned_date, location, notes)
VALUES 
    ('f2000000-0000-0000-0000-000000000001', 'EQ-001', 'Excavator Komatsu PC78US', 'Alat Berat', 'KM-PC78-9842', 'BAIK', 'TERSEDIA', NULL, NULL, NULL, 'Pool Alat Pusat', 'Servis rutin berkala 250 jam'),
    ('f2000000-0000-0000-0000-000000000002', 'EQ-002', 'Dump Truck Hino Dutro 130HD', 'Armada Angkut', 'HN-DT130-221', 'BAIK', 'DIPAKAI', 'b0000000-0000-0000-0000-000000000001', 'Deni Kurnia', '2026-02-15', 'Site PRJ-001 Gedung Arsip', 'Angkut puing dan material urug'),
    ('f2000000-0000-0000-0000-000000000003', 'EQ-003', 'Concrete Mixer Molen 350L', 'Mesin Cor', 'ML-350-554', 'BAIK', 'DIPAKAI', 'b0000000-0000-0000-0000-000000000001', 'Bambang Sutrisno', '2026-02-20', 'Site PRJ-001 Gedung Arsip', 'Mesin diesel Yanmar TF85'),
    ('f2000000-0000-0000-0000-000000000004', 'EQ-004', 'Bar Bender & Cutter 32mm', 'Alat Kerja Besi', 'BC-32-108', 'PERLU_SERVIS', 'PERBAIKAN', NULL, NULL, NULL, 'Bengkel Workshop Utama', 'Ganti pisau potong dan cek oli hidrolik'),
    ('f2000000-0000-0000-0000-000000000005', 'EQ-005', 'Genset Silent Perkins 50kVA', 'Daya Listrik', 'PK-50KVA-771', 'BAIK', 'TERSEDIA', NULL, NULL, NULL, 'Pool Alat Pusat', 'Siap pakai operasional backup lapangan'),
    ('f2000000-0000-0000-0000-000000000006', 'EQ-006', 'Stamper Kuda Vibrator Mikasa', 'Pemadat Tanah', 'MK-ST75-334', 'BAIK', 'TERSEDIA', NULL, NULL, NULL, 'Pool Alat Pusat', 'Kondisi mesin prima')
ON CONFLICT (code) DO NOTHING;

-- 8. Seed Sample Transactions
INSERT INTO transactions (id, project_id, category_id, tx_group, tx_type, amount, occurred_at, description, approval_status, created_by)
VALUES 
    ('f3000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'OTHER', 'IN', 300000000.00, '2026-01-15', 'Pencairan Kas Operasional Awal Proyek Bappeda', 'APPROVED', 'a0000000-0000-0000-0000-000000000001'),
    ('f3000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'OTHER', 'IN', 450000000.00, '2026-02-28', 'Pembayaran Termin 1 Prestasi Fisik 30%', 'APPROVED', 'a0000000-0000-0000-0000-000000000001'),
    ('f3000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'MATERIAL', 'OUT', 10200000.00, '2026-02-10', 'Pembelian Semen 150 sak untuk cor balok lantai 2', 'APPROVED', 'a0000000-0000-0000-0000-000000000002'),
    ('f3000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'UPAH', 'OUT', 12500000.00, '2026-02-14', 'Upah Mingguan Tim Tukang & Kenek Periode 1', 'APPROVED', 'a0000000-0000-0000-0000-000000000002'),
    ('f3000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'OPERASIONAL', 'OUT', 4500000.00, '2026-02-16', 'Sewa Molen dan Solar Operasional 1 Pekan', 'APPROVED', 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;
