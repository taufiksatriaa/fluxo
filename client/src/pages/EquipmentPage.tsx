import { useMemo, useState } from "react";
import { useAppStore } from "../store/appStore";
import type { EquipmentCondition, EquipmentItem, EquipmentStatus } from "../store/appStore";

export function EquipmentPage() {
  const { state, actions } = useAppStore();
  const role = state.currentUser.role;
  const canManage = role === "ADMIN" || role === "FINANCE";

  const [activeTab, setActiveTab] = useState<"ITEMS" | "LOGS">("ITEMS");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [assignModalItem, setAssignModalItem] = useState<EquipmentItem | null>(null);
  const [returnModalItem, setReturnModalItem] = useState<EquipmentItem | null>(null);

  // New Equipment Draft
  const [newEquipDraft, setNewEquipDraft] = useState<{
    code: string;
    name: string;
    category: string;
    location: string;
    serialNo: string;
  }>({
    code: "",
    name: "",
    category: "Mesin Konstruksi",
    location: "Gudang Utama",
    serialNo: "",
  });

  // Assign Draft
  const [assignDraft, setAssignDraft] = useState<{
    projectId: string;
    assignedTo: string;
    date: string;
    note: string;
  }>({
    projectId: state.projects[0]?.id ?? "",
    assignedTo: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  // Return Draft
  const [returnDraft, setReturnDraft] = useState<{
    condition: EquipmentCondition;
    location: string;
    date: string;
    note: string;
  }>({
    condition: "BAIK",
    location: "Gudang Utama",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  // Metrics
  const metrics = useMemo(() => {
    const total = state.equipments.length;
    const inUse = state.equipments.filter((e) => e.status === "DIPAKAI").length;
    const available = state.equipments.filter((e) => e.status === "TERSEDIA").length;
    const maintenance = state.equipments.filter((e) => e.status === "PERBAIKAN" || e.status === "RUSAK").length;
    return { total, inUse, available, maintenance };
  }, [state.equipments]);

  // Filtered equipments
  const filteredEquipments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.equipments.filter((eq) => {
      if (statusFilter && eq.status !== statusFilter) return false;
      if (!q) return true;
      return (
        eq.name.toLowerCase().includes(q) ||
        eq.code.toLowerCase().includes(q) ||
        eq.location.toLowerCase().includes(q) ||
        (eq.assignedTo && eq.assignedTo.toLowerCase().includes(q))
      );
    });
  }, [search, statusFilter, state.equipments]);

  // Submit New Equipment
  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipDraft.name.trim() || !newEquipDraft.code.trim()) return;

    actions.addEquipmentItem({
      code: newEquipDraft.code,
      name: newEquipDraft.name,
      category: newEquipDraft.category,
      status: "TERSEDIA",
      condition: "BAIK",
      location: newEquipDraft.location,
      serialNo: newEquipDraft.serialNo,
    });

    setNewEquipDraft({
      code: "",
      name: "",
      category: "Mesin Konstruksi",
      location: "Gudang Utama",
      serialNo: "",
    });
    setShowAddModal(false);
  };

  // Open Assign Modal
  const openAssignModal = (eq: EquipmentItem) => {
    setAssignModalItem(eq);
    setAssignDraft({
      projectId: state.projects[0]?.id ?? "",
      assignedTo: "",
      date: new Date().toISOString().slice(0, 10),
      note: "",
    });
  };

  // Submit Assign
  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalItem || !assignDraft.projectId) return;

    actions.assignEquipment({
      equipmentId: assignModalItem.id,
      projectId: assignDraft.projectId,
      assignedTo: assignDraft.assignedTo || "Penanggung Jawab Proyek",
      date: assignDraft.date,
      note: assignDraft.note,
    });

    setAssignModalItem(null);
  };

  // Open Return Modal
  const openReturnModal = (eq: EquipmentItem) => {
    setReturnModalItem(eq);
    setReturnDraft({
      condition: eq.condition,
      location: "Gudang Utama",
      date: new Date().toISOString().slice(0, 10),
      note: "",
    });
  };

  // Submit Return
  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalItem) return;

    actions.returnEquipment({
      equipmentId: returnModalItem.id,
      condition: returnDraft.condition,
      location: returnDraft.location,
      date: returnDraft.date,
      note: returnDraft.note,
    });

    setReturnModalItem(null);
  };

  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case "TERSEDIA":
        return <span className="badge badge-success">TERSEDIA</span>;
      case "DIPAKAI":
        return <span className="badge badge-info">DIPAKAI PROYEK</span>;
      case "PERBAIKAN":
        return <span className="badge badge-warning">DALAM PERBAIKAN</span>;
      case "RUSAK":
        return <span className="badge badge-danger">RUSAK</span>;
    }
  };

  const getConditionBadge = (condition: EquipmentCondition) => {
    switch (condition) {
      case "BAIK":
        return <span className="badge badge-success">Kondisi Baik</span>;
      case "PERLU_SERVIS":
        return <span className="badge badge-warning">Perlu Servis</span>;
      case "RUSAK":
        return <span className="badge badge-danger">Kondisi Rusak</span>;
    }
  };

  return (
    <div className="container">
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px" }}>Peralatan Kerja (Equipment)</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Monitoring inventaris alat berat, genset, scaffolding, dan peminjaman ke proyek.
          </div>
        </div>
        {canManage ? (
          <button className="btn primary" type="button" onClick={() => setShowAddModal(true)}>
            + Tambah Alat Baru
          </button>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Total Inventaris Alat</div>
          <div className="stat-value">{metrics.total} Unit</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Mesin & perkakas terdaftar</div>
        </div>
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Sedang Dipakai di Proyek</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>{metrics.inUse} Unit</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Aktif beroperasi di lapangan</div>
        </div>
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Tersedia di Gudang</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>{metrics.available} Unit</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Siap ditugaskan kapan saja</div>
        </div>
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Perbaikan & Rusak</div>
          <div className="stat-value" style={{ color: metrics.maintenance > 0 ? "var(--danger)" : "var(--muted)" }}>
            {metrics.maintenance} Unit
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Butuh penanganan teknisi</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-list" style={{ marginTop: 20 }}>
        <button
          className={activeTab === "ITEMS" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("ITEMS")}
          type="button"
        >
          Daftar Peralatan ({state.equipments.length})
        </button>
        <button
          className={activeTab === "LOGS" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("LOGS")}
          type="button"
        >
          Riwayat Penugasan & Servis ({state.equipmentLogs.length})
        </button>
      </div>

      {/* TAB 1: EQUIPMENT ITEMS */}
      {activeTab === "ITEMS" && (
        <div>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <input
              className="input"
              style={{ maxWidth: 320 }}
              placeholder="Cari nama alat, kode, PIC, lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input"
              style={{ maxWidth: 200 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="TERSEDIA">Tersedia di Gudang</option>
              <option value="DIPAKAI">Sedang Dipakai Proyek</option>
              <option value="PERBAIKAN">Dalam Perbaikan</option>
              <option value="RUSAK">Rusak</option>
            </select>
          </div>

          {/* Table */}
          <div className="table">
            <div
              className="tableRow tableHeader"
              style={{ gridTemplateColumns: "1fr 2.2fr 1.2fr 1.8fr 1.2fr" }}
            >
              <div>Kode Alat</div>
              <div>Nama Alat & Kategori</div>
              <div>Status & Kondisi</div>
              <div>Lokasi & Penugasan</div>
              <div style={{ textAlign: "right" }}>Aksi Otorisasi</div>
            </div>

            {filteredEquipments.map((eq) => {
              const project = eq.currentProjectId ? state.projects.find((p) => p.id === eq.currentProjectId) : null;
              return (
                <div
                  key={eq.id}
                  className="tableRow"
                  style={{ gridTemplateColumns: "1fr 2.2fr 1.2fr 1.8fr 1.2fr" }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{eq.code}</div>
                    {eq.serialNo ? <div className="muted" style={{ fontSize: 11 }}>SN: {eq.serialNo}</div> : null}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{eq.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{eq.category}</div>
                  </div>
                  <div>
                    <div style={{ marginBottom: 4 }}>{getStatusBadge(eq.status)}</div>
                    <div>{getConditionBadge(eq.condition)}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{eq.location}</div>
                    {project ? (
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        Proyek: <strong>{project.code}</strong> • PIC: {eq.assignedTo || "—"}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {canManage ? (
                      eq.status === "TERSEDIA" ? (
                        <button
                          className="btn primary"
                          style={{ padding: "5px 10px", fontSize: 12 }}
                          type="button"
                          onClick={() => openAssignModal(eq)}
                        >
                          Tugaskan Proyek
                        </button>
                      ) : eq.status === "DIPAKAI" ? (
                        <button
                          className="btn"
                          style={{ padding: "5px 10px", fontSize: 12 }}
                          type="button"
                          onClick={() => openReturnModal(eq)}
                        >
                          Kembalikan
                        </button>
                      ) : (
                        <button
                          className="btn"
                          style={{ padding: "5px 10px", fontSize: 12 }}
                          type="button"
                          onClick={() => openReturnModal(eq)}
                        >
                          Selesai Servis
                        </button>
                      )
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>View only</span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredEquipments.length === 0 && (
              <div className="empty-state">
                <div>Tidak ada peralatan yang sesuai kriteria pencarian.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LOGS */}
      {activeTab === "LOGS" && (
        <div className="table">
          <div
            className="tableRow tableHeader"
            style={{ gridTemplateColumns: "1fr 1.8fr 1fr 1.2fr 1.8fr" }}
          >
            <div>Tanggal</div>
            <div>Peralatan</div>
            <div>Aksi</div>
            <div>PIC / Penerima</div>
            <div>Catatan & Alokasi</div>
          </div>

          {state.equipmentLogs.map((log) => {
            const eq = state.equipments.find((e) => e.id === log.equipmentId);
            const project = log.projectId ? state.projects.find((p) => p.id === log.projectId) : null;
            return (
              <div
                key={log.id}
                className="tableRow"
                style={{ gridTemplateColumns: "1fr 1.8fr 1fr 1.2fr 1.8fr" }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{log.occurredAt}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{log.id}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{eq?.name ?? log.equipmentId}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{eq?.code}</div>
                </div>
                <div>
                  {log.action === "ASSIGN" ? (
                    <span className="badge badge-info">PENUGASAN PROYEK</span>
                  ) : log.action === "RETURN" ? (
                    <span className="badge badge-success">PENGEMBALIAN</span>
                  ) : (
                    <span className="badge badge-warning">SERVIS PERBAIKAN</span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{log.pic || "—"}</div>
                </div>
                <div>
                  {project ? (
                    <div style={{ fontWeight: 600, color: "var(--primary)" }}>
                      {project.code} — {project.name}
                    </div>
                  ) : null}
                  <div className="muted" style={{ fontSize: 12 }}>{log.note || "Tanpa catatan"}</div>
                </div>
              </div>
            );
          })}

          {state.equipmentLogs.length === 0 && (
            <div className="empty-state">
              <div>Belum ada riwayat penugasan atau servis tercatat.</div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD EQUIPMENT */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Tambah Peralatan Baru</h3>
              <button className="btn" type="button" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddEquipment} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <div>
                  <div className="label">Kode Alat</div>
                  <input
                    className="input"
                    required
                    placeholder="ALT-007"
                    value={newEquipDraft.code}
                    onChange={(e) => setNewEquipDraft({ ...newEquipDraft, code: e.target.value })}
                  />
                </div>
                <div>
                  <div className="label">Nama Alat</div>
                  <input
                    className="input"
                    required
                    placeholder="Misal: Mesin Stamper Kuda"
                    value={newEquipDraft.name}
                    onChange={(e) => setNewEquipDraft({ ...newEquipDraft, name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 10 }}>
                <div>
                  <div className="label">Kategori</div>
                  <input
                    className="input"
                    required
                    placeholder="Misal: Mesin Pemadat Tanah"
                    value={newEquipDraft.category}
                    onChange={(e) => setNewEquipDraft({ ...newEquipDraft, category: e.target.value })}
                  />
                </div>
                <div>
                  <div className="label">Nomor Seri / Plat (Opsional)</div>
                  <input
                    className="input"
                    placeholder="SN-98213"
                    value={newEquipDraft.serialNo}
                    onChange={(e) => setNewEquipDraft({ ...newEquipDraft, serialNo: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="label">Lokasi Penyimpanan Awal</div>
                <input
                  className="input"
                  placeholder="Gudang Utama / Pool Alat"
                  value={newEquipDraft.location}
                  onChange={(e) => setNewEquipDraft({ ...newEquipDraft, location: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button className="btn" type="button" onClick={() => setShowAddModal(false)}>Batal</button>
                <button className="btn primary" type="submit">Simpan Alat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN EQUIPMENT TO PROJECT */}
      {assignModalItem && (
        <div className="modal-backdrop" onClick={() => setAssignModalItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Tugaskan Alat ke Proyek</h3>
              <button className="btn" type="button" onClick={() => setAssignModalItem(null)}>✕</button>
            </div>
            <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontWeight: 600 }}>{assignModalItem.code} — {assignModalItem.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>Kategori: {assignModalItem.category}</div>
            </div>
            <form onSubmit={handleAssignSubmit} style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="label">Target Proyek Lapangan</div>
                <select
                  className="input"
                  required
                  value={assignDraft.projectId}
                  onChange={(e) => setAssignDraft({ ...assignDraft, projectId: e.target.value })}
                >
                  {state.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name} (Status: {p.status})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
                <div>
                  <div className="label">Penanggung Jawab (Mandor / PIC)</div>
                  <input
                    className="input"
                    required
                    placeholder="Nama penerima di lokasi"
                    value={assignDraft.assignedTo}
                    onChange={(e) => setAssignDraft({ ...assignDraft, assignedTo: e.target.value })}
                  />
                </div>
                <div>
                  <div className="label">Tanggal Penugasan</div>
                  <input
                    className="input"
                    type="date"
                    required
                    value={assignDraft.date}
                    onChange={(e) => setAssignDraft({ ...assignDraft, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="label">Catatan Operasional</div>
                <input
                  className="input"
                  placeholder="Misal: Dipinjam selama 2 minggu untuk pengecoran basement"
                  value={assignDraft.note}
                  onChange={(e) => setAssignDraft({ ...assignDraft, note: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button className="btn" type="button" onClick={() => setAssignModalItem(null)}>Batal</button>
                <button className="btn primary" type="submit">Konfirmasi Penugasan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RETURN EQUIPMENT */}
      {returnModalItem && (
        <div className="modal-backdrop" onClick={() => setReturnModalItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Pengembalian Alat</h3>
              <button className="btn" type="button" onClick={() => setReturnModalItem(null)}>✕</button>
            </div>
            <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontWeight: 600 }}>{returnModalItem.code} — {returnModalItem.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                Saat ini di: {returnModalItem.location} ({returnModalItem.assignedTo ?? "Tanpa PIC"})
              </div>
            </div>
            <form onSubmit={handleReturnSubmit} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
                <div>
                  <div className="label">Kondisi Alat Saat Kembali</div>
                  <select
                    className="input"
                    value={returnDraft.condition}
                    onChange={(e) => setReturnDraft({ ...returnDraft, condition: e.target.value as EquipmentCondition })}
                  >
                    <option value="BAIK">Kondisi Baik & Siap Pakai</option>
                    <option value="PERLU_SERVIS">Perlu Servis / Pembersihan</option>
                    <option value="RUSAK">Rusak Berat</option>
                  </select>
                </div>
                <div>
                  <div className="label">Tanggal Pengembalian</div>
                  <input
                    className="input"
                    type="date"
                    required
                    value={returnDraft.date}
                    onChange={(e) => setReturnDraft({ ...returnDraft, date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="label">Lokasi Gudang Penempatan</div>
                <input
                  className="input"
                  required
                  placeholder="Gudang Utama / Pool Alat"
                  value={returnDraft.location}
                  onChange={(e) => setReturnDraft({ ...returnDraft, location: e.target.value })}
                />
              </div>

              <div>
                <div className="label">Catatan Pemeriksaan Fisik</div>
                <input
                  className="input"
                  placeholder="Misal: Sudah dibersihkan, oli mesin baru diganti"
                  value={returnDraft.note}
                  onChange={(e) => setReturnDraft({ ...returnDraft, note: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button className="btn" type="button" onClick={() => setReturnModalItem(null)}>Batal</button>
                <button className="btn primary" type="submit">Konfirmasi Pengembalian</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
