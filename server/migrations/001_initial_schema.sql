-- ====================================================================
-- Fluxo PostgreSQL Initial Schema (Pure SQL / No-ORM)
-- Versi: 1.0.0
-- Karakteristik: UUID Primary Key, Foreign Keys dengan Restrict Actions,
--               Tipe Moneter NUMERIC(15,2), Audit Trail Append-Only
-- ====================================================================

-- 1. Ekstensi UUID Generator (bila pgcrypto dibutuhkan, walau gen_random_uuid bawaan PG 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enumeration Types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'FINANCE', 'VIEWER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM ('PLANNING', 'RUNNING', 'DONE', 'ON_HOLD');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tx_type') THEN
        CREATE TYPE tx_type AS ENUM ('IN', 'OUT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tx_group') THEN
        CREATE TYPE tx_group AS ENUM ('MATERIAL', 'UPAH', 'OPERASIONAL', 'OTHER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_movement_type') THEN
        CREATE TYPE inventory_movement_type AS ENUM ('IN', 'OUT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_status') THEN
        CREATE TYPE equipment_status AS ENUM ('TERSEDIA', 'DIPAKAI', 'PERBAIKAN', 'RUSAK');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_condition') THEN
        CREATE TYPE equipment_condition AS ENUM ('BAIK', 'PERLU_SERVIS', 'RUSAK');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'equipment_action') THEN
        CREATE TYPE equipment_action AS ENUM ('ASSIGN', 'RETURN', 'SERVICE_START', 'SERVICE_DONE');
    END IF;
END $$;

-- 3. Tabel Pengguna (Users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'VIEWER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Proyek (Projects)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status project_status NOT NULL DEFAULT 'PLANNING',
    progress_pct SMALLINT NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
    budget_plan_total NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (budget_plan_total >= 0),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);

-- 5. Tabel Kategori Transaksi (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type tx_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Master Dokumen RAB (Rabs)
CREATE TABLE IF NOT EXISTS rabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Section RAB (Rab Sections)
CREATE TABLE IF NOT EXISTS rab_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rab_id UUID NOT NULL REFERENCES rabs(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rab_sections_rab_id ON rab_sections(rab_id);

-- 8. Tabel Line Items RAB (Rab Items)
CREATE TABLE IF NOT EXISTS rab_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES rab_sections(id) ON DELETE CASCADE,
    item_no VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    spec TEXT,
    qty NUMERIC(12,2) NOT NULL CHECK (qty >= 0),
    unit VARCHAR(30) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
    sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rab_items_section_id ON rab_items(section_id);

-- 9. Tabel Transaksi Kas Masuk & Keluar (Transactions)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    tx_group tx_group NOT NULL,
    tx_type tx_type NOT NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    occurred_at DATE NOT NULL,
    description TEXT NOT NULL,
    rab_section_id UUID REFERENCES rab_sections(id) ON DELETE SET NULL,
    rab_item_id UUID REFERENCES rab_items(id) ON DELETE SET NULL,
    approval_status approval_status NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tx_project_date ON transactions(project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_status_type ON transactions(approval_status, tx_type);
CREATE INDEX IF NOT EXISTS idx_tx_rab_item ON transactions(rab_item_id);

-- 10. Tabel Lampiran Bukti Transaksi (Transaction Attachments)
CREATE TABLE IF NOT EXISTS transaction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    data_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tx_attachments_tx ON transaction_attachments(transaction_id);

-- 11. Tabel Riwayat Persetujuan (Approvals)
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    status approval_status NOT NULL CHECK (status IN ('APPROVED', 'REJECTED')),
    note TEXT,
    acted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    acted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_approvals_tx ON approvals(transaction_id);

-- 12. Tabel Master SDM / Tenaga Kerja (Employees)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    role_title VARCHAR(100) NOT NULL,
    default_daily_rate NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (default_daily_rate >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Tabel Pencatatan Upah SDM (Wage Payments)
CREATE TABLE IF NOT EXISTS wage_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    occurred_at DATE NOT NULL,
    days NUMERIC(6,2) NOT NULL CHECK (days > 0),
    daily_rate NUMERIC(15,2) NOT NULL CHECK (daily_rate >= 0),
    amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
    note TEXT,
    rab_section_id UUID REFERENCES rab_sections(id) ON DELETE SET NULL,
    rab_item_id UUID REFERENCES rab_items(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wage_project ON wage_payments(project_id);
CREATE INDEX IF NOT EXISTS idx_wage_employee ON wage_payments(employee_id);

-- 14. Tabel Master Inventaris & Logistik (Inventory Items)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Material',
    unit VARCHAR(30) NOT NULL,
    min_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (min_stock >= 0),
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    location VARCHAR(100) NOT NULL DEFAULT 'Gudang Utama',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inv_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inv_code ON inventory_items(code);

-- 15. Tabel Mutasi Stok Inventaris (Inventory Movements)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    type inventory_movement_type NOT NULL,
    qty NUMERIC(12,2) NOT NULL CHECK (qty > 0),
    notes TEXT,
    occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inv_movements_item ON inventory_movements(item_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_movements_project ON inventory_movements(project_id);

-- 16. Tabel Master Alat & Armada (Equipments)
CREATE TABLE IF NOT EXISTS equipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Alat Berat',
    serial_no VARCHAR(100),
    condition equipment_condition NOT NULL DEFAULT 'BAIK',
    status equipment_status NOT NULL DEFAULT 'TERSEDIA',
    current_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    assigned_to VARCHAR(150),
    assigned_date DATE,
    location VARCHAR(150) NOT NULL DEFAULT 'Pool Pusat',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON equipments(status);
CREATE INDEX IF NOT EXISTS idx_equipments_project ON equipments(current_project_id);

-- 17. Tabel Log Riwayat Alat (Equipment Logs)
CREATE TABLE IF NOT EXISTS equipment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
    action equipment_action NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    pic VARCHAR(150),
    note TEXT,
    occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_eq_logs_eq ON equipment_logs(equipment_id, occurred_at DESC);

-- 18. Tabel Audit Trail (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
