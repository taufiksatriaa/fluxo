import { useMemo, useState } from "react";
import { groupLabel, useAppStore } from "../store/appStore";

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

export function ApprovalsPage() {
  const { state, actions } = useAppStore();
  const [activeTxId, setActiveTxId] = useState<string | null>(null);

  const pending = useMemo(() => {
    return state.transactions
      .filter((t) => t.type === "OUT" && t.approvalStatus === "PENDING")
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [state.transactions]);

  const activeTx = activeTxId ? state.transactions.find((t) => t.id === activeTxId) ?? null : null;

  const projectLabel = (projectId: string) => {
    const p = state.projects.find((x) => x.id === projectId);
    return p ? `${p.code} — ${p.name}` : projectId;
  };

  const categoryLabel = (categoryId: string) => {
    const c = state.categories.find((x) => x.id === categoryId);
    return c ? c.name : categoryId;
  };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Approval</h2>
          <div className="muted">Daftar pengeluaran (OUT) yang menunggu approval.</div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {pending.length} pending
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="table">
          <div
            className="tableRow tableHeader"
            style={{ gridTemplateColumns: "1fr 1.6fr 0.8fr 0.7fr 1.2fr" }}
          >
            <div>Tanggal</div>
            <div>Project / Detail</div>
            <div style={{ textAlign: "right" }}>Nominal</div>
            <div style={{ textAlign: "right" }}>Bukti</div>
            <div style={{ textAlign: "right" }}>Aksi</div>
          </div>
          {pending.map((t) => (
            <div key={t.id} className="tableRow" style={{ gridTemplateColumns: "1fr 1.6fr 0.8fr 0.7fr 1.2fr" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{t.occurredAt}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t.id}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{projectLabel(t.projectId)}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {groupLabel(t.group)} • {categoryLabel(t.categoryId)} — {t.description}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>{formatIdr(t.amount)}</div>
              <div style={{ textAlign: "right" }}>
                {t.attachments.length > 0 ? (
                  <button className="btn" type="button" onClick={() => setActiveTxId(t.id)}>
                    Lihat ({t.attachments.length})
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
              <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn primary" type="button" onClick={() => actions.setTransactionStatus(t.id, "APPROVED")}>
                  Approve
                </button>
                <button className="btn danger" type="button" onClick={() => actions.setTransactionStatus(t.id, "REJECTED")}>
                  Reject
                </button>
              </div>
            </div>
          ))}
          {pending.length === 0 ? (
            <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
              <div className="muted">Tidak ada yang pending</div>
            </div>
          ) : null}
        </div>
      </div>

      {activeTx ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveTxId(null)}
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
                <h3 style={{ margin: "6px 0 0" }}>{activeTx.id}</h3>
              </div>
              <button className="btn" type="button" onClick={() => setActiveTxId(null)}>
                Tutup
              </button>
            </div>

            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              {projectLabel(activeTx.projectId)} • {categoryLabel(activeTx.categoryId)} • {formatIdr(activeTx.amount)}
            </div>

            <div className="table" style={{ marginTop: 12 }}>
              <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1.6fr 0.7fr 0.7fr" }}>
                <div>File</div>
                <div style={{ textAlign: "right" }}>Ukuran</div>
                <div style={{ textAlign: "right" }}>Aksi</div>
              </div>
              {activeTx.attachments.map((a) => (
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
              {activeTx.attachments.length === 0 ? (
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

