import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAppStore } from "../store/appStore";

type RabUnit = "unit" | "m2" | "m1" | "m3" | "ls" | "set";

type RabItem = {
  id: string;
  no: string;
  title: string;
  spec: string;
  qty: string;
  unit: RabUnit;
  unitPrice: string;
};

type RabSection = {
  id: string;
  code: string;
  title: string;
  items: RabItem[];
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

function parseQty(value: string): number {
  return parseIdMoney(value);
}

function formatIdr(value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  return Math.round(v).toLocaleString("id-ID");
}

function formatQty(value: number): string {
  const v = Number.isFinite(value) ? value : 0;
  return v.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function capitalizeFirst(text: string) {
  const t = text.trim();
  if (!t) return t;
  return t[0].toUpperCase() + t.slice(1);
}

function sanitizeFileName(input: string) {
  const forbidden = new Set(["<", ">", ":", '"', "/", "\\", "|", "?", "*"]);
  const trimmed = input.trim();
  let out = "";
  for (const ch of trimmed) {
    const code = ch.charCodeAt(0);
    if (code >= 0 && code < 32) out += "_";
    else if (forbidden.has(ch)) out += "_";
    else out += ch;
  }
  return out.replace(/\s+/g, " ").slice(0, 120);
}

function terbilang(n: number): string {
  const angka = Math.floor(Math.abs(n));
  if (!Number.isFinite(angka)) return "";
  if (angka === 0) return "nol";

  const satuan = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ];

  const sebut = (x: number): string => {
    if (x < 12) return satuan[x];
    if (x < 20) return `${satuan[x - 10]} belas`;
    if (x < 100) {
      const puluh = Math.floor(x / 10);
      const sisa = x % 10;
      return `${satuan[puluh]} puluh${sisa ? ` ${sebut(sisa)}` : ""}`;
    }
    if (x < 200) return `seratus${x === 100 ? "" : ` ${sebut(x - 100)}`}`;
    if (x < 1000) {
      const ratus = Math.floor(x / 100);
      const sisa = x % 100;
      return `${satuan[ratus]} ratus${sisa ? ` ${sebut(sisa)}` : ""}`;
    }
    if (x < 2000) return `seribu${x === 1000 ? "" : ` ${sebut(x - 1000)}`}`;
    if (x < 1000000) {
      const ribu = Math.floor(x / 1000);
      const sisa = x % 1000;
      return `${sebut(ribu)} ribu${sisa ? ` ${sebut(sisa)}` : ""}`;
    }
    if (x < 1000000000) {
      const juta = Math.floor(x / 1000000);
      const sisa = x % 1000000;
      return `${sebut(juta)} juta${sisa ? ` ${sebut(sisa)}` : ""}`;
    }
    const milyar = Math.floor(x / 1000000000);
    const sisa = x % 1000000000;
    return `${sebut(milyar)} milyar${sisa ? ` ${sebut(sisa)}` : ""}`;
  };

  return sebut(angka);
}

export function BudgetsPage() {
  const { state, actions } = useAppStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const role = state.currentUser.role;
  const canEdit = role === "ADMIN" || role === "FINANCE";

  const [viewMode, setViewMode] = useState<"PLAN" | "REALISASI">("PLAN");

  const projects = state.projects;
  const urlProjectId = searchParams.get("projectId") ?? "";
  const [projectId, setProjectId] = useState<string>(() => {
    if (urlProjectId && projects.some((p) => p.id === urlProjectId)) return urlProjectId;
    return projects[0]?.id ?? "";
  });

  const project = useMemo(() => projects.find((p) => p.id === projectId) ?? null, [projectId, projects]);

  const [title, setTitle] = useState<string>("");
  const [sections, setSections] = useState<RabSection[]>([]);

  useEffect(() => {
    if (urlProjectId && urlProjectId !== projectId && projects.some((p) => p.id === urlProjectId)) {
      setProjectId(urlProjectId);
      return;
    }
    if (!projectId && projects[0]?.id) setProjectId(projects[0].id);
  }, [projectId, projects, urlProjectId]);

  useEffect(() => {
    if (!projectId) return;
    const current = searchParams.get("projectId") ?? "";
    if (current === projectId) return;
    const next = new URLSearchParams(searchParams);
    next.set("projectId", projectId);
    setSearchParams(next, { replace: true });
  }, [projectId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!projectId) return;
    const doc = state.rabsByProjectId[projectId];
    if (doc) {
      setTitle(doc.title);
      setSections(doc.sections);
      return;
    }
    setTitle(`RAB ${project?.name ?? ""}`.trim() || "RAB");
    setSections([]);
  }, [project?.name, projectId, state.rabsByProjectId]);

  const commit = (next: { title?: string; sections?: RabSection[] }) => {
    if (!projectId || !canEdit) return;
    const nextTitle = next.title ?? title;
    const nextSections = next.sections ?? sections;
    actions.setRab({ projectId, title: nextTitle, sections: nextSections });
  };

  // Map of actual approved spending per sectionId::itemId
  const itemRealizationMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!projectId) return map;
    const approvedOut = state.transactions.filter(
      (t) => t.projectId === projectId && t.type === "OUT" && t.approvalStatus === "APPROVED" && t.rabRef,
    );
    for (const t of approvedOut) {
      if (t.rabRef) {
        const key = `${t.rabRef.sectionId}::${t.rabRef.itemId}`;
        map.set(key, (map.get(key) ?? 0) + t.amount);
      }
    }
    return map;
  }, [projectId, state.transactions]);

  // Section totals for planned budget & realization
  const sectionTotals = useMemo(() => {
    return sections.map((s) => {
      const items = s.items.map((it) => {
        const qty = parseQty(it.qty);
        const unitPrice = parseIdMoney(it.unitPrice);
        const total = qty * unitPrice;
        const used = itemRealizationMap.get(`${s.id}::${it.id}`) ?? 0;
        return { id: it.id, qty, unitPrice, total, used, remaining: total - used };
      });
      const subtotal = items.reduce((sum, x) => sum + x.total, 0);
      const subtotalUsed = items.reduce((sum, x) => sum + x.used, 0);
      return { sectionId: s.id, items, subtotal, subtotalUsed, subtotalRemaining: subtotal - subtotalUsed };
    });
  }, [itemRealizationMap, sections]);

  const grandTotal = useMemo(() => sectionTotals.reduce((sum, s) => sum + s.subtotal, 0), [sectionTotals]);
  const grandTotalUsed = useMemo(() => sectionTotals.reduce((sum, s) => sum + s.subtotalUsed, 0), [sectionTotals]);
  const grandTotalRemaining = grandTotal - grandTotalUsed;
  const overallUsedPct = grandTotal > 0 ? Math.round((grandTotalUsed / grandTotal) * 100) : 0;

  const fileBaseName = useMemo(() => {
    const parts = [project?.code, title, viewMode === "REALISASI" ? "Realisasi" : "Plan"].filter(Boolean).join("_");
    return sanitizeFileName(parts || "RAB");
  }, [project?.code, title, viewMode]);

  // Export Excel CSV
  const exportExcelCsv = () => {
    const escapeCsv = (value: unknown) => {
      const s = value === null || value === undefined ? "" : String(value);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines: string[] = [];
    lines.push([escapeCsv("RAB"), escapeCsv(title)].join(","));
    lines.push([escapeCsv("Project"), escapeCsv(project ? `${project.code} — ${project.name}` : projectId)].join(","));
    lines.push([escapeCsv("Mode"), escapeCsv(viewMode === "REALISASI" ? "Evaluasi Realisasi vs Anggaran" : "Rencana Anggaran (Plan)")].join(","));
    lines.push("");

    if (viewMode === "REALISASI") {
      lines.push(
        [
          escapeCsv("SECTION"),
          escapeCsv("NO"),
          escapeCsv("DESCRIPTION"),
          escapeCsv("SPESIFIKASI"),
          escapeCsv("QTY"),
          escapeCsv("UNIT"),
          escapeCsv("@HARGA"),
          escapeCsv("PAGU BUDGET"),
          escapeCsv("REALISASI KELUAR"),
          escapeCsv("SISA BUDGET"),
          escapeCsv("STATUS"),
        ].join(","),
      );

      sections.forEach((section) => {
        const sectionCalc = sectionTotals.find((s) => s.sectionId === section.id);
        const subtotal = sectionCalc?.subtotal ?? 0;
        const subtotalUsed = sectionCalc?.subtotalUsed ?? 0;

        lines.push([escapeCsv(section.code), escapeCsv(""), escapeCsv(section.title), "", "", "", "", "", "", "", ""].join(","));

        section.items.forEach((item) => {
          const calc = sectionCalc?.items.find((x) => x.id === item.id);
          const qty = calc?.qty ?? parseQty(item.qty);
          const unitPrice = calc?.unitPrice ?? parseIdMoney(item.unitPrice);
          const total = calc?.total ?? qty * unitPrice;
          const used = calc?.used ?? 0;
          const rem = total - used;
          const statusStr = used === 0 ? "Belum Ada" : used > total ? `OVER (+${formatIdr(used - total)})` : "Aman";

          lines.push(
            [
              escapeCsv(section.code),
              escapeCsv(item.no),
              escapeCsv(item.title),
              escapeCsv(item.spec),
              escapeCsv(formatQty(qty)),
              escapeCsv(item.unit),
              escapeCsv(formatIdr(unitPrice)),
              escapeCsv(formatIdr(total)),
              escapeCsv(formatIdr(used)),
              escapeCsv(formatIdr(rem)),
              escapeCsv(statusStr),
            ].join(","),
          );
        });

        lines.push(
          [
            escapeCsv(section.code),
            escapeCsv(""),
            escapeCsv(`SUBTOTAL ${section.code}`),
            "", "", "", "",
            escapeCsv(formatIdr(subtotal)),
            escapeCsv(formatIdr(subtotalUsed)),
            escapeCsv(formatIdr(subtotal - subtotalUsed)),
            "",
          ].join(","),
        );
        lines.push("");
      });

      lines.push([escapeCsv("GRAND TOTAL"), "", "", "", "", "", "", escapeCsv(formatIdr(grandTotal)), escapeCsv(formatIdr(grandTotalUsed)), escapeCsv(formatIdr(grandTotalRemaining)), ""].join(","));
    } else {
      lines.push(
        [
          escapeCsv("SECTION"),
          escapeCsv("NO"),
          escapeCsv("DESCRIPTION"),
          escapeCsv("SPESIFIKASI"),
          escapeCsv("QTY"),
          escapeCsv("UNIT"),
          escapeCsv("@HARGA"),
          escapeCsv("JUMLAH"),
        ].join(","),
      );

      sections.forEach((section) => {
        const sectionCalc = sectionTotals.find((s) => s.sectionId === section.id);
        const subtotal = sectionCalc?.subtotal ?? 0;

        lines.push([escapeCsv(section.code), escapeCsv(""), escapeCsv(section.title), escapeCsv(""), "", "", "", ""].join(","));

        section.items.forEach((item) => {
          const calc = sectionCalc?.items.find((x) => x.id === item.id);
          const qty = calc?.qty ?? parseQty(item.qty);
          const unitPrice = calc?.unitPrice ?? parseIdMoney(item.unitPrice);
          const total = calc?.total ?? qty * unitPrice;

          lines.push(
            [
              escapeCsv(section.code),
              escapeCsv(item.no),
              escapeCsv(item.title),
              escapeCsv(item.spec),
              escapeCsv(formatQty(qty)),
              escapeCsv(item.unit),
              escapeCsv(formatIdr(unitPrice)),
              escapeCsv(formatIdr(total)),
            ].join(","),
          );
        });

        lines.push(
          [
            escapeCsv(section.code),
            escapeCsv(""),
            escapeCsv(`SUBTOTAL ${section.code}`),
            escapeCsv(""),
            "",
            "",
            "",
            escapeCsv(formatIdr(subtotal)),
          ].join(","),
        );
        lines.push("");
      });

      lines.push([escapeCsv(""), escapeCsv(""), escapeCsv("GRAND TOTAL"), escapeCsv(""), "", "", "", escapeCsv(formatIdr(grandTotal))].join(","));
      lines.push([escapeCsv("TERBILANG"), escapeCsv(capitalizeFirst(terbilang(grandTotal)) + " rupiah")].join(","));
    }

    const csv = "\ufeff" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Export PDF (Print)
  const exportPdf = () => {
    const buildTableRows = () => {
      const rows: string[] = [];
      sections.forEach((section) => {
        const sectionCalc = sectionTotals.find((s) => s.sectionId === section.id);
        const subtotal = sectionCalc?.subtotal ?? 0;

        rows.push(
          `<tr class="section">
            <td style="font-weight:700">${section.code}</td>
            <td colspan="${viewMode === "REALISASI" ? 7 : 5}" style="font-weight:700">${section.title}</td>
            <td class="right" style="font-weight:700">Rp ${formatIdr(subtotal)}</td>
          </tr>`,
        );

        section.items.forEach((item) => {
          const calc = sectionCalc?.items.find((x) => x.id === item.id);
          const qty = calc?.qty ?? parseQty(item.qty);
          const unitPrice = calc?.unitPrice ?? parseIdMoney(item.unitPrice);
          const total = calc?.total ?? qty * unitPrice;
          const used = calc?.used ?? 0;
          const rem = total - used;

          if (viewMode === "REALISASI") {
            rows.push(
              `<tr>
                <td>${item.no}</td>
                <td>${item.title}</td>
                <td>${item.spec}</td>
                <td class="right">${formatQty(qty)}</td>
                <td>${item.unit}</td>
                <td class="right">Rp ${formatIdr(total)}</td>
                <td class="right" style="color:#2563eb;font-weight:600">Rp ${formatIdr(used)}</td>
                <td class="right" style="color:${rem < 0 ? "#dc2626" : "#16a34a"};font-weight:600">Rp ${formatIdr(rem)}</td>
              </tr>`,
            );
          } else {
            rows.push(
              `<tr>
                <td>${item.no}</td>
                <td>${item.title}</td>
                <td>${item.spec}</td>
                <td class="right">${formatQty(qty)}</td>
                <td>${item.unit}</td>
                <td class="right">${formatIdr(unitPrice)}</td>
                <td class="right">${formatIdr(total)}</td>
              </tr>`,
            );
          }
        });

        rows.push(
          `<tr class="subtotal">
            <td></td>
            <td colspan="${viewMode === "REALISASI" ? 4 : 5}" class="right" style="font-weight:700">Subtotal ${section.code}</td>
            <td class="right" style="font-weight:700">Rp ${formatIdr(subtotal)}</td>
            ${viewMode === "REALISASI" ? `<td class="right" style="font-weight:700">Rp ${formatIdr(sectionCalc?.subtotalUsed ?? 0)}</td><td class="right" style="font-weight:700">Rp ${formatIdr(sectionCalc?.subtotalRemaining ?? 0)}</td>` : ""}
          </tr>`,
        );
      });
      return rows.join("");
    };

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${fileBaseName}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 24px; color: #0f172a; }
      h1 { margin: 0; font-size: 18px; }
      .muted { color: #475569; font-size: 12px; }
      .row { display: flex; justify-content: space-between; gap: 16px; margin-top: 6px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 7px 8px; vertical-align: top; }
      th { background: #f1f5f9; text-align: left; }
      .right { text-align: right; }
      .section td { background: #e2e8f0; }
      .subtotal td { background: #f8fafc; }
      .footer { margin-top: 12px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 13px; }
      @media print { body { margin: 0; } .noPrint { display: none; } }
    </style>
  </head>
  <body>
    <div class="noPrint" style="display:flex; justify-content:flex-end; margin-bottom:12px;">
      <button onclick="window.print()" style="padding:8px 14px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; cursor:pointer; font-weight:600;">Print / Save as PDF</button>
    </div>

    <h1>${title}</h1>
    <div class="row">
      <div class="muted">Project: ${project ? `${project.code} — ${project.name}` : projectId}</div>
      <div class="muted">Pagu Total: Rp ${formatIdr(grandTotal)} ${viewMode === "REALISASI" ? `• Terpakai: Rp ${formatIdr(grandTotalUsed)} (${overallUsedPct}%)` : ""}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px">No</th>
          <th>Description</th>
          <th>Spesifikasi</th>
          <th class="right">Qty</th>
          <th>Unit</th>
          ${viewMode === "REALISASI" ? `<th class="right">Pagu</th><th class="right">Realisasi</th><th class="right">Sisa Pagu</th>` : `<th class="right">@Harga</th><th class="right">Jumlah</th>`}
        </tr>
      </thead>
      <tbody>
        ${buildTableRows()}
      </tbody>
    </table>

    <div class="footer">
      <div><strong>Grand Total Pagu:</strong> Rp ${formatIdr(grandTotal)}</div>
      ${viewMode === "REALISASI" ? `<div><strong>Total Realisasi Kas Keluar:</strong> Rp ${formatIdr(grandTotalUsed)} (${overallUsedPct}% terserap)</div><div><strong>Sisa Anggaran:</strong> Rp ${formatIdr(grandTotalRemaining)}</div>` : `<div><strong>Terbilang:</strong> ${capitalizeFirst(terbilang(grandTotal))} rupiah</div>`}
    </div>
  </body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const addSection = () => {
    if (!canEdit) return;
    const nextCode = String.fromCharCode(65 + sections.length);
    const newSection: RabSection = {
      id: createId(),
      code: nextCode,
      title: `PEKERJAAN ${nextCode}`,
      items: [
        {
          id: createId(),
          no: "1",
          title: "Pekerjaan Contoh",
          spec: "Spesifikasi pekerjaan",
          qty: "1,00",
          unit: "unit",
          unitPrice: "0",
        },
      ],
    };
    const next = [...sections, newSection];
    setSections(next);
    commit({ sections: next });
  };

  const updateSection = (sectionId: string, patch: Partial<RabSection>) => {
    if (!canEdit) return;
    setSections((prev) => {
      const next = prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s));
      commit({ sections: next });
      return next;
    });
  };

  const addItem = (sectionId: string) => {
    if (!canEdit) return;
    setSections((prev) => {
      const next = prev.map((s) => {
        if (s.id !== sectionId) return s;
        const nextNo = String(s.items.length + 1);
        const newItem: RabItem = {
          id: createId(),
          no: nextNo,
          title: "",
          spec: "",
          qty: "1,00",
          unit: "unit",
          unitPrice: "0",
        };
        return { ...s, items: [...s.items, newItem] };
      });
      commit({ sections: next });
      return next;
    });
  };

  const updateItem = (sectionId: string, itemId: string, patch: Partial<RabItem>) => {
    if (!canEdit) return;
    setSections((prev) => {
      const next = prev.map((s) => {
        if (s.id !== sectionId) return s;
        const items = s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
        return { ...s, items };
      });
      commit({ sections: next });
      return next;
    });
  };

  const removeItem = (sectionId: string, itemId: string) => {
    if (!canEdit) return;
    setSections((prev) => {
      const next = prev.map((s) => {
        if (s.id !== sectionId) return s;
        const items = s.items.filter((it) => it.id !== itemId).map((it, idx) => ({ ...it, no: String(idx + 1) }));
        return { ...s, items };
      });
      commit({ sections: next });
      return next;
    });
  };

  const removeSection = (sectionId: string) => {
    if (!canEdit) return;
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== sectionId);
      commit({ sections: next });
      return next;
    });
  };

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px" }}>RAB & BOQ Proyek</h2>
          <div className="muted" style={{ fontSize: 13 }}>
            Penyusunan Rencana Anggaran Biaya dan evaluasi serapan realisasi kas keluar per item pekerjaan.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={exportExcelCsv}>
            Export Excel (CSV)
          </button>
          <button className="btn" type="button" onClick={exportPdf}>
            Print / PDF ↗
          </button>
          {projectId ? (
            <Link className="btn" to={`/projects/${projectId}`}>
              Detail Proyek →
            </Link>
          ) : null}
        </div>
      </div>

      {/* KPI Cards Serapan */}
      <div className="grid" style={{ marginTop: 14 }}>
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Pagu Total RAB</div>
          <div className="stat-value">Rp {formatIdr(grandTotal)}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Terbilang: {capitalizeFirst(terbilang(grandTotal))} rupiah
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Realisasi Kas Keluar</div>
          <div className="stat-value" style={{ color: "var(--primary)" }}>Rp {formatIdr(grandTotalUsed)}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Total pengeluaran disetujui ({overallUsedPct}% terserap)
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Sisa Pagu Anggaran</div>
          <div className="stat-value" style={{ color: grandTotalRemaining >= 0 ? "var(--success)" : "var(--danger)" }}>
            Rp {formatIdr(grandTotalRemaining)}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {grandTotalRemaining >= 0 ? "Pagu anggaran masih aman" : "Terjadi over-budget dari rencana!"}
          </div>
        </div>
        <div className="card" style={{ gridColumn: "span 3" }}>
          <div className="label">Mode Tampilan</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              className={`btn ${viewMode === "PLAN" ? "primary" : ""}`}
              style={{ fontSize: 12, padding: "5px 10px", flex: 1 }}
              type="button"
              onClick={() => setViewMode("PLAN")}
            >
              Penyusunan (Edit)
            </button>
            <button
              className={`btn ${viewMode === "REALISASI" ? "primary" : ""}`}
              style={{ fontSize: 12, padding: "5px 10px", flex: 1 }}
              type="button"
              onClick={() => setViewMode("REALISASI")}
            >
              Realisasi vs Pagu
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
          <div style={{ gridColumn: "span 4" }}>
            <div className="label">Pilih Proyek</div>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "span 8" }}>
            <div className="label">Judul Dokumen RAB</div>
            <input
              className="input"
              value={title}
              onChange={(e) => {
                const nextTitle = e.target.value;
                setTitle(nextTitle);
                commit({ title: nextTitle });
              }}
              disabled={!canEdit || viewMode === "REALISASI"}
            />
          </div>
        </div>
      </div>

      {/* RAB Table Card */}
      <div className="card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div className="label">
              {viewMode === "PLAN" ? "Tabel Penyusunan BOQ / RAB" : "Matriks Evaluasi Realisasi Pengeluaran vs RAB"}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {viewMode === "PLAN"
                ? "Isi item pekerjaan, spesifikasi, volume kuantitas, satuan, dan harga per unit."
                : "Membandingkan pagu rencana dengan riwayat transaksi kas keluar riil yang terhubung ke tiap baris item."}
            </div>
          </div>
          {canEdit && viewMode === "PLAN" ? (
            <button className="btn primary" type="button" onClick={addSection}>
              + Tambah Section
            </button>
          ) : null}
        </div>

        {/* ==================== MODE 1: EDIT PLAN ==================== */}
        {viewMode === "PLAN" && (
          <div className="table">
            <div
              className="tableRow tableHeader"
              style={{ gridTemplateColumns: "0.35fr 1.3fr 1.2fr 0.55fr 0.5fr 0.8fr 0.85fr 0.45fr" }}
            >
              <div>No</div>
              <div>Description</div>
              <div>Spesifikasi</div>
              <div style={{ textAlign: "right" }}>Qty</div>
              <div>Unit</div>
              <div style={{ textAlign: "right" }}>@Harga</div>
              <div style={{ textAlign: "right" }}>Jumlah</div>
              <div style={{ textAlign: "right" }}>Aksi</div>
            </div>

            {sections.map((section) => {
              const sectionCalc = sectionTotals.find((s) => s.sectionId === section.id);
              const subtotal = sectionCalc?.subtotal ?? 0;
              return (
                <div key={section.id}>
                  <div
                    className="tableRow"
                    style={{
                      gridTemplateColumns: "0.35fr 1.3fr 1.2fr 0.55fr 0.5fr 0.8fr 0.85fr 0.45fr",
                      background: "#f8fafc",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{section.code}</div>
                    <div style={{ gridColumn: "span 5" }}>
                      <input
                        className="input"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        disabled={!canEdit}
                        style={{ fontWeight: 600 }}
                      />
                    </div>
                    <div style={{ textAlign: "right", fontWeight: 700 }}>Rp {formatIdr(subtotal)}</div>
                    <div style={{ textAlign: "right" }}>
                      <button
                        className="btn danger"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        type="button"
                        onClick={() => removeSection(section.id)}
                        disabled={!canEdit}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  {section.items.map((item) => {
                    const calc = sectionCalc?.items.find((x) => x.id === item.id);
                    const qty = calc?.qty ?? parseQty(item.qty);
                    const unitPrice = calc?.unitPrice ?? parseIdMoney(item.unitPrice);
                    const total = calc?.total ?? qty * unitPrice;

                    return (
                      <div
                        key={item.id}
                        className="tableRow"
                        style={{ gridTemplateColumns: "0.35fr 1.3fr 1.2fr 0.55fr 0.5fr 0.8fr 0.85fr 0.45fr" }}
                      >
                        <div>
                          <input
                            className="input"
                            value={item.no}
                            onChange={(e) => updateItem(section.id, item.id, { no: e.target.value })}
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <input
                            className="input"
                            value={item.title}
                            onChange={(e) => updateItem(section.id, item.id, { title: e.target.value })}
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <input
                            className="input"
                            value={item.spec}
                            onChange={(e) => updateItem(section.id, item.id, { spec: e.target.value })}
                            disabled={!canEdit}
                          />
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <input
                            className="input"
                            style={{ textAlign: "right" }}
                            value={item.qty}
                            onChange={(e) => updateItem(section.id, item.id, { qty: e.target.value })}
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <select
                            className="input"
                            value={item.unit}
                            onChange={(e) => updateItem(section.id, item.id, { unit: e.target.value as RabUnit })}
                            disabled={!canEdit}
                          >
                            <option value="unit">unit</option>
                            <option value="m2">m2</option>
                            <option value="m1">m1</option>
                            <option value="m3">m3</option>
                            <option value="ls">ls</option>
                            <option value="set">set</option>
                          </select>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <input
                            className="input"
                            style={{ textAlign: "right" }}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(section.id, item.id, { unitPrice: e.target.value })}
                            disabled={!canEdit}
                          />
                        </div>
                        <div style={{ textAlign: "right", fontWeight: 600 }}>Rp {formatIdr(total)}</div>
                        <div style={{ textAlign: "right" }}>
                          <button
                            className="btn"
                            style={{ padding: "4px 8px", fontSize: 11 }}
                            type="button"
                            onClick={() => removeItem(section.id, item.id)}
                            disabled={!canEdit}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {canEdit && (
                    <div style={{ padding: "8px 16px", borderTop: "1px dashed var(--border)" }}>
                      <button
                        className="btn"
                        style={{ fontSize: 12, padding: "4px 10px" }}
                        type="button"
                        onClick={() => addItem(section.id)}
                      >
                        + Tambah Item di Section {section.code}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {sections.length === 0 && (
              <div className="empty-state">
                <div>Belum ada section RAB dibuat untuk proyek ini.</div>
                {canEdit && (
                  <button className="btn primary" style={{ marginTop: 8 }} type="button" onClick={addSection}>
                    + Buat Section Pertama
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== MODE 2: TRACKING REALISASI ==================== */}
        {viewMode === "REALISASI" && (
          <div className="table">
            <div
              className="tableRow tableHeader"
              style={{ gridTemplateColumns: "0.35fr 2fr 1.1fr 1.1fr 1.1fr 1fr" }}
            >
              <div>No</div>
              <div>Item Pekerjaan & Spesifikasi</div>
              <div style={{ textAlign: "right" }}>Pagu Rencana (Plan)</div>
              <div style={{ textAlign: "right" }}>Realisasi Kas Keluar</div>
              <div style={{ textAlign: "right" }}>Sisa Pagu Anggaran</div>
              <div style={{ textAlign: "right" }}>Status Serapan</div>
            </div>

            {sections.map((section) => {
              const sectionCalc = sectionTotals.find((s) => s.sectionId === section.id);
              const subtotal = sectionCalc?.subtotal ?? 0;
              const subtotalUsed = sectionCalc?.subtotalUsed ?? 0;
              const subtotalRem = subtotal - subtotalUsed;

              return (
                <div key={section.id}>
                  <div
                    className="tableRow"
                    style={{
                      gridTemplateColumns: "0.35fr 2fr 1.1fr 1.1fr 1.1fr 1fr",
                      background: "#f1f5f9",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{section.code}</div>
                    <div style={{ fontWeight: 700 }}>{section.title}</div>
                    <div style={{ textAlign: "right", fontWeight: 700 }}>Rp {formatIdr(subtotal)}</div>
                    <div style={{ textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>
                      Rp {formatIdr(subtotalUsed)}
                    </div>
                    <div style={{ textAlign: "right", fontWeight: 700, color: subtotalRem < 0 ? "var(--danger)" : "var(--success)" }}>
                      Rp {formatIdr(subtotalRem)}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="badge badge-neutral">Subtotal {section.code}</span>
                    </div>
                  </div>

                  {section.items.map((item) => {
                    const calc = sectionCalc?.items.find((x) => x.id === item.id);
                    const qty = calc?.qty ?? parseQty(item.qty);
                    const unitPrice = calc?.unitPrice ?? parseIdMoney(item.unitPrice);
                    const total = calc?.total ?? qty * unitPrice;
                    const used = calc?.used ?? 0;
                    const rem = total - used;
                    const isOver = used > total && total > 0;
                    const pct = total > 0 ? Math.round((used / total) * 100) : 0;

                    return (
                      <div
                        key={item.id}
                        className="tableRow"
                        style={{
                          gridTemplateColumns: "0.35fr 2fr 1.1fr 1.1fr 1.1fr 1fr",
                          background: isOver ? "rgba(220, 38, 38, 0.03)" : undefined,
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{item.no}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.title}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {item.spec} • {formatQty(qty)} {item.unit} @ Rp {formatIdr(unitPrice)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", fontWeight: 600 }}>Rp {formatIdr(total)}</div>
                        <div style={{ textAlign: "right", fontWeight: 700, color: "var(--primary)" }}>
                          Rp {formatIdr(used)}
                        </div>
                        <div style={{ textAlign: "right", fontWeight: 700, color: rem < 0 ? "var(--danger)" : "var(--success)" }}>
                          Rp {formatIdr(rem)}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {used === 0 ? (
                            <span className="badge badge-neutral">Belum Ada</span>
                          ) : isOver ? (
                            <span className="badge badge-danger">Over ({pct}%)</span>
                          ) : (
                            <span className="badge badge-success">Aman ({pct}%)</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {sections.length === 0 && (
              <div className="empty-state">
                <div>Belum ada data section RAB untuk dievaluasi.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
