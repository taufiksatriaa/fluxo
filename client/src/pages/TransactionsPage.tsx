import { useMemo, useState } from "react";

type TransactionType = "IN" | "OUT";
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

type Project = {
  id: string;
  code: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  type: TransactionType;
};

type Transaction = {
  id: string;
  projectId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  occurredAt: string;
  description: string;
  approvalStatus: ApprovalStatus;
  createdAt: string;
};

const PROJECTS: Project[] = [
  { id: "prj-1", code: "PRJ-001", name: "Renovasi Kantor" },
  { id: "prj-2", code: "PRJ-002", name: "Pembangunan Gudang" },
  { id: "prj-3", code: "PRJ-003", name: "Implementasi Sistem" },
];

const CATEGORIES: Category[] = [
  { id: "cat-1", name: "Pembayaran Client", type: "IN" },
  { id: "cat-2", name: "Material", type: "OUT" },
  { id: "cat-3", name: "Upah Tukang", type: "OUT" },
  { id: "cat-4", name: "Transport", type: "OUT" },
];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatIdr(value: number) {
  return value.toLocaleString("id-ID");
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => [
    {
      id: "tx-1",
      projectId: "prj-1",
      categoryId: "cat-2",
      type: "OUT",
      amount: 1250000,
      occurredAt: "2026-04-04",
      description: "Beli material awal",
      approvalStatus: "APPROVED",
      createdAt: "2026-04-04T09:30:00Z",
    },
    {
      id: "tx-2",
      projectId: "prj-1",
      categoryId: "cat-1",
      type: "IN",
      amount: 5000000,
      occurredAt: "2026-04-03",
      description: "DP dari client",
      approvalStatus: "APPROVED",
      createdAt: "2026-04-03T10:10:00Z",
    },
    {
      id: "tx-3",
      projectId: "prj-2",
      categoryId: "cat-3",
      type: "OUT",
      amount: 800000,
      occurredAt: "2026-04-03",
      description: "Upah harian",
      approvalStatus: "PENDING",
      createdAt: "2026-04-03T15:05:00Z",
    },
  ]);

  const [filters, setFilters] = useState<{
    projectId: string;
    type: "" | TransactionType;
    approvalStatus: "" | ApprovalStatus;
    search: string;
  }>({ projectId: "", type: "", approvalStatus: "", search: "" });

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return transactions
      .filter((t) => (filters.projectId ? t.projectId === filters.projectId : true))
      .filter((t) => (filters.type ? t.type === filters.type : true))
      .filter((t) => (filters.approvalStatus ? t.approvalStatus === filters.approvalStatus : true))
      .filter((t) => {
        if (!search) return true;
        const p = PROJECTS.find((x) => x.id === t.projectId);
        const c = CATEGORIES.find((x) => x.id === t.categoryId);
        const hay = `${p?.code ?? ""} ${p?.name ?? ""} ${c?.name ?? ""} ${t.description}`.toLowerCase();
        return hay.includes(search);
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [filters, transactions]);

  const totals = useMemo(() => {
    const totalIn = filtered.filter((t) => t.type === "IN").reduce((sum, t) => sum + t.amount, 0);
    const totalOut = filtered.filter((t) => t.type === "OUT").reduce((sum, t) => sum + t.amount, 0);
    return {
      in: totalIn,
      out: totalOut,
      net: totalIn - totalOut,
      count: filtered.length,
    };
  }, [filtered]);

  const [draft, setDraft] = useState<{
    projectId: string;
    type: TransactionType;
    categoryId: string;
    amount: string;
    occurredAt: string;
    description: string;
  }>({
    projectId: PROJECTS[0]?.id ?? "",
    type: "OUT",
    categoryId: CATEGORIES.find((c) => c.type === "OUT")?.id ?? "",
    amount: "0",
    occurredAt: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const availableCategories = useMemo(() => CATEGORIES.filter((c) => c.type === draft.type), [draft.type]);

  const canCreate = useMemo(() => {
    const amount = Number(draft.amount);
    return Boolean(draft.projectId) && Boolean(draft.categoryId) && Number.isFinite(amount) && amount > 0;
  }, [draft.amount, draft.categoryId, draft.projectId]);

  const addTransaction = () => {
    if (!canCreate) return;

    const amount = Number(draft.amount);
    const approvalStatus: ApprovalStatus = draft.type === "IN" ? "APPROVED" : "PENDING";

    const tx: Transaction = {
      id: createId(),
      projectId: draft.projectId,
      categoryId: draft.categoryId,
      type: draft.type,
      amount,
      occurredAt: draft.occurredAt,
      description: draft.description.trim() ? draft.description.trim() : "—",
      approvalStatus,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [tx, ...prev]);
    setDraft((prev) => ({
      ...prev,
      amount: "0",
      description: "",
    }));
  };

  const setType = (type: TransactionType) => {
    const first = CATEGORIES.find((c) => c.type === type)?.id ?? "";
    setDraft((prev) => ({ ...prev, type, categoryId: first }));
  };

  const projectLabel = (projectId: string) => {
    const p = PROJECTS.find((x) => x.id === projectId);
    return p ? `${p.code} — ${p.name}` : projectId;
  };

  const categoryLabel = (categoryId: string) => {
    const c = CATEGORIES.find((x) => x.id === categoryId);
    return c ? c.name : categoryId;
  };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Transaksi</h2>
          <div className="muted">Template pencatatan kas masuk/keluar per project.</div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {totals.count} transaksi (filter aktif)
        </div>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="label">Total IN</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(totals.in)}</div>
        </div>
        <div className="card">
          <div className="label">Total OUT</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(totals.out)}</div>
        </div>
        <div className="card">
          <div className="label">NET</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(totals.net)}</div>
        </div>
        <div className="card">
          <div className="label">Approval Pending</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{filtered.filter((t) => t.approvalStatus === "PENDING").length}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Tambah Transaksi (template)</div>
        <div className="grid" style={{ marginTop: 10 }}>
          <div style={{ gridColumn: "span 4" }}>
            <div className="label">Project</div>
            <select
              className="input"
              value={draft.projectId}
              onChange={(e) => setDraft((prev) => ({ ...prev, projectId: e.target.value }))}
            >
              {PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <div className="label">Tipe</div>
            <select className="input" value={draft.type} onChange={(e) => setType(e.target.value as TransactionType)}>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div className="label">Kategori</div>
            <select
              className="input"
              value={draft.categoryId}
              onChange={(e) => setDraft((prev) => ({ ...prev, categoryId: e.target.value }))}
            >
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div className="label">Tanggal</div>
            <input
              className="input"
              type="date"
              value={draft.occurredAt}
              onChange={(e) => setDraft((prev) => ({ ...prev, occurredAt: e.target.value }))}
            />
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div className="label">Nominal</div>
            <input
              className="input"
              value={draft.amount}
              onChange={(e) => setDraft((prev) => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          <div style={{ gridColumn: "span 9" }}>
            <div className="label">Deskripsi</div>
            <input
              className="input"
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div style={{ gridColumn: "span 12", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="muted" style={{ fontSize: 12 }}>
              Status otomatis: IN → APPROVED, OUT → PENDING (template)
            </div>
            <button className="btn primary" onClick={addTransaction} disabled={!canCreate}>
              Tambah
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Filter</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, marginTop: 10 }}>
          <div style={{ gridColumn: "span 4" }}>
            <div className="label">Project</div>
            <select
              className="input"
              value={filters.projectId}
              onChange={(e) => setFilters((prev) => ({ ...prev, projectId: e.target.value }))}
            >
              <option value="">Semua</option>
              {PROJECTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <div className="label">Tipe</div>
            <select
              className="input"
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as "" | TransactionType }))}
            >
              <option value="">Semua</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
            </select>
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div className="label">Status</div>
            <select
              className="input"
              value={filters.approvalStatus}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, approvalStatus: e.target.value as "" | ApprovalStatus }))
              }
            >
              <option value="">Semua</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div className="label">Cari</div>
            <input
              className="input"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="kode project / kategori / deskripsi"
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Daftar Transaksi (template)</div>
        <div className="table" style={{ marginTop: 10 }}>
          <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1.2fr 1.7fr 0.8fr 0.9fr 0.8fr" }}>
            <div>Tanggal</div>
            <div>Project / Kategori</div>
            <div style={{ textAlign: "right" }}>Tipe</div>
            <div style={{ textAlign: "right" }}>Nominal</div>
            <div style={{ textAlign: "right" }}>Status</div>
          </div>
          {filtered.map((t) => (
            <div
              key={t.id}
              className="tableRow"
              style={{ gridTemplateColumns: "1.2fr 1.7fr 0.8fr 0.9fr 0.8fr" }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{t.occurredAt}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t.id}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{projectLabel(t.projectId)}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {categoryLabel(t.categoryId)} — {t.description}
                </div>
              </div>
              <div style={{ textAlign: "right", fontWeight: 700 }}>{t.type}</div>
              <div style={{ textAlign: "right" }}>{formatIdr(t.amount)}</div>
              <div style={{ textAlign: "right" }}>
                <span className={t.approvalStatus === "REJECTED" ? "danger" : undefined}>{t.approvalStatus}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
              <div className="muted">Tidak ada transaksi (sesuai filter)</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
