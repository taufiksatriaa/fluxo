import { useMemo, useState } from "react";
import { groupLabel, useAppStore } from "../store/appStore";
import type { Transaction } from "../store/appStore";

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

const REJECTION_PRESETS = [
  "Bukti nota/struk tidak terbaca atau tidak valid",
  "Harga satuan melebihi standar pagu anggaran RAB",
  "Kuantitas barang/jasa tidak sesuai dengan kondisi fisik lapangan",
  "Salah pengelompokan kategori pengeluaran",
  "Pengeluaran belum disetujui oleh Project Manager",
];

export function ApprovalsPage() {
  const { state, actions } = useAppStore();
  const role = state.currentUser.role;
  const canAct = role === "ADMIN";

  const [activeTxId, setActiveTxId] = useState<string | null>(null);
  const [rejectingTx, setRejectingTx] = useState<Transaction | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

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

  const handleApprove = (txId: string) => {
    if (!canAct) return;
    actions.setTransactionStatus(txId, "APPROVED");
  };

  const openRejectModal = (t: Transaction) => {
    setRejectingTx(t);
    setRejectionNote("");
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTx || !canAct) return;
    actions.setTransactionStatus(
      rejectingTx.id,
      "REJECTED",
      rejectionNote.trim() || "Ditolak tanpa catatan",
    );
    setRejectingTx(null);
    setRejectionNote("");
  };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px" }}>Approval Pengeluaran (Kas Keluar)</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Verifikasi bukti bon/nota pengeluaran sebelum masuk ke perhitungan kas keluar riil dan serapan RAB.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={pending.length > 0 ? "badge badge-warning" : "badge badge-success"}>
            {pending.length} Menunggu Persetujuan
          </span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="table">
          <div
            className="tableRow tableHeader"
            style={{ gridTemplateColumns: "1fr 1.8fr 1fr 0.8fr 1.2fr" }}
          >
            <div>Tanggal</div>
            <div>Proyek / Rincian Pengeluaran</div>
            <div style={{ textAlign: "right" }}>Nominal Diajukan</div>
            <div style={{ textAlign: "right" }}>Bukti Bon</div>
            <div style={{ textAlign: "right" }}>Otorisasi Tindakan</div>
          </div>

          {pending.map((t) => (
            <div key={t.id} className="tableRow" style={{ gridTemplateColumns: "1fr 1.8fr 1fr 0.8fr 1.2fr" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t.occurredAt}</div>
                <div className="muted" style={{ fontSize: 11 }}>{t.id}</div>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{projectLabel(t.projectId)}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  <span className="badge badge-neutral" style={{ marginRight: 6 }}>{groupLabel(t.group)}</span>
                  {categoryLabel(t.categoryId)}: {t.description}
                </div>
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, fontSize: 15 }}>
                Rp {formatIdr(t.amount)}
              </div>
              <div style={{ textAlign: "right" }}>
                {t.attachments.length > 0 ? (
                  <button className="btn" type="button" onClick={() => setActiveTxId(t.id)}>
                    Lihat Bukti ({t.attachments.length})
                  </button>
                ) : (
                  <span className="muted" style={{ fontSize: 12 }}>Tanpa bukti</span>
                )}
              </div>
              <div style={{ textAlign: "right", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => handleApprove(t.id)}
                  disabled={!canAct}
                >
                  Approve
                </button>
                <button
                  className="btn danger"
                  type="button"
                  onClick={() => openRejectModal(t)}
                  disabled={!canAct}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}

          {pending.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontWeight: 600, color: "var(--success)" }}>Semua pengeluaran telah diproses</div>
              <div>Tidak ada transaksi pending yang membutuhkan persetujuan saat ini.</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* MODAL: VIEW ATTACHMENTS */}
      {activeTx ? (
        <div className="modal-backdrop" onClick={() => setActiveTxId(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
              <div>
                <div className="label">Lampiran Bukti Transaksi</div>
                <h3 style={{ margin: "4px 0 0" }}>{projectLabel(activeTx.projectId)}</h3>
                <div className="muted" style={{ fontSize: 12 }}>
                  Nominal: <strong>Rp {formatIdr(activeTx.amount)}</strong> • Deskripsi: {activeTx.description}
                </div>
              </div>
              <button className="btn" type="button" onClick={() => setActiveTxId(null)}>✕ Tutup</button>
            </div>

            <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
              {activeTx.attachments.map((a) => {
                const isImage = a.mimeType.startsWith("image/") || a.url.startsWith("data:image/");
                return (
                  <div key={a.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{formatFileSize(a.size)} • {a.mimeType}</div>
                      </div>
                      <a className="btn" href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                        Buka di Tab Baru ↗
                      </a>
                    </div>
                    {isImage ? (
                      <div style={{ maxHeight: 380, overflow: "hidden", display: "flex", justifyContent: "center", background: "#f8fafc", borderRadius: 6, padding: 8 }}>
                        <img src={a.url} alt={a.name} style={{ maxWidth: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 4 }} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: REJECT CONFIRMATION WITH REASON */}
      {rejectingTx ? (
        <div className="modal-backdrop" onClick={() => setRejectingTx(null)}>
          <div className="modal-card" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, color: "var(--danger)" }}>Tolak Pengeluaran</h3>
              <button className="btn" type="button" onClick={() => setRejectingTx(null)}>✕</button>
            </div>

            <div style={{ padding: "10px 12px", background: "#fef2f2", borderRadius: 8, marginBottom: 14, border: "1px solid #fecaca" }}>
              <div style={{ fontWeight: 600, color: "#991b1b" }}>{projectLabel(rejectingTx.projectId)}</div>
              <div style={{ fontSize: 13, color: "#7f1d1d", marginTop: 2 }}>
                Nominal: <strong>Rp {formatIdr(rejectingTx.amount)}</strong> ({rejectingTx.description})
              </div>
            </div>

            <form onSubmit={handleConfirmReject} style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="label">Pilih Alasan Standar atau Ketik Alasan Penolakan:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                  {REJECTION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="btn"
                      style={{
                        textAlign: "left",
                        justifyContent: "flex-start",
                        fontSize: 12,
                        padding: "6px 10px",
                        background: rejectionNote === preset ? "#fee2e2" : "#ffffff",
                        borderColor: rejectionNote === preset ? "var(--danger)" : "var(--border)",
                      }}
                      onClick={() => setRejectionNote(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Ketik catatan penolakan spesifik untuk pembuat transaksi..."
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button className="btn" type="button" onClick={() => setRejectingTx(null)}>Batal</button>
                <button className="btn danger" type="submit">Konfirmasi Tolak Pengeluaran</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
