import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { calcRabGrandTotal, groupLabel, useAppStore } from "../store/appStore";
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

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { state } = useAppStore();

  const [activeTab, setActiveTab] = useState<"TRANSACTIONS" | "RAB" | "SDM" | "EQUIPMENT">("TRANSACTIONS");
  const [activeReceiptTxId, setActiveReceiptTxId] = useState<string | null>(null);
  const [txTypeFilter, setTxTypeFilter] = useState<string>("");
  const [txSearch, setTxSearch] = useState<string>("");

  const project = useMemo(() => state.projects.find((p) => p.id === projectId) ?? null, [projectId, state.projects]);

  const categoryLabel = (categoryId: string) => {
    const c = state.categories.find((x) => x.id === categoryId);
    return c ? c.name : categoryId;
  };

  const rabInfoLabel = (t: Transaction) => {
    if (!t.rabRef) return null;
    const doc = state.rabsByProjectId[t.projectId];
    const sec = doc?.sections.find((s) => s.id === t.rabRef?.sectionId);
    const item = sec?.items.find((it) => it.id === t.rabRef?.itemId);
    if (!sec || !item) return null;
    return {
      sectionText: `Section ${sec.code}: ${sec.title}`,
      itemText: `Item ${item.no}: ${item.title}`,
    };
  };

  // Transactions of this project
  const transactions = useMemo(() => {
    if (!projectId) return [];
    return state.transactions
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [projectId, state.transactions]);

  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return transactions.filter((t) => {
      if (txTypeFilter && t.type !== txTypeFilter) return false;
      if (!q) return true;
      return t.description.toLowerCase().includes(q) || categoryLabel(t.categoryId).toLowerCase().includes(q);
    });
  }, [transactions, txTypeFilter, txSearch]);

  const activeReceiptTx: Transaction | null = useMemo(() => {
    if (!activeReceiptTxId) return null;
    return state.transactions.find((t) => t.id === activeReceiptTxId) ?? null;
  }, [activeReceiptTxId, state.transactions]);

  // Financial Summary
  const summary = useMemo(() => {
    const approved = transactions.filter((t) => t.approvalStatus === "APPROVED");
    const totalIn = approved.filter((t) => t.type === "IN").reduce((sum, t) => sum + t.amount, 0);
    const totalOut = approved.filter((t) => t.type === "OUT").reduce((sum, t) => sum + t.amount, 0);
    const pendingOut = transactions.filter((t) => t.type === "OUT" && t.approvalStatus === "PENDING").length;

    const outByGroup = approved
      .filter((t) => t.type === "OUT")
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.group] = (acc[t.group] ?? 0) + t.amount;
        return acc;
      }, {});

    return { totalIn, totalOut, net: totalIn - totalOut, pendingOut, outByGroup };
  }, [transactions]);

  // RAB Budget & Tracking
  const rabDoc = useMemo(() => (projectId ? state.rabsByProjectId[projectId] : undefined), [projectId, state.rabsByProjectId]);
  const budgetTotal = useMemo(() => {
    if (rabDoc) return calcRabGrandTotal(rabDoc);
    return project?.budgetPlanTotal ?? 0;
  }, [project?.budgetPlanTotal, rabDoc]);

  const budgetUsed = summary.totalOut;
  const budgetRemaining = budgetTotal - budgetUsed;
  const usedPct = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

  // Wages for this project
  const projectWages = useMemo(() => {
    if (!projectId) return [];
    return state.wagePayments.filter((w) => w.projectId === projectId);
  }, [projectId, state.wagePayments]);

  const totalWagesPaid = useMemo(() => projectWages.reduce((sum, w) => sum + w.amount, 0), [projectWages]);

  // Equipment assigned to this project
  const projectEquipments = useMemo(() => {
    if (!projectId) return [];
    return state.equipments.filter((e) => e.currentProjectId === projectId);
  }, [projectId, state.equipments]);

  if (!projectId || !project) return <Navigate to="/projects" replace />;

  return (
    <div className="container">
      {/* Back button & Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
            <Link to="/projects">← Kembali ke Daftar Proyek</Link>
          </div>
          <h2 style={{ margin: "2px 0 0" }}>
            {project.code} — {project.name}
          </h2>
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Owner: <strong>{project.owner}</strong> • Periode: {project.startDate} s/d {project.endDate} • Status:{" "}
            <span className="badge badge-info">{project.status}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link className="btn" to={`/budgets?projectId=${encodeURIComponent(projectId)}`}>
            Buka Dokumen RAB ↗
          </Link>
          <Link className="btn primary" to="/transactions">
            + Tambah Transaksi
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Pagu Total Anggaran</div>
          <div className="stat-value">Rp {formatIdr(budgetTotal)}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {rabDoc ? "Berdasarkan rincian RAB" : "Berdasarkan Budget Plan"}
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Realisasi Kas Keluar</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>
            Rp {formatIdr(budgetUsed)}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {usedPct}% dari pagu anggaran terserap
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Sisa Anggaran Proyek</div>
          <div
            className="stat-value"
            style={{ color: budgetRemaining >= 0 ? "var(--success)" : "var(--danger)" }}
          >
            Rp {formatIdr(budgetRemaining)}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {budgetRemaining >= 0 ? "Anggaran masih surplus" : "Melebihi pagu anggaran (Defisit)!"}
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Progress Pelaksanaan Fisik</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>
            {project.progressPct}%
          </div>
          <div className="progress" style={{ marginTop: 8 }}>
            <div className="progressFill" style={{ width: `${project.progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Cashflow Breakdown per Group */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="label">Distribusi Pengeluaran Disetujui (OUT)</div>
        <div className="grid" style={{ marginTop: 8 }}>
          <div className="card" style={{ gridColumn: "span 3", background: "#f8fafc" }}>
            <div className="label">Material</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>
              Rp {formatIdr(summary.outByGroup["MATERIAL"] ?? 0)}
            </div>
          </div>
          <div className="card" style={{ gridColumn: "span 3", background: "#f8fafc" }}>
            <div className="label">Upah Tenaga Kerja</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>
              Rp {formatIdr(summary.outByGroup["UPAH"] ?? 0)}
            </div>
          </div>
          <div className="card" style={{ gridColumn: "span 3", background: "#f8fafc" }}>
            <div className="label">Operasional & Logistik</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>
              Rp {formatIdr(summary.outByGroup["OPERASIONAL"] ?? 0)}
            </div>
          </div>
          <div className="card" style={{ gridColumn: "span 3", background: "#f8fafc" }}>
            <div className="label">Lain-Lain (Overhead)</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>
              Rp {formatIdr(summary.outByGroup["OTHER"] ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-list" style={{ marginTop: 20 }}>
        <button
          className={activeTab === "TRANSACTIONS" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("TRANSACTIONS")}
          type="button"
        >
          Riwayat Transaksi ({transactions.length})
        </button>
        <button
          className={activeTab === "RAB" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("RAB")}
          type="button"
        >
          Rincian RAB & Serapan
        </button>
        <button
          className={activeTab === "SDM" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("SDM")}
          type="button"
        >
          Upah Tenaga Kerja ({projectWages.length})
        </button>
        <button
          className={activeTab === "EQUIPMENT" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("EQUIPMENT")}
          type="button"
        >
          Peralatan di Lokasi ({projectEquipments.length})
        </button>
      </div>

      {/* TAB 1: TRANSACTIONS */}
      {activeTab === "TRANSACTIONS" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <input
              className="input"
              style={{ maxWidth: 280 }}
              placeholder="Cari deskripsi transaksi..."
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
            />
            <select
              className="input"
              style={{ maxWidth: 160 }}
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value)}
            >
              <option value="">Semua Tipe (IN / OUT)</option>
              <option value="IN">Kas Masuk (IN)</option>
              <option value="OUT">Kas Keluar (OUT)</option>
            </select>
          </div>

          <div className="table">
            <div
              className="tableRow tableHeader"
              style={{ gridTemplateColumns: "1fr 2fr 0.8fr 1fr 1fr 0.8fr" }}
            >
              <div>Tanggal</div>
              <div>Detail & Item RAB</div>
              <div style={{ textAlign: "right" }}>Tipe</div>
              <div style={{ textAlign: "right" }}>Nominal</div>
              <div style={{ textAlign: "right" }}>Status</div>
              <div style={{ textAlign: "right" }}>Bukti</div>
            </div>

            {filteredTransactions.map((t) => {
              const rabInfo = rabInfoLabel(t);
              return (
                <div
                  key={t.id}
                  className="tableRow"
                  style={{ gridTemplateColumns: "1fr 2fr 0.8fr 1fr 1fr 0.8fr" }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.occurredAt}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{t.id}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      <span className="badge badge-neutral" style={{ marginRight: 6 }}>
                        {groupLabel(t.group)}
                      </span>
                      {categoryLabel(t.categoryId)}: {t.description}
                    </div>
                    {rabInfo ? (
                      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {rabInfo.sectionText} • {rabInfo.itemText}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700 }}>
                    {t.type === "IN" ? (
                      <span className="badge badge-success">IN</span>
                    ) : (
                      <span className="badge badge-info">OUT</span>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700 }}>
                    Rp {formatIdr(t.amount)}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {t.approvalStatus === "APPROVED" ? (
                      <span className="badge badge-success">APPROVED</span>
                    ) : t.approvalStatus === "PENDING" ? (
                      <span className="badge badge-warning">PENDING</span>
                    ) : (
                      <div>
                        <span className="badge badge-danger">REJECTED</span>
                        {t.rejectionReason ? (
                          <div className="danger" style={{ fontSize: 11, marginTop: 2 }}>
                            {t.rejectionReason}
                          </div>
                        ) : null}
                      </div>
                    )}
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
              );
            })}

            {filteredTransactions.length === 0 && (
              <div className="empty-state">
                <div>Tidak ada transaksi yang cocok untuk filter ini.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RAB SUMMARY */}
      {activeTab === "RAB" && (
        <div className="card">
          {rabDoc ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{rabDoc.title}</h3>
                  <div className="muted" style={{ fontSize: 12 }}>Update terakhir: {rabDoc.updatedAt}</div>
                </div>
                <Link className="btn primary" to={`/budgets?projectId=${encodeURIComponent(projectId)}`}>
                  Edit RAB di Modul Anggaran ↗
                </Link>
              </div>

              <div className="table">
                <div className="tableRow tableHeader" style={{ gridTemplateColumns: "0.5fr 2fr 1fr 1fr" }}>
                  <div>Section</div>
                  <div>Judul Pekerjaan</div>
                  <div style={{ textAlign: "right" }}>Jumlah Item</div>
                  <div style={{ textAlign: "right" }}>Subtotal Rencana</div>
                </div>
                {rabDoc.sections.map((sec) => {
                  const secTotal = sec.items.reduce((sum, it) => {
                    const q = Number(it.qty.replace(/\./g, "").replace(/,/g, ".")) || 0;
                    const p = Number(it.unitPrice.replace(/\./g, "").replace(/,/g, ".")) || 0;
                    return sum + q * p;
                  }, 0);
                  return (
                    <div key={sec.id} className="tableRow" style={{ gridTemplateColumns: "0.5fr 2fr 1fr 1fr" }}>
                      <div style={{ fontWeight: 700 }}>{sec.code}</div>
                      <div style={{ fontWeight: 600 }}>{sec.title}</div>
                      <div style={{ textAlign: "right" }}>{sec.items.length} item</div>
                      <div style={{ textAlign: "right", fontWeight: 700 }}>Rp {formatIdr(secTotal)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div>Belum ada dokumen RAB untuk proyek ini. Proyek masih menggunakan estimasi budget plan.</div>
              <Link className="btn primary" style={{ marginTop: 10 }} to={`/budgets?projectId=${encodeURIComponent(projectId)}`}>
                + Susun RAB Proyek Sekarang
              </Link>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WAGE / SDM */}
      {activeTab === "SDM" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>Pembayaran Upah Tenaga Kerja Proyek</h3>
              <div className="muted" style={{ fontSize: 12 }}>
                Total terbayar: <strong>Rp {formatIdr(totalWagesPaid)}</strong> dari {projectWages.length} transaksi pembayaran.
              </div>
            </div>
            <Link className="btn" to="/sdm">Buka Modul SDM ↗</Link>
          </div>

          <div className="table">
            <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1fr 1.6fr 0.8fr 1fr 1.2fr" }}>
              <div>Tanggal</div>
              <div>Tenaga Kerja / Peran</div>
              <div style={{ textAlign: "right" }}>Hari Kerja</div>
              <div style={{ textAlign: "right" }}>Total Upah</div>
              <div>Catatan</div>
            </div>
            {projectWages.map((w) => {
              const emp = state.employees.find((e) => e.id === w.employeeId);
              return (
                <div key={w.id} className="tableRow" style={{ gridTemplateColumns: "1fr 1.6fr 0.8fr 1fr 1.2fr" }}>
                  <div>{w.occurredAt}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{emp?.name ?? w.employeeId}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{emp?.roleTitle} • Rp {formatIdr(w.dailyRate)}/hari</div>
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 600 }}>{w.days} hari</div>
                  <div style={{ textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>
                    Rp {formatIdr(w.amount)}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>{w.note || "—"}</div>
                </div>
              );
            })}
            {projectWages.length === 0 && (
              <div className="empty-state">
                <div>Belum ada pembayaran upah tenaga kerja tercatat pada proyek ini.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: EQUIPMENT */}
      {activeTab === "EQUIPMENT" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>Peralatan yang Sedang Beroperasi di Lokasi</h3>
              <div className="muted" style={{ fontSize: 12 }}>
                {projectEquipments.length} unit alat berat & mesin ditugaskan di proyek ini.
              </div>
            </div>
            <Link className="btn" to="/equipment">Kelola Semua Peralatan ↗</Link>
          </div>

          <div className="table">
            <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1fr 2fr 1fr 1.2fr 1fr" }}>
              <div>Kode Alat</div>
              <div>Nama Alat & Kategori</div>
              <div>Kondisi</div>
              <div>PIC Penanggung Jawab</div>
              <div>Tanggal Penugasan</div>
            </div>
            {projectEquipments.map((eq) => (
              <div key={eq.id} className="tableRow" style={{ gridTemplateColumns: "1fr 2fr 1fr 1.2fr 1fr" }}>
                <div style={{ fontWeight: 600 }}>{eq.code}</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{eq.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{eq.category}</div>
                </div>
                <div>
                  <span className={eq.condition === "BAIK" ? "badge badge-success" : "badge badge-warning"}>
                    {eq.condition}
                  </span>
                </div>
                <div style={{ fontWeight: 500 }}>{eq.assignedTo || "—"}</div>
                <div className="muted">{eq.assignedDate || "—"}</div>
              </div>
            ))}
            {projectEquipments.length === 0 && (
              <div className="empty-state">
                <div>Tidak ada peralatan kerja yang sedang ditugaskan di lokasi proyek ini.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL RECEIPT */}
      {activeReceiptTx ? (
        <div className="modal-backdrop" onClick={() => setActiveReceiptTxId(null)}>
          <div className="modal-card" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div className="label">Bukti Transaksi</div>
                <h3 style={{ margin: "2px 0 0" }}>{activeReceiptTx.id}</h3>
                <div className="muted" style={{ fontSize: 12 }}>
                  Nominal: <strong>Rp {formatIdr(activeReceiptTx.amount)}</strong> ({activeReceiptTx.description})
                </div>
              </div>
              <button className="btn" type="button" onClick={() => setActiveReceiptTxId(null)}>✕ Tutup</button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {activeReceiptTx.attachments.map((a) => {
                const isImage = a.mimeType.startsWith("image/") || a.url.startsWith("data:image/");
                return (
                  <div key={a.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{formatFileSize(a.size)} • {a.mimeType || "unknown"}</div>
                      </div>
                      <a className="btn" href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                        Buka di Tab Baru ↗
                      </a>
                    </div>
                    {isImage ? (
                      <div style={{ textAlign: "center", background: "#f8fafc", padding: 8, borderRadius: 6 }}>
                        <img src={a.url} alt={a.name} style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 4 }} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
