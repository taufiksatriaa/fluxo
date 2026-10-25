import { useMemo, useState } from "react";
import * as d3 from "d3";
import type { Transaction } from "../../store/appStore";

type ExpenseDonutChartProps = {
  transactions: Transaction[];
  size?: number;
};

type GroupSummary = {
  group: string;
  label: string;
  amount: number;
  color: string;
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

const GROUP_CONFIG: Record<string, { label: string; color: string }> = {
  MATERIAL: { label: "Material", color: "#2563eb" },
  UPAH: { label: "Upah Tenaga Kerja", color: "#16a34a" },
  OPERASIONAL: { label: "Operasional & Logistik", color: "#f59e0b" },
  OTHER: { label: "Lain-Lain / Overhead", color: "#8b5cf6" },
};

export function ExpenseDonutChart({ transactions, size = 260 }: ExpenseDonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { data, totalExpense } = useMemo(() => {
    const approvedOut = transactions.filter((t) => t.type === "OUT" && t.approvalStatus === "APPROVED");
    const map = new Map<string, number>();

    for (const t of approvedOut) {
      const g = t.group || "OTHER";
      map.set(g, (map.get(g) ?? 0) + t.amount);
    }

    const total = Array.from(map.values()).reduce((sum, v) => sum + v, 0);

    const list: GroupSummary[] = Object.keys(GROUP_CONFIG).map((g) => {
      const cfg = GROUP_CONFIG[g]!;
      return {
        group: g,
        label: cfg.label,
        amount: map.get(g) ?? 0,
        color: cfg.color,
      };
    }).filter((item) => item.amount > 0);

    return { data: list, totalExpense: total };
  }, [transactions]);

  const radius = size / 2;
  const innerRadius = radius * 0.62;
  const outerRadius = radius * 0.90;
  const hoverOuterRadius = radius * 0.96;

  // Pie generator
  const pieGenerator = useMemo(() => {
    return d3
      .pie<GroupSummary>()
      .value((d) => d.amount)
      .sort(null)
      .padAngle(0.03);
  }, []);

  const arcs = useMemo(() => pieGenerator(data), [data, pieGenerator]);

  if (totalExpense === 0 || data.length === 0) {
    return (
      <div
        style={{
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fafafa",
          borderRadius: 8,
          border: "1px dashed var(--border)",
          color: "var(--muted)",
          fontSize: 13,
          padding: 16,
          textAlign: "center",
        }}
      >
        Belum ada transaksi pengeluaran (OUT) yang disetujui.
      </div>
    );
  }

  const activeDatum = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
      {/* SVG Donut */}
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          width={size}
          height={size}
          role="graphics-document"
          aria-label="Grafik Donat Distribusi Pengeluaran Kas Keluar"
          style={{ overflow: "visible" }}
        >
          <g transform={`translate(${radius}, ${radius})`}>
            {arcs.map((arcData, i) => {
              const isHovered = hoveredIndex === i;
              const arcGen = d3
                .arc<d3.PieArcDatum<GroupSummary>>()
                .innerRadius(innerRadius)
                .outerRadius(isHovered ? hoverOuterRadius : outerRadius)
                .cornerRadius(5);

              return (
                <path
                  key={arcData.data.group}
                  d={arcGen(arcData) ?? ""}
                  fill={arcData.data.color}
                  style={{
                    cursor: "pointer",
                    transition: "all 140ms ease-out",
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.65,
                  }}
                  onPointerEnter={() => setHoveredIndex(i)}
                  onPointerLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </g>
        </svg>

        {/* Center Text inside Donut */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            textAlign: "center",
            padding: 8,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
            {activeDatum ? activeDatum.label : "Total Keluar"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", marginTop: 2 }}>
            {activeDatum ? `Rp ${formatCompactMoney(activeDatum.amount)}` : `Rp ${formatCompactMoney(totalExpense)}`}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            {activeDatum ? `${Math.round((activeDatum.amount / totalExpense) * 100)}% dari total` : "Kas Keluar Approved"}
          </div>
        </div>
      </div>

      {/* Legend Column */}
      <div style={{ display: "grid", gap: 10, minWidth: 220 }}>
        {data.map((item, i) => {
          const pct = Math.round((item.amount / totalExpense) * 100);
          const isHovered = hoveredIndex === i;
          return (
            <div
              key={item.group}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "6px 10px",
                borderRadius: 8,
                background: isHovered ? "#f1f5f9" : "transparent",
                cursor: "pointer",
                transition: "background 120ms ease",
              }}
              onPointerEnter={() => setHoveredIndex(i)}
              onPointerLeave={() => setHoveredIndex(null)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: item.color,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: isHovered ? 600 : 500 }}>
                  {item.label}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{pct}%</div>
                <div className="muted" style={{ fontSize: 11 }}>Rp {formatIdr(item.amount)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
