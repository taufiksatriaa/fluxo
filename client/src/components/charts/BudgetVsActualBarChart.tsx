import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export type ProjectBudgetDatum = {
  id: string;
  code: string;
  name: string;
  budgetTotal: number;
  budgetUsed: number;
  progressPct: number;
};

type BudgetVsActualBarChartProps = {
  data: ProjectBudgetDatum[];
  height?: number;
};

function formatCompactMoney(val: number): string {
  if (Math.abs(val) >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} M`;
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} Jt`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)} Rb`;
  return String(val);
}

function formatIdr(val: number): string {
  return val.toLocaleString("id-ID");
}

export function BudgetVsActualBarChart({ data, height }: BudgetVsActualBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(500);
  const [hoveredItem, setHoveredItem] = useState<{
    project: ProjectBudgetDatum;
    type: "budget" | "used";
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute calculated height based on items count if not fixed
  const computedHeight = height ?? Math.max(220, data.length * 64 + 40);

  const margin = { top: 12, right: 30, bottom: 24, left: 85 };
  const width = Math.max(containerWidth, 280);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = computedHeight - margin.top - margin.bottom;

  const { y0Scale, y1Scale, xScale } = useMemo(() => {
    const maxVal = d3.max(data, (d) => Math.max(d.budgetTotal, d.budgetUsed)) ?? 1000000;
    const finalMax = maxVal === 0 ? 1000000 : maxVal * 1.1;

    const y0 = d3
      .scaleBand()
      .domain(data.map((d) => d.code))
      .range([0, innerHeight])
      .padding(0.25);

    const y1 = d3
      .scaleBand()
      .domain(["budget", "used"])
      .range([0, y0.bandwidth()])
      .padding(0.12);

    const x = d3.scaleLinear().domain([0, finalMax]).range([0, innerWidth]).nice();

    return { y0Scale: y0, y1Scale: y1, xScale: x };
  }, [data, innerWidth, innerHeight]);

  const xTicks = useMemo(() => xScale.ticks(5), [xScale]);

  if (data.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          height: computedHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
          borderRadius: 8,
          border: "1px dashed var(--border)",
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        Belum ada proyek terdaftar untuk perbandingan anggaran.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", userSelect: "none" }}>
      <svg
        width={width}
        height={computedHeight}
        role="graphics-document"
        aria-label="Grafik Batang Perbandingan Budget Total vs Realisasi Kas Keluar"
        style={{ overflow: "visible", display: "block" }}
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Vertical Gridlines */}
          {xTicks.map((tick) => (
            <g key={tick} transform={`translate(${xScale(tick)}, 0)`}>
              <line y1={0} y2={innerHeight} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text y={innerHeight + 18} textAnchor="middle" fontSize={11} fill="#94a3b8" fontWeight={500}>
                {formatCompactMoney(tick)}
              </text>
            </g>
          ))}

          {/* Project Groups */}
          {data.map((p) => {
            const groupY = y0Scale(p.code) ?? 0;
            const barBudgetWidth = xScale(p.budgetTotal);
            const barUsedWidth = xScale(p.budgetUsed);
            const isOverBudget = p.budgetUsed > p.budgetTotal && p.budgetTotal > 0;
            const usedPct = p.budgetTotal > 0 ? Math.round((p.budgetUsed / p.budgetTotal) * 100) : 0;

            const isHoveredBudget = hoveredItem?.project.id === p.id && hoveredItem.type === "budget";
            const isHoveredUsed = hoveredItem?.project.id === p.id && hoveredItem.type === "used";

            return (
              <g key={p.id} transform={`translate(0, ${groupY})`}>
                {/* Project Code & Name Label on Y axis */}
                <text
                  x={-10}
                  y={(y0Scale.bandwidth() ?? 0) / 2 - 2}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--text)"
                >
                  {p.code}
                </text>
                <text
                  x={-10}
                  y={(y0Scale.bandwidth() ?? 0) / 2 + 12}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--muted)"
                >
                  {usedPct}% dipakai
                </text>

                {/* Bar 1: Budget Total (RAB) */}
                <rect
                  x={0}
                  y={y1Scale("budget") ?? 0}
                  width={Math.max(barBudgetWidth, 2)}
                  height={y1Scale.bandwidth()}
                  rx={4}
                  fill={isHoveredBudget ? "#64748b" : "#94a3b8"}
                  style={{ cursor: "pointer", transition: "fill 140ms ease" }}
                  onPointerEnter={() => setHoveredItem({ project: p, type: "budget" })}
                  onPointerLeave={() => setHoveredItem(null)}
                />

                {/* Bar 2: Budget Used (Realisasi Kas Keluar) */}
                <rect
                  x={0}
                  y={y1Scale("used") ?? 0}
                  width={Math.max(barUsedWidth, 2)}
                  height={y1Scale.bandwidth()}
                  rx={4}
                  fill={isOverBudget ? (isHoveredUsed ? "#b91c1c" : "#dc2626") : isHoveredUsed ? "#1d4ed8" : "#2563eb"}
                  style={{ cursor: "pointer", transition: "fill 140ms ease" }}
                  onPointerEnter={() => setHoveredItem({ project: p, type: "used" })}
                  onPointerLeave={() => setHoveredItem(null)}
                />

                {/* Value Text on the right of bars */}
                <text
                  x={Math.max(barBudgetWidth, barUsedWidth) + 8}
                  y={(y0Scale.bandwidth() ?? 0) / 2 + 4}
                  fontSize={11}
                  fontWeight={600}
                  fill={isOverBudget ? "var(--danger)" : "var(--muted)"}
                >
                  {formatCompactMoney(p.budgetUsed)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Tooltip */}
      {hoveredItem && (
        <div
          style={{
            position: "absolute",
            right: 16,
            top: 4,
            background: "rgba(15, 23, 42, 0.94)",
            color: "#ffffff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: 4, marginBottom: 4 }}>
            {hoveredItem.project.code} — {hoveredItem.project.name}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "#cbd5e1" }}>Pagu Anggaran (RAB):</span>
            <strong>Rp {formatIdr(hoveredItem.project.budgetTotal)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "#60a5fa" }}>Realisasi Kas Keluar:</span>
            <strong>Rp {formatIdr(hoveredItem.project.budgetUsed)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 4 }}>
            <span>Sisa Budget:</span>
            <strong
              style={{
                color:
                  hoveredItem.project.budgetTotal - hoveredItem.project.budgetUsed >= 0
                    ? "#4ade80"
                    : "#f87171",
              }}
            >
              Rp {formatIdr(hoveredItem.project.budgetTotal - hoveredItem.project.budgetUsed)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}
