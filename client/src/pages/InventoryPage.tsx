import { useMemo, useState } from "react";
import { useAppStore } from "../store/appStore";
import type { InventoryItem, InventoryMovementType, InventoryUnit } from "../store/appStore";

function formatIdr(value: number) {
  return value.toLocaleString("id-ID");
}

export function InventoryPage() {
  const { state, actions } = useAppStore();
  const role = state.currentUser.role;
  const canManage = role === "ADMIN" || role === "FINANCE";

  const [activeTab, setActiveTab] = useState<"ITEMS" | "LOGS">("ITEMS");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<InventoryItem | null>(null);

  // New Item Draft
  const [itemDraft, setItemDraft] = useState<{
    code: string;
    name: string;
    category: string;
    unit: InventoryUnit;
    currentStock: string;
    minStock: string;
    unitPrice: string;
    location: string;
  }>({
    code: "",
    name: "",
    category: "Semen & Pasir",
    unit: "sak",
    currentStock: "0",
    minStock: "5",
    unitPrice: "0",
    location: "Gudang Utama",
  });

  // Movement Draft
  const [movementDraft, setMovementDraft] = useState<{
    itemId: string;
    type: InventoryMovementType;
    qty: string;
    projectId: string;
    notes: string;
    occurredAt: string;
  }>({
    itemId: "",
    type: "OUT",
    qty: "1",
    projectId: "",
    notes: "",
    occurredAt: new Date().toISOString().slice(0, 10),
  });

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    state.inventoryItems.forEach((it) => set.add(it.category));
    return Array.from(set);
  }, [state.inventoryItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.inventoryItems.filter((it) => {
      if (selectedCategory && it.category !== selectedCategory) return false;
      if (!q) return true;
      return it.name.toLowerCase().includes(q) || it.code.toLowerCase().includes(q) || it.location.toLowerCase().includes(q);
    });
  }, [search, selectedCategory, state.inventoryItems]);

  // Metrics
  const metrics = useMemo(() => {
    const totalItems = state.inventoryItems.length;
    const totalAssetValue = state.inventoryItems.reduce((sum, it) => sum + it.currentStock * it.unitPrice, 0);
    const lowStockCount = state.inventoryItems.filter((it) => it.currentStock <= it.minStock).length;
    const movementCount = state.inventoryMovements.length;
    return { totalItems, totalAssetValue, lowStockCount, movementCount };
  }, [state.inventoryItems, state.inventoryMovements]);

  // Submit Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDraft.name.trim() || !itemDraft.code.trim()) return;

    actions.addInventoryItem({
      code: itemDraft.code,
      name: itemDraft.name,
      category: itemDraft.category,
      unit: itemDraft.unit,
      currentStock: Number(itemDraft.currentStock) || 0,
      minStock: Number(itemDraft.minStock) || 0,
      unitPrice: Number(itemDraft.unitPrice) || 0,
      location: itemDraft.location,
    });

    setItemDraft({
      code: "",
      name: "",
      category: "Semen & Pasir",
      unit: "sak",
      currentStock: "0",
      minStock: "5",
      unitPrice: "0",
      location: "Gudang Utama",
    });
    setShowAddModal(false);
  };

  // Open Movement Modal
  const openMovementModal = (item?: InventoryItem) => {
    const targetItem = item ?? state.inventoryItems[0];
    if (!targetItem) return;
    setSelectedItemForMovement(targetItem);
    setMovementDraft({
      itemId: targetItem.id,
      type: "OUT",
      qty: "1",
      projectId: state.projects[0]?.id ?? "",
      notes: "",
      occurredAt: new Date().toISOString().slice(0, 10),
    });
    setShowMovementModal(true);
  };

  // Submit Movement
  const handleRecordMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(movementDraft.qty);
    if (!movementDraft.itemId || !Number.isFinite(qty) || qty <= 0) return;

    actions.recordInventoryMovement({
      itemId: movementDraft.itemId,
      type: movementDraft.type,
      qty,
      projectId: movementDraft.type === "OUT" ? movementDraft.projectId || undefined : undefined,
      notes: movementDraft.notes,
      occurredAt: movementDraft.occurredAt,
    });

    setShowMovementModal(false);
  };

  return (
    <div className="container">
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px" }}>Stok Barang (Inventory)</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Pencatatan material gudang, mutasi alokasi ke proyek, dan peringatan stok minimum.
          </div>
        </div>
        {canManage ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" type="button" onClick={() => openMovementModal()}>
              ⇄ Catat Mutasi
            </button>
            <button className="btn primary" type="button" onClick={() => setShowAddModal(true)}>
              + Tambah Barang Baru
            </button>
          </div>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-kpi" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="label">Total Item Material</div>
          <div className="stat-value">{metrics.totalItems} Varian</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Tersedia di seluruh gudang</div>
        </div>
        <div className="card">
          <div className="label">Estimasi Nilai Stok</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>Rp {formatIdr(metrics.totalAssetValue)}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Total nilai aset material</div>
        </div>
        <div className="card">
          <div className="label">Stok Perlu Restock</div>
          <div className="stat-value" style={{ color: metrics.lowStockCount > 0 ? "var(--danger)" : "var(--success)" }}>
            {metrics.lowStockCount} Item
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {metrics.lowStockCount > 0 ? "Stok di bawah batas minimum!" : "Semua stok di atas ambang aman"}
          </div>
        </div>
        <div className="card">
          <div className="label">Total Mutasi Masuk/Keluar</div>
          <div className="stat-value">{metrics.movementCount} Transaksi</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Riwayat pergerakan fisik</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-list" style={{ marginTop: 20 }}>
        <button
          className={activeTab === "ITEMS" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("ITEMS")}
          type="button"
        >
          Daftar Stok Material ({state.inventoryItems.length})
        </button>
        <button
          className={activeTab === "LOGS" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("LOGS")}
          type="button"
        >
          Riwayat Mutasi Barang ({state.inventoryMovements.length})
        </button>
      </div>

      {/* TAB 1: ITEMS */}
      {activeTab === "ITEMS" && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <input
              className="input"
              style={{ maxWidth: 320 }}
              placeholder="Cari kode, nama material, gudang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input"
              style={{ maxWidth: 200 }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Items Table */}
          <div className="table-responsive">
            <div className="table" style={{ marginTop: 0 }}>
            <div
              className="tableRow tableHeader"
              style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 1.2fr 1.2fr 1fr" }}
            >
              <div>Kode</div>
              <div>Material & Kategori</div>
              <div>Lokasi</div>
              <div style={{ textAlign: "right" }}>Stok Saat Ini</div>
              <div style={{ textAlign: "right" }}>Harga Satuan</div>
              <div style={{ textAlign: "right" }}>Total Nilai</div>
              <div style={{ textAlign: "right" }}>Aksi</div>
            </div>

            {filteredItems.map((it) => {
              const isLow = it.currentStock <= it.minStock;
              const totalVal = it.currentStock * it.unitPrice;
              return (
                <div
                  key={it.id}
                  className="tableRow"
                  style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 1.2fr 1.2fr 1fr" }}
                >
                  <div style={{ fontWeight: 600 }}>{it.code}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{it.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {it.category}
                    </div>
                  </div>
                  <div style={{ fontSize: 13 }}>{it.location}</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {it.currentStock} {it.unit}
                    </div>
                    {isLow ? (
                      <span className="badge badge-danger">Min: {it.minStock} {it.unit}</span>
                    ) : (
                      <span className="badge badge-success">Aman (min {it.minStock})</span>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontSize: 13 }}>Rp {formatIdr(it.unitPrice)}</div>
                  <div style={{ textAlign: "right", fontWeight: 600 }}>Rp {formatIdr(totalVal)}</div>
                  <div style={{ textAlign: "right" }}>
                    {canManage ? (
                      <button
                        className="btn"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        type="button"
                        onClick={() => openMovementModal(it)}
                      >
                        Mutasi
                      </button>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>-</span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="empty-state">
                <div>Tidak ada material yang sesuai filter.</div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOGS */}
      {activeTab === "LOGS" && (
        <div className="table-responsive">
          <div className="table" style={{ marginTop: 0 }}>
            <div
              className="tableRow tableHeader"
              style={{ gridTemplateColumns: "1fr 1.8fr 0.8fr 1fr 1.8fr" }}
            >
              <div>Tanggal</div>
              <div>Barang</div>
              <div>Jenis</div>
              <div style={{ textAlign: "right" }}>Jumlah</div>
              <div>Alokasi Proyek / Keterangan</div>
            </div>

            {state.inventoryMovements.map((mov) => {
              const item = state.inventoryItems.find((i) => i.id === mov.itemId);
              const project = mov.projectId ? state.projects.find((p) => p.id === mov.projectId) : null;
              return (
                <div
                  key={mov.id}
                  className="tableRow"
                  style={{ gridTemplateColumns: "1fr 1.8fr 0.8fr 1fr 1.8fr" }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{mov.occurredAt}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{mov.id}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item?.name ?? mov.itemId}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{item?.code}</div>
                  </div>
                  <div>
                    {mov.type === "IN" ? (
                      <span className="badge badge-success">MASUK (IN)</span>
                    ) : (
                      <span className="badge badge-info">KELUAR (OUT)</span>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700 }}>
                    {mov.type === "IN" ? "+" : "-"}{mov.qty} {item?.unit ?? "unit"}
                  </div>
                  <div>
                    {project ? (
                      <div style={{ fontWeight: 600, color: "var(--primary)" }}>
                        Proyek: {project.code} ({project.name})
                      </div>
                    ) : (
                      <div className="muted">Gudang / Non-Proyek</div>
                    )}
                    <div className="muted" style={{ fontSize: 12 }}>{mov.notes || "Tanpa catatan"}</div>
                  </div>
                </div>
              );
            })}

            {state.inventoryMovements.length === 0 && (
              <div className="empty-state">
                <div>Belum ada riwayat mutasi material tercatat.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW ITEM */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-drag-handle mobile-only" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Tambah Material Baru</h3>
              <button className="btn" type="button" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddItem} style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                <div>
                  <div className="label">Kode Barang</div>
                  <input
                    className="input"
                    required
                    placeholder="MAT-007"
                    value={itemDraft.code}
                    onChange={(e) => setItemDraft({ ...itemDraft, code: e.target.value })}
                  />
                </div>
                <div>
                  <div className="label">Nama Material</div>
                  <input
                    className="input"
                    required
                    placeholder="Misal: Pasir Cor Hitam"
                    value={itemDraft.name}
                    onChange={(e) => setItemDraft({ ...itemDraft, name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 10 }}>
                <div>
                  <div className="label">Kategori</div>
                  <input
                    className="input"
                    required
                    placeholder="Misal: Semen & Pasir"
                    value={itemDraft.category}
                    onChange={(e) => setItemDraft({ ...itemDraft, category: e.target.value })}
                  />
                </div>
                <div>
                  <div className="label">Satuan</div>
                  <select
                    className="input"
                    value={itemDraft.unit}
                    onChange={(e) => setItemDraft({ ...itemDraft, unit: e.target.value as InventoryUnit })}
                  >
                    <option value="sak">sak</option>
                    <option value="m3">m3</option>
                    <option value="btg">btg</option>
                    <option value="lbr">lbr</option>
                    <option value="kg">kg</option>
                    <option value="roll">roll</option>
                    <option value="box">box</option>
                    <option value="galon">galon</option>
                    <option value="unit">unit</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 10 }}>
                <div>
                  <div className="label">Stok Awal</div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={itemDraft.currentStock}
                    onChange={(e) => setItemDraft({ ...itemDraft, currentStock: e.target.value })}
                  />
                </div>
                <div>
                  <div className="label">Batas Min Stok</div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={itemDraft.minStock}
                    onChange={(e) => setItemDraft({ ...itemDraft, minStock: e.target.value })}
                  />
                </div>
                <div>
                  <div className="label">Estimasi Harga Satuan (Rp)</div>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={itemDraft.unitPrice}
                    onChange={(e) => setItemDraft({ ...itemDraft, unitPrice: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="label">Lokasi Gudang / Rak</div>
                <input
                  className="input"
                  placeholder="Gudang Utama A / Site 1"
                  value={itemDraft.location}
                  onChange={(e) => setItemDraft({ ...itemDraft, location: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button className="btn" type="button" onClick={() => setShowAddModal(false)}>Batal</button>
                <button className="btn primary" type="submit">Simpan Material</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD MOVEMENT */}
      {showMovementModal && (
        <div className="modal-backdrop" onClick={() => setShowMovementModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Catat Mutasi Stok Material</h3>
              <button className="btn" type="button" onClick={() => setShowMovementModal(false)}>✕</button>
            </div>
            {selectedItemForMovement ? (
              <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, marginBottom: 12 }}>
                <strong>{selectedItemForMovement.code} — {selectedItemForMovement.name}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  Stok saat ini: {selectedItemForMovement.currentStock} {selectedItemForMovement.unit} • Lokasi: {selectedItemForMovement.location}
                </div>
              </div>
            ) : null}
            <form onSubmit={handleRecordMovement} style={{ display: "grid", gap: 12 }}>
              <div>
                <div className="label">Pilih Material</div>
                <select
                  className="input"
                  value={movementDraft.itemId}
                  onChange={(e) => setMovementDraft({ ...movementDraft, itemId: e.target.value })}
                >
                  {state.inventoryItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.code} — {it.name} (Stok saat ini: {it.currentStock} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10 }}>
                <div>
                  <div className="label">Jenis Mutasi</div>
                  <select
                    className="input"
                    value={movementDraft.type}
                    onChange={(e) => setMovementDraft({ ...movementDraft, type: e.target.value as InventoryMovementType })}
                  >
                    <option value="OUT">KELUAR (Alokasi ke Proyek)</option>
                    <option value="IN">MASUK (Penerimaan/Restock)</option>
                  </select>
                </div>
                <div>
                  <div className="label">Jumlah (Qty)</div>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    required
                    value={movementDraft.qty}
                    onChange={(e) => setMovementDraft({ ...movementDraft, qty: e.target.value })}
                  />
                </div>
                <div>
                  <div className="label">Tanggal</div>
                  <input
                    className="input"
                    type="date"
                    required
                    value={movementDraft.occurredAt}
                    onChange={(e) => setMovementDraft({ ...movementDraft, occurredAt: e.target.value })}
                  />
                </div>
              </div>

              {movementDraft.type === "OUT" && (
                <div>
                  <div className="label">Dialokasikan ke Proyek</div>
                  <select
                    className="input"
                    value={movementDraft.projectId}
                    onChange={(e) => setMovementDraft({ ...movementDraft, projectId: e.target.value })}
                  >
                    <option value="">Gudang Lain / Operasional Umum</option>
                    {state.projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="label">Catatan / Supplier / No Surat Jalan</div>
                <input
                  className="input"
                  placeholder="Misal: Surat Jalan PT Semen No 112 / Dipakai mandor untuk plesteran"
                  value={movementDraft.notes}
                  onChange={(e) => setMovementDraft({ ...movementDraft, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button className="btn" type="button" onClick={() => setShowMovementModal(false)}>Batal</button>
                <button className="btn primary" type="submit">Catat Mutasi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
