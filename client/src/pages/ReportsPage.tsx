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

export function ReportsPage() {
  const { state } = useAppStore();
  const [projectId, setProjectId] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

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
    </div>
  );
}
