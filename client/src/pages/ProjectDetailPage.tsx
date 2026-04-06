import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { calcRabGrandTotal, groupLabel, useAppStore } from "../store/appStore";
import type { Attachment, Transaction } from "../store/appStore";

function formatIdr(value: number) {
  return value.toLocaleString("id-ID");
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size < 0) return "—";
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { state } = useAppStore();
  const [activeReceiptTxId, setActiveReceiptTxId] = useState<string | null>(null);

  const project = useMemo(() => state.projects.find((p) => p.id === projectId) ?? null, [projectId, state.projects]);

  const categoryLabel = (categoryId: string) => {
    const c = state.categories.find((x) => x.id === categoryId);
    return c ? c.name : categoryId;
  };

  const transactions = useMemo(() => {
    if (!projectId) return [];
    return state.transactions
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [projectId, state.transactions]);

  const activeReceiptTx: Transaction | null = useMemo(() => {
    if (!activeReceiptTxId) return null;
    return state.transactions.find((t) => t.id === activeReceiptTxId) ?? null;
  }, [activeReceiptTxId, state.transactions]);

  const summary = useMemo(() => {
    const approved = transactions.filter((t) => t.approvalStatus === "APPROVED");
    const totalIn = approved.filter((t) => t.type === "IN").reduce((sum, t) => sum + t.amount, 0);
    const totalOut = approved.filter((t) => t.type === "OUT").reduce((sum, t) => sum + t.amount, 0);
    const pendingOut = transactions.filter((t) => t.type === "OUT" && t.approvalStatus === "PENDING").length;
    return { totalIn, totalOut, net: totalIn - totalOut, pendingOut };
  }, [transactions]);

  const budgetTotal = useMemo(() => {
    if (!projectId) return 0;
    const rab = state.rabsByProjectId[projectId];
    if (rab) return calcRabGrandTotal(rab);
    return project?.budgetPlanTotal ?? 0;
  }, [project?.budgetPlanTotal, projectId, state.rabsByProjectId]);

  const budgetUsed = useMemo(() => {
    return transactions
      .filter((t) => t.type === "OUT" && t.approvalStatus === "APPROVED")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const budgetRemaining = budgetTotal - budgetUsed;

  if (!projectId) return <Navigate to="/projects" replace />;
  if (!project) return <Navigate to="/projects" replace />;

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>
            <Link to="/projects">← Kembali</Link>
          </div>
          <h2 style={{ margin: "6px 0 0" }}>
            {project.code} — {project.name}
          </h2>
          <div className="muted" style={{ marginTop: 6 }}>
            Owner: {project.owner} • Status: {project.status} • Progress: {project.progressPct}%
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="label">Update</div>
          <div className="muted">{project.updatedAt}</div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="label">Kas Masuk (Approved)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(summary.totalIn)}</div>
        </div>
        <div className="card">
          <div className="label">Kas Keluar (Approved)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(summary.totalOut)}</div>
        </div>
        <div className="card">
          <div className="label">NET</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(summary.net)}</div>
        </div>
        <div className="card">
          <div className="label">OUT Pending</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{summary.pendingOut}</div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="label">Budget Total (RAB atau Plan)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(budgetTotal)}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {state.rabsByProjectId[projectId] ? "Sumber: RAB" : "Sumber: Budget plan"}
          </div>
        </div>
        <div className="card">
          <div className="label">Realisasi OUT (Approved)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(budgetUsed)}</div>
        </div>
        <div className="card">
          <div className="label">Sisa Budget</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(budgetRemaining)}</div>
        </div>
        <div className="card">
          <div className="label">Aksi</div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn" to="/transactions">
              Buka Transaksi
            </Link>
            <Link className="btn" to="/approvals">
              Buka Approval
            </Link>
            <Link className="btn" to="/budgets">
              Buka RAB
            </Link>
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Tips: untuk sementara filter transaksi manual berdasarkan project di menu Transaksi.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="label">Daftar Transaksi Project</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {transactions.length} transaksi
          </div>
        </div>

        <div className="table" style={{ marginTop: 10 }}>
          <div
            className="tableRow tableHeader"
            style={{ gridTemplateColumns: "1.1fr 1.8fr 0.6fr 0.8fr 0.8fr 0.7fr" }}
          >
            <div>Tanggal</div>
            <div>Detail</div>
            <div style={{ textAlign: "right" }}>Tipe</div>
            <div style={{ textAlign: "right" }}>Nominal</div>
            <div style={{ textAlign: "right" }}>Status</div>
            <div style={{ textAlign: "right" }}>Bukti</div>
          </div>

          {transactions.map((t) => (
            <div
              key={t.id}
              className="tableRow"
              style={{ gridTemplateColumns: "1.1fr 1.8fr 0.6fr 0.8fr 0.8fr 0.7fr" }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{t.occurredAt}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t.id}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {groupLabel(t.group)} • {categoryLabel(t.categoryId)}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {t.description}
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

          {transactions.length === 0 ? (
            <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
              <div className="muted">Belum ada transaksi untuk project ini</div>
            </div>
          ) : null}
        </div>
      </div>

      {activeReceiptTx ? (
        <ReceiptModal
          title={`Bukti transaksi ${activeReceiptTx.id}`}
          subtitle={`${groupLabel(activeReceiptTx.group)} • ${categoryLabel(activeReceiptTx.categoryId)} • ${formatIdr(activeReceiptTx.amount)}`}
          attachments={activeReceiptTx.attachments}
          onClose={() => setActiveReceiptTxId(null)}
        />
      ) : null}
    </div>
  );
}

function ReceiptModal({
  title,
  subtitle,
  attachments,
  onClose,
}: {
  title: string;
  subtitle: string;
  attachments: Attachment[];
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
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
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "min(900px, 100%)", maxHeight: "80vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div className="label">Bukti transaksi</div>
            <h3 style={{ margin: "6px 0 0" }}>{title}</h3>
          </div>
          <button className="btn" type="button" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          {subtitle}
        </div>

        <div className="table" style={{ marginTop: 12 }}>
          <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1.6fr 0.7fr 0.7fr" }}>
            <div>File</div>
            <div style={{ textAlign: "right" }}>Ukuran</div>
            <div style={{ textAlign: "right" }}>Aksi</div>
          </div>
          {attachments.map((a) => (
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
          {attachments.length === 0 ? (
            <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
              <div className="muted">Tidak ada bukti</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

