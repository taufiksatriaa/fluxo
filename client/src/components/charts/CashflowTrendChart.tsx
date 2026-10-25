import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { Transaction } from "../../store/appStore";

type CashflowTrendChartProps = {
  transactions: Transaction[];
  height?: number;
};

type DailyAggregate = {
  date: Date;
  dateStr: string;
  totalIn: number;
  totalOut: number;
  cumIn: number;
  cumOut: number;
  net: number;
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

export function CashflowTrendChart({ transactions, height = 260 }: CashflowTrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [hoveredPoint, setHoveredPoint] = useState<DailyAggregate | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Resize observer for responsive width
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

  // Aggregate approved transactions chronologically
  const chartData = useMemo<DailyAggregate[]>(() => {
    const approved = transactions.filter((t) => t.approvalStatus === "APPROVED");
    if (approved.length === 0) return [];

    const dateMap = new Map<string, { totalIn: number; totalOut: number }>();

    for (const t of approved) {
      const key = t.occurredAt.slice(0, 10);
      const curr = dateMap.get(key) ?? { totalIn: 0, totalOut: 0 };
      if (t.type === "IN") curr.totalIn += t.amount;
      else curr.totalOut += t.amount;
      dateMap.set(key, curr);
    }

    const sortedKeys = Array.from(dateMap.keys()).sort();
    let cumIn = 0;
    let cumOut = 0;

    return sortedKeys.map((k) => {
      const item = dateMap.get(k)!;
      cumIn += item.totalIn;
      cumOut += item.totalOut;
      return {
        date: new Date(k),
        dateStr: k,
        totalIn: item.totalIn,
        totalOut: item.totalOut,
        cumIn,
        cumOut,
        net: cumIn - cumOut,
      };
    });
  }, [transactions]);

  const margin = { top: 20, right: 24, bottom: 32, left: 54 };
  const width = Math.max(containerWidth, 280);
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Scales
  const { xScale, yScale } = useMemo(() => {
    if (chartData.length === 0) {
      return {
        xScale: d3.scaleTime().domain([new Date(), new Date()]).range([0, innerWidth]),
        yScale: d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]),
      };
    }

    const xExt = d3.extent(chartData, (d) => d.date);
    const minDate = xExt[0] ?? new Date();
    const maxDate = xExt[1] ?? new Date();

    const maxAmt = d3.max(chartData, (d) => Math.max(d.cumIn, d.cumOut)) ?? 1000000;
    const finalMax = maxAmt === 0 ? 1000000 : maxAmt * 1.15;

    const xs = d3.scaleTime().domain([minDate, maxDate]).range([0, innerWidth]);
    const ys = d3.scaleLinear().domain([0, finalMax]).range([innerHeight, 0]).nice();

    return { xScale: xs, yScale: ys };
  }, [chartData, innerWidth, innerHeight]);

  // Generators
  const areaIn = useMemo(() => {
    return d3
      .area<DailyAggregate>()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.cumIn))
      .curve(d3.curveMonotoneX);
  }, [xScale, yScale, innerHeight]);

  const lineIn = useMemo(() => {
    return d3
      .line<DailyAggregate>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.cumIn))
      .curve(d3.curveMonotoneX);
  }, [xScale, yScale]);

  const areaOut = useMemo(() => {
    return d3
      .area<DailyAggregate>()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.cumOut))
      .curve(d3.curveMonotoneX);
  }, [xScale, yScale, innerHeight]);

  const lineOut = useMemo(() => {
    return d3
      .line<DailyAggregate>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.cumOut))
      .curve(d3.curveMonotoneX);
  }, [xScale, yScale]);

  // Y axis ticks
  const yTicks = useMemo(() => yScale.ticks(5), [yScale]);

  // Pointer move handler for tooltip
  const handlePointerMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (chartData.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const dateAtMouse = xScale.invert(mouseX);

    const bisect = d3.bisector<DailyAggregate, Date>((d) => d.date).center;
    const index = bisect(chartData, dateAtMouse);
    const d = chartData[index];

    if (d) {
      setHoveredPoint(d);
      setTooltipPos({
        x: xScale(d.date) + margin.left,
        y: Math.min(yScale(d.cumIn), yScale(d.cumOut)) + margin.top,
      });
    }
  };

  const handlePointerLeave = () => {
    setHoveredPoint(null);
    setTooltipPos(null);
  };

  if (chartData.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          height,
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
        Belum ada data transaksi approved untuk menampilkan tren cashflow.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", userSelect: "none" }}>
      <svg
        width={width}
        height={height}
        role="graphics-document"
        aria-label="Grafik Tren Arus Kas Masuk dan Kas Keluar Kumulatif"
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          {/* Gradient Kas Masuk */}
          <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
          </linearGradient>

          {/* Gradient Kas Keluar */}
          <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines horizontal */}
          {yTicks.map((tick) => (
            <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
              <line x1={0} x2={innerWidth} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text
                x={-10}
                y={4}
                textAnchor="end"
                fontSize={11}
                fill="#94a3b8"
                fontWeight={500}
              >
                {formatCompactMoney(tick)}
              </text>
            </g>
          ))}

          {/* Areas */}
          <path d={areaIn(chartData) ?? ""} fill="url(#gradIn)" />
          <path d={areaOut(chartData) ?? ""} fill="url(#gradOut)" />

          {/* Lines */}
          <path
            d={lineIn(chartData) ?? ""}
            fill="none"
            stroke="#16a34a"
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <path
            d={lineOut(chartData) ?? ""}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2.4}
            strokeLinecap="round"
          />

          {/* X Axis labels */}
          {chartData.map((d, i) => {
            // Filter labels so they don't overlap if too many
            const step = Math.ceil(chartData.length / 7);
            if (i % step !== 0 && i !== chartData.length - 1) return null;
            return (
              <g key={d.dateStr} transform={`translate(${xScale(d.date)}, ${innerHeight + 18})`}>
                <text textAnchor="middle" fontSize={11} fill="#64748b" fontWeight={500}>
                  {d.dateStr.slice(5)}
                </text>
              </g>
            );
          })}

          {/* Crosshair & Points when Hovered */}
          {hoveredPoint && (
            <g>
              <line
                x1={xScale(hoveredPoint.date)}
                x2={xScale(hoveredPoint.date)}
                y1={0}
                y2={innerHeight}
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              {/* Dot for Kas Masuk */}
              <circle
                cx={xScale(hoveredPoint.date)}
                cy={yScale(hoveredPoint.cumIn)}
                r={5.5}
                fill="#16a34a"
                stroke="#ffffff"
                strokeWidth={2}
              />
              {/* Dot for Kas Keluar */}
              <circle
                cx={xScale(hoveredPoint.date)}
                cy={yScale(hoveredPoint.cumOut)}
                r={5.5}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Interactive Transparent Overlay for pointer capture */}
          <rect
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            style={{ cursor: "crosshair" }}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          />
        </g>
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && tooltipPos && (
        <div
          style={{
            position: "absolute",
            left: Math.min(Math.max(tooltipPos.x, 100), width - 110),
            top: 8,
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.92)",
            color: "#ffffff",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            zIndex: 10,
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.18)", paddingBottom: 4, marginBottom: 4 }}>
            Tanggal: {hoveredPoint.dateStr}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
            <span style={{ color: "#4ade80" }}>● Kas Masuk Kumulatif:</span>
            <strong>Rp {formatIdr(hoveredPoint.cumIn)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
            <span style={{ color: "#60a5fa" }}>● Kas Keluar Kumulatif:</span>
            <strong>Rp {formatIdr(hoveredPoint.cumOut)}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 4 }}>
            <span>Net Kumulatif:</span>
            <strong style={{ color: hoveredPoint.net >= 0 ? "#4ade80" : "#f87171" }}>
              Rp {formatIdr(hoveredPoint.net)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}
