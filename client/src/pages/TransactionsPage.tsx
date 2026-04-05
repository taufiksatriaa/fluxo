import { useMemo, useState } from "react";
import {
  groupLabel,
  groupToCategoryId,
  useAppStore,
} from "../store/appStore";
import type {
  ApprovalStatus,
  Attachment,
  Category,
  Project,
  Transaction,
  TransactionGroup,
  TransactionType,
} from "../store/appStore";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatIdr(value: number) {
  return value.toLocaleString("id-ID");
}

export function TransactionsPage() {
  const { state, actions } = useAppStore();
  const projects: Project[] = state.projects;
  const categories: Category[] = state.categories;
  const transactions: Transaction[] = state.transactions;

  const categoryIdToGroup = (categoryId: string): TransactionGroup => {
    if (categoryId === "cat-2") return "MATERIAL";
    if (categoryId === "cat-3") return "UPAH";
    if (categoryId === "cat-4") return "OPERASIONAL";
    if (categoryId === "cat-5") return "OTHER";
    return "OTHER";
  };

  const [filters, setFilters] = useState<{
    projectId: string;
    type: "" | TransactionType;
    approvalStatus: "" | ApprovalStatus;
    group: "" | TransactionGroup;
    search: string;
  }>({ projectId: "", type: "", approvalStatus: "", group: "", search: "" });

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return transactions
      .filter((t) => (filters.projectId ? t.projectId === filters.projectId : true))
      .filter((t) => (filters.type ? t.type === filters.type : true))
      .filter((t) => (filters.approvalStatus ? t.approvalStatus === filters.approvalStatus : true))
      .filter((t) => (filters.group ? t.group === filters.group : true))
      .filter((t) => {
        if (!search) return true;
        const p = projects.find((x) => x.id === t.projectId);
        const c = categories.find((x) => x.id === t.categoryId);
        const hay = `${p?.code ?? ""} ${p?.name ?? ""} ${c?.name ?? ""} ${groupLabel(t.group)} ${t.description}`.toLowerCase();
        return hay.includes(search);
      })
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [categories, filters, projects, transactions]);

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
    group: TransactionGroup;
    amount: string;
    occurredAt: string;
    description: string;
    files: File[];
  }>({
    projectId: projects[0]?.id ?? "",
    type: "OUT",
    categoryId: groupToCategoryId("MATERIAL"),
    group: "MATERIAL",
    amount: "0",
    occurredAt: new Date().toISOString().slice(0, 10),
    description: "",
    files: [],
  });

  const availableCategories = useMemo(
    () => categories.filter((c) => c.type === draft.type),
    [categories, draft.type],
  );

  const [fileInputKey, setFileInputKey] = useState(0);
  const [activeReceiptTxId, setActiveReceiptTxId] = useState<string | null>(null);

  const canCreate = useMemo(() => {
    const amount = Number(draft.amount);
    return Boolean(draft.projectId) && Boolean(draft.categoryId) && Number.isFinite(amount) && amount > 0;
  }, [draft.amount, draft.categoryId, draft.projectId]);

  const addTransaction = () => {
    if (!canCreate) return;

    const amount = Number(draft.amount);
    const approvalStatus: ApprovalStatus = draft.type === "IN" ? "APPROVED" : "PENDING";
    const attachments: Attachment[] = draft.files.map((file) => ({
      id: createId(),
      name: file.name,
      mimeType: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
    }));

    actions.createTransaction({
      projectId: draft.projectId,
      categoryId: draft.categoryId,
      group: draft.group,
      type: draft.type,
      amount,
      occurredAt: draft.occurredAt,
      description: draft.description.trim() ? draft.description.trim() : "—",
      approvalStatus,
      attachments,
    });
    setDraft((prev) => ({
      ...prev,
      amount: "0",
      description: "",
      files: [],
    }));
    setFileInputKey((k) => k + 1);
  };

  const setType = (type: TransactionType) => {
    if (type === "IN") {
      const inCategory = categories.find((c) => c.type === "IN")?.id ?? "cat-1";
      setDraft((prev) => ({ ...prev, type, categoryId: inCategory, group: "OTHER" }));
      return;
    }
    const outCategory = groupToCategoryId(draft.group);
    setDraft((prev) => ({ ...prev, type, categoryId: outCategory }));
  };

  const projectLabel = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId);
    return p ? `${p.code} — ${p.name}` : projectId;
  };

  const categoryLabel = (categoryId: string) => {
    const c = categories.find((x) => x.id === categoryId);
    return c ? c.name : categoryId;
  };

  const activeReceiptTx = activeReceiptTxId ? transactions.find((t) => t.id === activeReceiptTxId) ?? null : null;

  const removeDraftFile = (idx: number) => {
    setDraft((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }));
  };

  const formatFileSize = (size: number) => {
    if (!Number.isFinite(size) || size < 0) return "—";
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
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
              {projects.map((p) => (
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
              onChange={(e) => {
                const categoryId = e.target.value;
                setDraft((prev) => ({
                  ...prev,
                  categoryId,
                  group: prev.type === "OUT" ? categoryIdToGroup(categoryId) : prev.group,
                }));
              }}
            >
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div className="label">Opsi</div>
            <select
              className="input"
              value={draft.group}
              onChange={(e) => {
                const group = e.target.value as TransactionGroup;
                setDraft((prev) => ({ ...prev, group, categoryId: groupToCategoryId(group) }));
              }}
              disabled={draft.type === "IN"}
            >
              <option value="MATERIAL">Material</option>
              <option value="UPAH">Upah</option>
              <option value="OPERASIONAL">Operasional</option>
              <option value="OTHER">Other</option>
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
          <div style={{ gridColumn: "span 12" }}>
            <div className="label">Upload bukti pembayaran / bon (template)</div>
            <input
              key={fileInputKey}
              className="input"
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                setDraft((prev) => ({ ...prev, files: list }));
              }}
            />
            {draft.files.length > 0 ? (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {draft.files.map((f, idx) => (
                  <div
                    key={`${f.name}_${f.size}_${idx}`}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                  >
                    <div className="muted" style={{ fontSize: 12 }}>
                      {f.name} • {formatFileSize(f.size)}
                    </div>
                    <button className="btn" type="button" onClick={() => removeDraftFile(idx)}>
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
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
              {projects.map((p) => (
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
            <div className="label">Opsi</div>
            <select
              className="input"
              value={filters.group}
              onChange={(e) => setFilters((prev) => ({ ...prev, group: e.target.value as "" | TransactionGroup }))}
            >
              <option value="">Semua</option>
              <option value="MATERIAL">Material</option>
              <option value="UPAH">Upah</option>
              <option value="OPERASIONAL">Operasional</option>
              <option value="OTHER">Other</option>
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
          <div style={{ gridColumn: "span 12" }}>
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
          <div
            className="tableRow tableHeader"
            style={{ gridTemplateColumns: "1.2fr 1.7fr 0.8fr 0.9fr 0.8fr 0.7fr" }}
          >
            <div>Tanggal</div>
            <div>Project / Kategori</div>
            <div style={{ textAlign: "right" }}>Tipe</div>
            <div style={{ textAlign: "right" }}>Nominal</div>
            <div style={{ textAlign: "right" }}>Status</div>
            <div style={{ textAlign: "right" }}>Bukti</div>
          </div>
          {filtered.map((t) => (
            <div
              key={t.id}
              className="tableRow"
              style={{ gridTemplateColumns: "1.2fr 1.7fr 0.8fr 0.9fr 0.8fr 0.7fr" }}
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
                  {groupLabel(t.group)} • {categoryLabel(t.categoryId)} — {t.description}
                </div>
              </div>
              <div style={{ textAlign: "right", fontWeight: 700 }}>{t.type}</div>
              <div style={{ textAlign: "right" }}>{formatIdr(t.amount)}</div>
              <div style={{ textAlign: "right" }}>
                <span className={t.approvalStatus === "REJECTED" ? "danger" : undefined}>{t.approvalStatus}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                {t.attachments.length > 0 ? (
                  <button className="btn" type="button" onClick={() => setActiveReceiptTxId(t.id)}>
                    Lihat ({t.attachments.length})
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
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

      {activeReceiptTx ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveReceiptTxId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(900px, 100%)", maxHeight: "80vh", overflow: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <div>
                <div className="label">Bukti transaksi</div>
                <h3 style={{ margin: "6px 0 0" }}>{activeReceiptTx.id}</h3>
              </div>
              <button className="btn" type="button" onClick={() => setActiveReceiptTxId(null)}>
                Tutup
              </button>
            </div>

            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              {projectLabel(activeReceiptTx.projectId)} • {categoryLabel(activeReceiptTx.categoryId)} •{" "}
              {formatIdr(activeReceiptTx.amount)}
            </div>

            <div className="table" style={{ marginTop: 12 }}>
              <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1.6fr 0.7fr 0.7fr" }}>
                <div>File</div>
                <div style={{ textAlign: "right" }}>Ukuran</div>
                <div style={{ textAlign: "right" }}>Aksi</div>
              </div>
              {activeReceiptTx.attachments.map((a) => (
                <div key={a.id} className="tableRow" style={{ gridTemplateColumns: "1.6fr 0.7fr 0.7fr" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {a.mimeType || "unknown"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>{formatFileSize(a.size)}</div>
                  <div style={{ textAlign: "right" }}>
                    <a className="btn" href={a.url} target="_blank" rel="noreferrer">
                      Buka
                    </a>
                  </div>
                </div>
              ))}
              {activeReceiptTx.attachments.length === 0 ? (
                <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="muted">Tidak ada bukti</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
