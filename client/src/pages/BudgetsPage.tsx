import { useEffect, useMemo, useState } from "react";
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
    if (x < 1000000000000) {
      const miliar = Math.floor(x / 1000000000);
      const sisa = x % 1000000000;
      return `${sebut(miliar)} miliar${sisa ? ` ${sebut(sisa)}` : ""}`;
    }
    const triliun = Math.floor(x / 1000000000000);
    const sisa = x % 1000000000000;
    return `${sebut(triliun)} triliun${sisa ? ` ${sebut(sisa)}` : ""}`;
  };

  const text = sebut(angka).replace(/\s+/g, " ").trim();
  return n < 0 ? `minus ${text}` : text;
}

export function BudgetsPage() {
  const { state, actions } = useAppStore();
  const projects = state.projects;

  const [projectId, setProjectId] = useState<string>(() => projects[0]?.id ?? "");
  const [title, setTitle] = useState<string>("RAB");
  const [sections, setSections] = useState<RabSection[]>([]);

  const project = useMemo(() => projects.find((p) => p.id === projectId) ?? null, [projectId, projects]);

  useEffect(() => {
    if (!projectId && projects[0]?.id) setProjectId(projects[0].id);
  }, [projectId, projects]);

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
    if (!projectId) return;
    const nextTitle = next.title ?? title;
    const nextSections = next.sections ?? sections;
    actions.setRab({ projectId, title: nextTitle, sections: nextSections });
  };

  const sectionTotals = useMemo(() => {
    return sections.map((s) => {
      const items = s.items.map((it) => {
        const qty = parseQty(it.qty);
        const unitPrice = parseIdMoney(it.unitPrice);
        const total = qty * unitPrice;
        return { id: it.id, qty, unitPrice, total };
      });
      const subtotal = items.reduce((sum, x) => sum + x.total, 0);
      return { sectionId: s.id, items, subtotal };
    });
  }, [sections]);

  const grandTotal = useMemo(() => sectionTotals.reduce((sum, s) => sum + s.subtotal, 0), [sectionTotals]);

  const fileBaseName = useMemo(() => {
    const parts = [project?.code, title].filter(Boolean).join("_");
    return sanitizeFileName(parts || "RAB");
  }, [project?.code, title]);

  const exportExcelCsv = () => {
    const escapeCsv = (value: unknown) => {
      const s = value === null || value === undefined ? "" : String(value);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const lines: string[] = [];
    lines.push([escapeCsv("RAB"), escapeCsv(title)].join(","));
    lines.push([escapeCsv("Project"), escapeCsv(project ? `${project.code} — ${project.name}` : projectId)].join(","));
    lines.push("");

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
          escapeCsv("SUBTOTAL"),
          escapeCsv(""),
          escapeCsv(""),
          escapeCsv(""),
          escapeCsv(""),
          escapeCsv(formatIdr(subtotal)),
        ].join(","),
      );
      lines.push("");
    });

    lines.push([escapeCsv(""), escapeCsv(""), escapeCsv("GRAND TOTAL"), escapeCsv(""), "", "", "", escapeCsv(formatIdr(grandTotal))].join(","));
    lines.push([escapeCsv("TERBILANG"), escapeCsv(capitalizeFirst(terbilang(grandTotal)) + " rupiah")].join(","));

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

  const exportPdf = () => {
    const buildTableRows = () => {
      const rows: string[] = [];
      sections.forEach((section) => {
        const sectionCalc = sectionTotals.find((s) => s.sectionId === section.id);
        const subtotal = sectionCalc?.subtotal ?? 0;

        rows.push(
          `<tr class="section">
            <td style="font-weight:700">${section.code}</td>
            <td colspan="5" style="font-weight:700">${section.title}</td>
            <td class="right" style="font-weight:700">Rp ${formatIdr(subtotal)}</td>
          </tr>`,
        );

        section.items.forEach((item) => {
          const calc = sectionCalc?.items.find((x) => x.id === item.id);
          const qty = calc?.qty ?? parseQty(item.qty);
          const unitPrice = calc?.unitPrice ?? parseIdMoney(item.unitPrice);
          const total = calc?.total ?? qty * unitPrice;

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
        });

        rows.push(
          `<tr class="subtotal">
            <td></td>
            <td colspan="5" class="right" style="font-weight:700">Subtotal ${section.code}</td>
            <td class="right" style="font-weight:700">Rp ${formatIdr(subtotal)}</td>
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
      .meta { margin-top: 12px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px 8px; vertical-align: top; }
      th { background: #f1f5f9; text-align: left; }
      .right { text-align: right; }
      .section td { background: #e2e8f0; }
      .subtotal td { background: #f8fafc; }
      .footer { margin-top: 12px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; }
      @media print { body { margin: 0; } .noPrint { display: none; } }
    </style>
  </head>
  <body>
    <div class="noPrint" style="display:flex; justify-content:flex-end; margin-bottom:12px;">
      <button onclick="window.print()" style="padding:8px 12px; border-radius:10px; border:1px solid #cbd5e1; background:#fff; cursor:pointer;">Print / Save as PDF</button>
    </div>

    <h1>${title}</h1>
    <div class="row">
      <div class="muted">Project: ${project ? `${project.code} — ${project.name}` : projectId}</div>
      <div class="muted">Grand Total: Rp ${formatIdr(grandTotal)}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:52px">No</th>
          <th style="width:28%">Description</th>
          <th style="width:30%">Spesifikasi</th>
          <th class="right" style="width:80px">Qty</th>
          <th style="width:64px">Unit</th>
          <th class="right" style="width:110px">@Harga</th>
          <th class="right" style="width:120px">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${buildTableRows()}
        <tr>
          <td colspan="6" class="right" style="font-weight:700">GRAND TOTAL</td>
          <td class="right" style="font-weight:700">Rp ${formatIdr(grandTotal)}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div class="muted" style="margin-bottom:6px;">Terbilang</div>
      <div style="font-weight:600;">${capitalizeFirst(terbilang(grandTotal))} rupiah</div>
    </div>
  </body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
  };

  const addSection = () => {
    const nextCode = String.fromCharCode("A".charCodeAt(0) + sections.length);
    const newSection: RabSection = {
      id: createId(),
      code: nextCode,
      title: "PEKERJAAN BARU",
      items: [],
    };
    setSections((prev) => {
      const next = [...prev, newSection];
      commit({ sections: next });
      return next;
    });
  };

  const addItem = (sectionId: string) => {
    setSections((prev) => {
      const next = prev.map((s) => {
        if (s.id !== sectionId) return s;
        const nextNo = String(s.items.length + 1);
        const item: RabItem = {
          id: createId(),
          no: nextNo,
          title: "",
          spec: "",
          qty: "1",
          unit: "unit",
          unitPrice: "0",
        };
        return { ...s, items: [...s.items, item] };
      });
      commit({ sections: next });
      return next;
    });
  };

  const updateSection = (sectionId: string, patch: Partial<RabSection>) => {
    setSections((prev) => {
      const next = prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s));
      commit({ sections: next });
      return next;
    });
  };

  const updateItem = (sectionId: string, itemId: string, patch: Partial<RabItem>) => {
    setSections((prev) => {
      const next = prev.map((s) => {
        if (s.id !== sectionId) return s;
        return { ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) };
      });
      commit({ sections: next });
      return next;
    });
  };

  const removeItem = (sectionId: string, itemId: string) => {
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
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== sectionId);
      commit({ sections: next });
      return next;
    });
  };

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>RAB (Budget)</h2>
          <div className="muted">Template penyusunan RAB seperti tabel BOQ.</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={exportExcelCsv}>
            Export Excel
          </button>
          <button className="btn" type="button" onClick={exportPdf}>
            Export PDF
          </button>
          <div style={{ textAlign: "right" }}>
          <div className="label">Grand Total</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Rp {formatIdr(grandTotal)}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Info</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, marginTop: 10 }}>
          <div style={{ gridColumn: "span 4" }}>
            <div className="label">Project</div>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: "span 8" }}>
            <div className="label">Judul RAB</div>
            <input
              className="input"
              value={title}
              onChange={(e) => {
                const nextTitle = e.target.value;
                setTitle(nextTitle);
                commit({ title: nextTitle });
              }}
            />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <div className="label">Tabel RAB</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Kolom: No, Description, Spesifikasi, Quantity, Unit, Harga, Jumlah.
            </div>
          </div>
          <button className="btn" type="button" onClick={addSection}>
            Tambah Section
          </button>
        </div>

        <div className="table" style={{ marginTop: 12 }}>
          <div
            className="tableRow tableHeader"
            style={{
              gridTemplateColumns: "0.35fr 1.2fr 1.3fr 0.55fr 0.5fr 0.8fr 0.85fr 0.45fr",
            }}
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
                    gridTemplateColumns: "0.35fr 1.2fr 1.3fr 0.55fr 0.5fr 0.8fr 0.85fr 0.45fr",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{section.code}</div>
                  <div style={{ gridColumn: "span 5" }}>
                    <input
                      className="input"
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    />
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700 }}>Rp {formatIdr(subtotal)}</div>
                  <div style={{ textAlign: "right" }}>
                    <button className="btn" type="button" onClick={() => removeSection(section.id)}>
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
                      style={{
                        gridTemplateColumns: "0.35fr 1.2fr 1.3fr 0.55fr 0.5fr 0.8fr 0.85fr 0.45fr",
                      }}
                    >
                      <div>
                        <input
                          className="input"
                          value={item.no}
                          onChange={(e) => updateItem(section.id, item.id, { no: e.target.value })}
                        />
                      </div>
                      <div>
                        <input
                          className="input"
                          value={item.title}
                          onChange={(e) => updateItem(section.id, item.id, { title: e.target.value })}
                        />
                      </div>
                      <div>
                        <input
                          className="input"
                          value={item.spec}
                          onChange={(e) => updateItem(section.id, item.id, { spec: e.target.value })}
                        />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <input
                          className="input"
                          style={{ textAlign: "right" }}
                          value={item.qty}
                          onChange={(e) => updateItem(section.id, item.id, { qty: e.target.value })}
                        />
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          {formatQty(qty)}
                        </div>
                      </div>
                      <div>
                        <select
                          className="input"
                          value={item.unit}
                          onChange={(e) => updateItem(section.id, item.id, { unit: e.target.value as RabUnit })}
                        >
                          <option value="unit">unit</option>
                          <option value="m2">m2</option>
                          <option value="m1">m1</option>
                          <option value="m3">m3</option>
                          <option value="set">set</option>
                          <option value="ls">ls</option>
                        </select>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <input
                          className="input"
                          style={{ textAlign: "right" }}
                          value={item.unitPrice}
                          onChange={(e) => updateItem(section.id, item.id, { unitPrice: e.target.value })}
                        />
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          {formatIdr(unitPrice)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontWeight: 700 }}>Rp {formatIdr(total)}</div>
                      <div style={{ textAlign: "right" }}>
                        <button className="btn" type="button" onClick={() => removeItem(section.id, item.id)}>
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="tableRow" style={{ gridTemplateColumns: "1fr", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Subtotal {section.code}: Rp {formatIdr(subtotal)}
                    </div>
                    <button className="btn primary" type="button" onClick={() => addItem(section.id)}>
                      Tambah Item
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {sections.length === 0 ? (
            <div className="tableRow" style={{ gridTemplateColumns: "1fr" }}>
              <div className="muted">Belum ada section</div>
            </div>
          ) : null}
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div className="label">Terbilang</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>
            {capitalizeFirst(terbilang(grandTotal))} rupiah
          </div>
        </div>
      </div>
    </div>
  );
}
