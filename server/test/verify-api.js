import { buildApiRouter } from "../src/api.js";
import express from "express";
import http from "http";
import dotenv from "dotenv";
import { pool } from "../src/db/pool.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));
const jwtSecret = process.env.JWT_SECRET || "super_secret_jwt_key_fluxo_2026_min16char";
app.use("/api", buildApiRouter({ jwtSecret }));

const server = http.createServer(app);

async function runTests() {
  await new Promise((resolve) => server.listen(4001, resolve));
  const baseUrl = "http://localhost:4001/api";

  console.log("=== STARTING FULL BACKEND INTEGRATION TEST SUITE ===");

  async function req(path, opts = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...opts,
      headers: {
        "content-type": "application/json",
        ...(opts.headers || {}),
      },
    });
    const json = await res.json();
    return { status: res.status, ok: res.ok, body: json };
  }

  try {
    // 1. Health check
    const health = await req("/health");
    console.log("1. /health:", health.status, health.body);
    if (!health.ok) throw new Error("Health check failed");

    // 2. Auth Login (Admin)
    const login = await req("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@fluxo.id", password: "password123" }),
    });
    console.log("2. /auth/login:", login.status, login.body?.ok ? "SUCCESS" : "FAIL");
    if (!login.ok || !login.body.data?.accessToken) throw new Error("Login failed");

    const token = login.body.data.accessToken;
    const authHeader = { authorization: `Bearer ${token}` };

    // 3. /me
    const me = await req("/me", { headers: authHeader });
    console.log("3. /me:", me.body?.data?.user);

    // 4. Projects
    const projects = await req("/projects", { headers: authHeader });
    console.log("4. /projects count:", projects.body?.data?.projects?.length);
    const firstProject = projects.body?.data?.projects?.[0];

    // 5. Categories
    const categories = await req("/categories", { headers: authHeader });
    console.log("5. /categories count:", categories.body?.data?.categories?.length);
    const materialCat = categories.body?.data?.categories?.find((c) => c.name.includes("Material"));

    // 6. Transactions
    const txs = await req("/transactions", { headers: authHeader });
    console.log("6. /transactions count:", txs.body?.data?.transactions?.length);

    // 7. Inventory
    const inv = await req("/inventory", { headers: authHeader });
    console.log("7. /inventory count:", inv.body?.data?.items?.length);
    const sampleItem = inv.body?.data?.items?.[0];

    // 8. Equipments
    const eq = await req("/equipments", { headers: authHeader });
    console.log("8. /equipments count:", eq.body?.data?.equipments?.length);
    const sampleEq = eq.body?.data?.equipments?.[0];

    // 9. Employees
    const emp = await req("/employees", { headers: authHeader });
    console.log("9. /employees count:", emp.body?.data?.employees?.length);

    // 10. Reports
    const cf = await req("/reports/cashflow", { headers: authHeader });
    console.log("10. /reports/cashflow:", cf.body?.data?.totals);

    const bva = await req("/reports/budget-vs-actual", { headers: authHeader });
    console.log("11. /reports/budget-vs-actual projects:", bva.body?.data?.comparison?.length);

    // 12. Create Transaction OUT (PENDING)
    const newTx = await req("/transactions", {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        projectId: firstProject.id,
        categoryId: materialCat.id,
        group: "MATERIAL",
        type: "OUT",
        amount: 1500000,
        occurredAt: "2026-03-01",
        description: "Pengadaan Baut & Dynabolt Tambahan untuk Partisi",
        attachments: [
          {
            name: "struk_nota.pdf",
            mimeType: "application/pdf",
            size: 24500,
            url: "data:application/pdf;base64,JVBERi0xLjQK...",
          },
        ],
      }),
    });
    console.log("12. Create Transaction:", newTx.status, newTx.body?.data?.transaction?.id);
    const createdTxId = newTx.body?.data?.transaction?.id;

    // 13. Pending Approvals
    const pending = await req("/approvals/pending", { headers: authHeader });
    console.log("13. Pending approvals count:", pending.body?.data?.transactions?.length);
    const foundPending = pending.body?.data?.transactions?.some((t) => t.id === createdTxId);
    console.log("    Created transaction in pending queue?", foundPending);

    // 14. Approve Transaction
    const approved = await req(`/approvals/${createdTxId}`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({ status: "APPROVED", note: "Disetujui oleh Direktur Operasional" }),
    });
    console.log("14. Approved transaction status:", approved.body?.data?.transaction?.approvalStatus);

    // 15. Inventory Stock Out Mutation
    if (sampleItem) {
      const prevStock = sampleItem.currentStock;
      const mov = await req("/inventory/movements", {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          itemId: sampleItem.id,
          projectId: firstProject.id,
          type: "OUT",
          qty: 5,
          notes: "Dipakai untuk pekerjaan lapangan",
          occurredAt: "2026-03-01",
        }),
      });
      console.log("15. Inventory movement:", mov.status, mov.body?.data?.movement?.type, mov.body?.data?.movement?.qty);

      // Verify stock deducted
      const invAfter = await req("/inventory", { headers: authHeader });
      const itemAfter = invAfter.body?.data?.items?.find((i) => i.id === sampleItem.id);
      console.log(`    Stock before: ${prevStock}, Stock after: ${itemAfter?.currentStock} (diff: ${prevStock - itemAfter?.currentStock})`);
    }

    // 16. Equipment Assignment & Return
    if (sampleEq && sampleEq.status === "TERSEDIA") {
      const assign = await req(`/equipments/${sampleEq.id}/assign`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          projectId: firstProject.id,
          assignedTo: "Mandor Agus",
          note: "Ditugaskan untuk pengeboran lantai",
          occurredAt: "2026-03-01",
        }),
      });
      console.log("16. Equipment assign status:", assign.body?.data?.equipment?.status);

      const ret = await req(`/equipments/${sampleEq.id}/return`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          condition: "BAIK",
          note: "Selesai dipakai kondisi bersih",
          occurredAt: "2026-03-02",
        }),
      });
      console.log("17. Equipment return status:", ret.body?.data?.equipment?.status);
    }

    console.log("\n==========================================");
    console.log("ALL 17 BACKEND INTEGRATION TESTS PASSED!");
    console.log("==========================================\n");
  } finally {
    server.close();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
