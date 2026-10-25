import { useMemo, useState } from "react";
import { useAppStore } from "../store/appStore";
import type { Attachment, Project, RabDoc } from "../store/appStore";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatIdr(value: number) {
  return value.toLocaleString("id-ID");
}

export function SdmPage() {
  const { state, actions } = useAppStore();
  const role = state.currentUser.role;
  const canEdit = role === "FINANCE" || role === "ADMIN";

  const projects: Project[] = state.projects;

  const [employeeDraft, setEmployeeDraft] = useState<{ name: string; roleTitle: string; defaultDailyRate: string }>({
    name: "",
    roleTitle: "",
    defaultDailyRate: "0",
  });

  const canCreateEmployee = useMemo(() => {
    const rate = Number(employeeDraft.defaultDailyRate);
    return Boolean(employeeDraft.name.trim()) && Boolean(employeeDraft.roleTitle.trim()) && Number.isFinite(rate) && rate >= 0;
  }, [employeeDraft.defaultDailyRate, employeeDraft.name, employeeDraft.roleTitle]);

  const addEmployee = () => {
    if (!canEdit || !canCreateEmployee) return;
    actions.createEmployee({
      name: employeeDraft.name,
      roleTitle: employeeDraft.roleTitle,
      defaultDailyRate: Number(employeeDraft.defaultDailyRate) || 0,
    });
    setEmployeeDraft({ name: "", roleTitle: "", defaultDailyRate: "0" });
  };

  const activeEmployees = useMemo(() => state.employees.filter((e) => e.active), [state.employees]);

  const [payDraft, setPayDraft] = useState<{
    projectId: string;
    employeeId: string;
    occurredAt: string;
    days: string;
    dailyRate: string;
    note: string;
    rabSectionId: string;
    rabItemId: string;
    files: File[];
  }>(() => {
    const firstProjectId = projects[0]?.id ?? "";
    const firstEmployeeId = activeEmployees[0]?.id ?? "";
    const rate = activeEmployees.find((e) => e.id === firstEmployeeId)?.defaultDailyRate ?? 0;
    return {
      projectId: firstProjectId,
      employeeId: firstEmployeeId,
      occurredAt: new Date().toISOString().slice(0, 10),
      days: "1",
      dailyRate: String(rate || 0),
      note: "",
      rabSectionId: "",
      rabItemId: "",
      files: [],
    };
  });

  const wageAmount = useMemo(() => {
    const days = Number(payDraft.days);
    const rate = Number(payDraft.dailyRate);
    if (!Number.isFinite(days) || !Number.isFinite(rate) || days <= 0 || rate < 0) return 0;
    return Math.max(0, Math.round(days * rate));
  }, [payDraft.dailyRate, payDraft.days]);

  const rabDoc = useMemo<RabDoc | undefined>(() => state.rabsByProjectId[payDraft.projectId], [payDraft.projectId, state.rabsByProjectId]);
  const rabSections = useMemo(() => rabDoc?.sections ?? [], [rabDoc]);
  const selectedRabSection = useMemo(
    () => rabSections.find((s) => s.id === payDraft.rabSectionId) ?? null,
    [payDraft.rabSectionId, rabSections],
  );
  const rabItems = useMemo(() => selectedRabSection?.items ?? [], [selectedRabSection]);

  const ensureRabSelection = (projectId: string) => {
    const doc = state.rabsByProjectId[projectId];
    const firstSection = doc?.sections[0];
    const firstItem = firstSection?.items[0];
    if (!firstSection || !firstItem) {
      setPayDraft((prev) => ({ ...prev, rabSectionId: "", rabItemId: "" }));
      return;
    }
    setPayDraft((prev) => ({ ...prev, rabSectionId: firstSection.id, rabItemId: firstItem.id }));
  };

  const setEmployeeId = (employeeId: string) => {
    const emp = activeEmployees.find((e) => e.id === employeeId) ?? null;
    setPayDraft((prev) => ({ ...prev, employeeId, dailyRate: String(emp?.defaultDailyRate ?? 0) }));
  };

  const [fileInputKey, setFileInputKey] = useState(0);

  const canPay = useMemo(() => {
    const days = Number(payDraft.days);
    const rate = Number(payDraft.dailyRate);
    return Boolean(payDraft.projectId) && Boolean(payDraft.employeeId) && payDraft.occurredAt && days > 0 && rate >= 0 && wageAmount > 0;
  }, [payDraft.days, payDraft.dailyRate, payDraft.employeeId, payDraft.occurredAt, payDraft.projectId, wageAmount]);

  const payWage = () => {
    if (!canEdit || !canPay) return;
    const attachments: Attachment[] = payDraft.files.map((file) => ({
      id: createId(),
      name: file.name,
      mimeType: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
    }));

    actions.payWage({
      projectId: payDraft.projectId,
      employeeId: payDraft.employeeId,
      occurredAt: payDraft.occurredAt,
      days: Number(payDraft.days),
      dailyRate: Number(payDraft.dailyRate),
      note: payDraft.note.trim(),
      rabRef: payDraft.rabSectionId && payDraft.rabItemId ? { sectionId: payDraft.rabSectionId, itemId: payDraft.rabItemId } : undefined,
      attachments,
    });

    setPayDraft((prev) => ({ ...prev, days: "1", note: "", files: [] }));
    setFileInputKey((k) => k + 1);
  };

  const payments = useMemo(() => {
    return state.wagePayments.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [state.wagePayments]);

  const projectLabel = (projectId: string) => {
    const p = state.projects.find((x) => x.id === projectId);
    return p ? `${p.code}: ${p.name}` : projectId;
  };

  const employeeLabel = (employeeId: string) => {
    const e = state.employees.find((x) => x.id === employeeId);
    return e ? `${e.name} (${e.roleTitle})` : employeeId;
  };

  const paymentRabLabel = (projectId: string, rabRef?: { sectionId: string; itemId: string }) => {
    if (!rabRef) return null;
    const doc = state.rabsByProjectId[projectId];
    const sec = doc?.sections.find((s) => s.id === rabRef.sectionId);
    const item = sec?.items.find((it) => it.id === rabRef.itemId);
    if (!sec || !item) return null;
    return `Section ${sec.code} • Item ${item.no}: ${item.title}`;
  };

  const formatFileSize = (size: number) => {
    if (!Number.isFinite(size) || size < 0) return "-";
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>SDM & Upah Proyek</h2>
          <div className="muted">Track upah harian karyawan terhubung otomatis ke akun RAB.</div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          Role: {role}
        </div>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card" style={{ gridColumn: "span 6" }}>
          <div className="label">Karyawan</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div>
                <div className="label">Nama</div>
                <input className="input" value={employeeDraft.name} onChange={(e) => setEmployeeDraft((p) => ({ ...p, name: e.target.value }))} disabled={!canEdit} />
              </div>
              <div>
                <div className="label">Jabatan</div>
                <input className="input" value={employeeDraft.roleTitle} onChange={(e) => setEmployeeDraft((p) => ({ ...p, roleTitle: e.target.value }))} disabled={!canEdit} />
              </div>
              <div>
                <div className="label">Upah Harian Default</div>
                <input className="input" value={employeeDraft.defaultDailyRate} onChange={(e) => setEmployeeDraft((p) => ({ ...p, defaultDailyRate: e.target.value }))} disabled={!canEdit} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="btn primary" style={{ width: "100%" }} type="button" onClick={addEmployee} disabled={!canEdit || !canCreateEmployee}>
                  Tambah Karyawan
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <div className="table" style={{ marginTop: 0 }}>
                <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr" }}>
                  <div>Nama</div>
                  <div>Jabatan</div>
                  <div style={{ textAlign: "right" }}>Default Upah</div>
                </div>
                {state.employees.map((e) => (
                  <div key={e.id} className="tableRow" style={{ gridTemplateColumns: "1.4fr 1fr 0.8fr" }}>
                    <div style={{ fontWeight: 700 }}>{e.name}</div>
                    <div className="muted">{e.roleTitle}</div>
                    <div style={{ textAlign: "right" }}>Rp {formatIdr(e.defaultDailyRate)}</div>
                  </div>
                ))}
                {state.employees.length === 0 ? (
                  <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="muted">Belum ada karyawan</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 6" }}>
          <div className="label">Bayar Upah</div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <div className="label">Project</div>
              <select
                className="input"
                value={payDraft.projectId}
                onChange={(e) => {
                  const projectId = e.target.value;
                  setPayDraft((prev) => ({ ...prev, projectId }));
                  ensureRabSelection(projectId);
                }}
                disabled={!canEdit}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}: {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="label">Karyawan</div>
              <select className="input" value={payDraft.employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!canEdit || activeEmployees.length === 0}>
                {activeEmployees.length === 0 ? <option value="">(Belum ada karyawan)</option> : null}
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.roleTitle})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="label">Tanggal</div>
              <input className="input" type="date" value={payDraft.occurredAt} onChange={(e) => setPayDraft((p) => ({ ...p, occurredAt: e.target.value }))} disabled={!canEdit} />
            </div>
            <div>
              <div className="label">Jumlah Hari</div>
              <input className="input" value={payDraft.days} onChange={(e) => setPayDraft((p) => ({ ...p, days: e.target.value }))} disabled={!canEdit} />
            </div>
            <div>
              <div className="label">Upah Harian</div>
              <input className="input" value={payDraft.dailyRate} onChange={(e) => setPayDraft((p) => ({ ...p, dailyRate: e.target.value }))} disabled={!canEdit} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="label">Catatan</div>
              <input className="input" value={payDraft.note} onChange={(e) => setPayDraft((p) => ({ ...p, note: e.target.value }))} disabled={!canEdit} />
            </div>
            <div>
              <div className="label">Section RAB</div>
              <select
                className="input"
                value={payDraft.rabSectionId}
                onChange={(e) => {
                  const sectionId = e.target.value;
                  const section = rabSections.find((s) => s.id === sectionId) ?? null;
                  const firstItem = section?.items[0] ?? null;
                  setPayDraft((prev) => ({ ...prev, rabSectionId: sectionId, rabItemId: firstItem?.id ?? "" }));
                }}
                disabled={!canEdit || rabSections.length === 0}
              >
                {rabSections.length === 0 ? <option value="">(Tidak ada RAB)</option> : null}
                {rabSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code}: {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="label">Item RAB</div>
              <select
                className="input"
                value={payDraft.rabItemId}
                onChange={(e) => setPayDraft((p) => ({ ...p, rabItemId: e.target.value }))}
                disabled={!canEdit || rabItems.length === 0}
              >
                {rabItems.length === 0 ? <option value="">(Pilih section dulu)</option> : null}
                {rabItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.no}: {it.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div className="label">Upload bukti pembayaran (optional)</div>
              <input
                key={fileInputKey}
                className="input"
                type="file"
                multiple
                accept="image/*,application/pdf"
                disabled={!canEdit}
                onChange={(e) => setPayDraft((p) => ({ ...p, files: Array.from(e.target.files ?? []) }))}
              />
              {payDraft.files.length > 0 ? (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {payDraft.files.map((f, idx) => (
                    <div key={`${f.name}_${f.size}_${idx}`} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {f.name} • {formatFileSize(f.size)}
                      </div>
                      <button className="btn" type="button" onClick={() => setPayDraft((p) => ({ ...p, files: p.files.filter((_, i) => i !== idx) }))} disabled={!canEdit}>
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="label">Total</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Rp {formatIdr(wageAmount)}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Dibuat sebagai transaksi OUT (UPAH) dengan status PENDING
                </div>
              </div>
              <button className="btn primary" type="button" onClick={payWage} disabled={!canEdit || !canPay}>
                Bayar Upah
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="label">Histori Upah</div>
            <h3 style={{ margin: "6px 0 0" }}>Pembayaran upah per karyawan</h3>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {payments.length} pembayaran
          </div>
        </div>

        <div className="table-responsive">
          <div className="table" style={{ marginTop: 12 }}>
            <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1fr 1.5fr 0.8fr 0.8fr 1fr" }}>
              <div>Tanggal</div>
              <div>Project / Karyawan</div>
              <div style={{ textAlign: "right" }}>Hari</div>
              <div style={{ textAlign: "right" }}>Total</div>
              <div>Status</div>
            </div>
            {payments.map((p) => {
              const tx = state.transactions.find((t) => t.id === p.transactionId) ?? null;
              const rab = paymentRabLabel(p.projectId, p.rabRef);
              return (
                <div key={p.id} className="tableRow" style={{ gridTemplateColumns: "1fr 1.5fr 0.8fr 0.8fr 1fr" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.occurredAt}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {p.id}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{projectLabel(p.projectId)}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {employeeLabel(p.employeeId)} • {p.days} hari × {formatIdr(p.dailyRate)}
                    </div>
                    {p.note ? (
                      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                        {p.note}
                      </div>
                    ) : null}
                    {rab ? (
                      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                        {rab}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ textAlign: "right" }}>{p.days}</div>
                  <div style={{ textAlign: "right", fontWeight: 800 }}>{formatIdr(p.amount)}</div>
                  <div>
                    <span className={tx?.approvalStatus === "REJECTED" ? "danger" : undefined}>{tx?.approvalStatus ?? "-"}</span>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      {tx?.id ?? p.transactionId}
                    </div>
                  </div>
                </div>
              );
            })}
            {payments.length === 0 ? (
              <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
                <div className="muted">Belum ada pembayaran upah</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

