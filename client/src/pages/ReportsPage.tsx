import { useMemo, useState } from "react";
import { calcRabGrandTotal, groupLabel, useAppStore } from "../store/appStore";
import type { TransactionGroup } from "../store/appStore";

function formatIdr(value: number) {
  return value.toLocaleString("id-ID");
}

function isDateInRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function parseIdMoney(value: string): number {
  const cleaned = value.replace(/[^0-9.,-]/g, "").trim();
  if (!cleaned) return 0;
  const sign = cleaned.startsWith("-") ? -1 : 1;
  const digits = cleaned.replace(/[^0-9.,]/g, "");
  const normalized = digits.replace(/\./g, "").replace(/,/g, ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? sign * n : 0;
}

export function ReportsPage() {
  const { state } = useAppStore();
  const [projectId, setProjectId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [itemSearch, setItemSearch] = useState<string>("");

  const report = useMemo(() => {
    const tx = state.transactions
      .filter((t) => (projectId ? t.projectId === projectId : true))
      .filter((t) => isDateInRange(t.occurredAt, from || undefined, to || undefined))
      .filter((t) => t.approvalStatus === "APPROVED");

    const totalIn = tx.filter((t) => t.type === "IN").reduce((sum, t) => sum + t.amount, 0);
    const totalOut = tx.filter((t) => t.type === "OUT").reduce((sum, t) => sum + t.amount, 0);

    const outByGroup = tx
      .filter((t) => t.type === "OUT")
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.group] = (acc[t.group] ?? 0) + t.amount;
        return acc;
      }, {});

    const budgetTotal = projectId
      ? (() => {
          const p = state.projects.find((x) => x.id === projectId);
          const rab = state.rabsByProjectId[projectId];
          return rab ? calcRabGrandTotal(rab) : (p?.budgetPlanTotal ?? 0);
        })()
      : state.projects.reduce((sum, p) => {
          const rab = state.rabsByProjectId[p.id];
          return sum + (rab ? calcRabGrandTotal(rab) : p.budgetPlanTotal);
        }, 0);

    const budgetUsed = projectId
      ? state.transactions
          .filter((t) => t.projectId === projectId && t.type === "OUT" && t.approvalStatus === "APPROVED")
          .reduce((sum, t) => sum + t.amount, 0)
      : state.transactions
          .filter((t) => t.type === "OUT" && t.approvalStatus === "APPROVED")
          .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      count: tx.length,
      outByGroup,
      budgetTotal,
      budgetUsed,
      budgetRemaining: budgetTotal - budgetUsed,
    };
  }, [from, projectId, state.projects, state.rabsByProjectId, state.transactions, to]);

  const scopeLabel = useMemo(() => {
    if (!projectId) return "Semua project";
    const p = state.projects.find((x) => x.id === projectId);
    return p ? `${p.code} — ${p.name}` : projectId;
  }, [projectId, state.projects]);

  const groups = useMemo(() => {
    return (Object.keys(report.outByGroup) as TransactionGroup[]).sort((a, b) => a.localeCompare(b));
  }, [report.outByGroup]);

  const progressPerItem = useMemo(() => {
    const txApprovedOut = state.transactions
      .filter((t) => t.type === "OUT" && t.approvalStatus === "APPROVED")
      .filter((t) => (projectId ? t.projectId === projectId : true))
      .filter((t) => isDateInRange(t.occurredAt, from || undefined, to || undefined));

    const rows: Array<{
      key: string;
      projectId: string;
      projectLabel: string;
      sectionId: string;
      sectionLabel: string;
      itemId: string;
      itemLabel: string;
      planned: number;
      actual: number;
      progressPct: number;
    }> = [];

    const projects = projectId ? state.projects.filter((p) => p.id === projectId) : state.projects;
    for (const p of projects) {
      const doc = state.rabsByProjectId[p.id];
      if (!doc) continue;
      for (const sec of doc.sections) {
        for (const it of sec.items) {
          const planned = Math.max(0, parseIdMoney(it.qty) * parseIdMoney(it.unitPrice));
          const actual = txApprovedOut
            .filter((t) => t.rabRef?.sectionId === sec.id && t.rabRef?.itemId === it.id)
            .reduce((sum, t) => sum + t.amount, 0);
          const progressPct =
            planned > 0 ? Math.min(100, Math.max(0, Math.round((actual / planned) * 100))) : actual > 0 ? 100 : 0;

          rows.push({
            key: `${p.id}:${sec.id}:${it.id}`,
            projectId: p.id,
            projectLabel: `${p.code} — ${p.name}`,
            sectionId: sec.id,
            sectionLabel: `Section ${sec.code} — ${sec.title}`,
            itemId: it.id,
            itemLabel: `Item ${it.no} — ${it.title}`,
            planned,
            actual,
            progressPct,
          });
        }
      }
    }

    const search = itemSearch.trim().toLowerCase();
    const filtered = search
      ? rows.filter((r) => `${r.projectLabel} ${r.sectionLabel} ${r.itemLabel}`.toLowerCase().includes(search))
      : rows;

    filtered.sort((a, b) => {
      const byProject = a.projectLabel.localeCompare(b.projectLabel);
      if (byProject !== 0) return byProject;
      const bySection = a.sectionLabel.localeCompare(b.sectionLabel);
      if (bySection !== 0) return bySection;
      return a.itemLabel.localeCompare(b.itemLabel);
    });

    const totals = filtered.reduce(
      (acc, r) => {
        acc.planned += r.planned;
        acc.actual += r.actual;
        return acc;
      },
      { planned: 0, actual: 0 },
    );

    return { rows: filtered, totals };
  }, [from, itemSearch, projectId, state.projects, state.rabsByProjectId, state.transactions, to]);

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Laporan</h2>
          <div className="muted">Ringkasan cashflow (approved) + budget vs realisasi.</div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {report.count} transaksi (filter)
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Filter</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, marginTop: 10 }}>
          <div style={{ gridColumn: "span 6" }}>
            <div className="label">Project</div>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Semua project</option>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div className="label">Dari</div>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ gridColumn: "span 3" }}>
            <div className="label">Sampai</div>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="label">Scope</div>
          <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700 }}>{scopeLabel}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Approved saja
          </div>
        </div>
        <div className="card">
          <div className="label">Total IN</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(report.totalIn)}</div>
        </div>
        <div className="card">
          <div className="label">Total OUT</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(report.totalOut)}</div>
        </div>
        <div className="card">
          <div className="label">NET</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(report.net)}</div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="label">Budget (RAB atau Plan)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(report.budgetTotal)}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Jika ada RAB → pakai total RAB, jika tidak → pakai budget plan project
          </div>
        </div>
        <div className="card">
          <div className="label">Realisasi OUT (Approved)</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(report.budgetUsed)}</div>
        </div>
        <div className="card">
          <div className="label">Sisa Budget</div>
          <div style={{ marginTop: 8, fontSize: 24 }}>{formatIdr(report.budgetRemaining)}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Breakdown OUT per Opsi</div>
        <div className="table" style={{ marginTop: 10 }}>
          <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
            <div>Opsi</div>
            <div style={{ textAlign: "right" }}>Total</div>
          </div>
          {groups.map((g) => (
            <div key={String(g)} className="tableRow" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
              <div style={{ fontWeight: 700 }}>{groupLabel(g)}</div>
              <div style={{ textAlign: "right" }}>{formatIdr(report.outByGroup[g] ?? 0)}</div>
            </div>
          ))}
          {groups.length === 0 ? (
            <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
              <div className="muted">Belum ada OUT approved di filter ini</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <div>
            <div className="label">Laporan Progress per ITEM</div>
            <h3 style={{ margin: "6px 0 0" }}>Planned (RAB) vs Actual (OUT Approved)</h3>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="label">Total Planned</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{formatIdr(progressPerItem.totals.planned)}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, marginTop: 10 }}>
          <div style={{ gridColumn: "span 12" }}>
            <div className="label">Cari item</div>
            <input className="input" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="project / section / item" />
          </div>
        </div>

        <div className="table" style={{ marginTop: 12 }}>
          <div className="tableRow tableHeader" style={{ gridTemplateColumns: "1.6fr 1fr 0.8fr 0.8fr 0.8fr" }}>
            <div>Item</div>
            <div style={{ textAlign: "right" }}>Progress</div>
            <div style={{ textAlign: "right" }}>Planned</div>
            <div style={{ textAlign: "right" }}>Actual</div>
            <div style={{ textAlign: "right" }}>Sisa</div>
          </div>
          {progressPerItem.rows.map((r) => {
            const remaining = r.planned - r.actual;
            return (
              <div key={r.key} className="tableRow" style={{ gridTemplateColumns: "1.6fr 1fr 0.8fr 0.8fr 0.8fr" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.itemLabel}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {r.projectLabel} • {r.sectionLabel}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>{r.progressPct}%</div>
                  <div className="progress" style={{ marginTop: 8 }}>
                    <div className="progressFill" style={{ width: `${r.progressPct}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>{formatIdr(r.planned)}</div>
                <div style={{ textAlign: "right" }}>{formatIdr(r.actual)}</div>
                <div style={{ textAlign: "right" }}>
                  <span className={remaining < 0 ? "danger" : undefined}>{formatIdr(remaining)}</span>
                </div>
              </div>
            );
          })}
          {progressPerItem.rows.length === 0 ? (
            <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
              <div className="muted">Belum ada RAB item untuk scope/filter ini</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
