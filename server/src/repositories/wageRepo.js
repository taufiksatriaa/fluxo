import { query, withTransaction } from "../db/pool.js";

function mapWageRow(row) {
  if (!row) return null;
  const occurredAt =
    row.occurred_at instanceof Date
      ? row.occurred_at.toISOString().split("T")[0]
      : String(row.occurred_at);

  const wage = {
    id: row.id,
    projectId: row.project_id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    roleTitle: row.role_title,
    transactionId: row.transaction_id,
    occurredAt,
    days: Number(row.days),
    dailyRate: Number(row.daily_rate),
    amount: Number(row.amount),
    note: row.note || "",
    createdAt: row.created_at,
  };

  if (row.rab_section_id || row.rab_item_id) {
    wage.rabRef = {
      sectionId: row.rab_section_id,
      itemId: row.rab_item_id,
    };
  }

  return wage;
}

export const wageRepo = {
  async findAll({ projectId, employeeId } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (projectId) {
      conditions.push(`w.project_id = $${idx++}`);
      values.push(projectId);
    }
    if (employeeId) {
      conditions.push(`w.employee_id = $${idx++}`);
      values.push(employeeId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        w.id, w.project_id, w.employee_id, w.transaction_id,
        w.occurred_at, w.days, w.daily_rate, w.amount, w.note,
        w.rab_section_id, w.rab_item_id, w.created_at,
        e.name AS employee_name, e.role_title
      FROM wage_payments w
      JOIN employees e ON e.id = w.employee_id
      ${whereClause}
      ORDER BY w.occurred_at DESC, w.created_at DESC
    `;

    const res = await query(sql, values);
    return res.rows.map(mapWageRow);
  },

  async create({
    projectId,
    employeeId,
    occurredAt,
    days,
    dailyRate,
    note = "",
    rabRef,
    createdBy = null,
  }) {
    const amount = Number(days) * Number(dailyRate);

    return await withTransaction(async (client) => {
      // 1. Get or find default category for Upah
      let catRes = await client.query(
        "SELECT id FROM categories WHERE type = 'OUT' AND name ILIKE '%upah%' LIMIT 1"
      );
      let categoryId = catRes.rows[0]?.id;
      if (!categoryId) {
        catRes = await client.query("SELECT id FROM categories WHERE type = 'OUT' LIMIT 1");
        categoryId = catRes.rows[0]?.id;
      }

      // 2. Fetch employee details for description
      const empRes = await client.query("SELECT name FROM employees WHERE id = $1", [employeeId]);
      const empName = empRes.rows[0]?.name || "Tenaga Kerja";

      // 3. Create cash outflow transaction
      const txRes = await client.query(
        `INSERT INTO transactions (
          project_id, category_id, tx_group, tx_type, amount,
          occurred_at, description, rab_section_id, rab_item_id,
          approval_status, created_by
        )
        VALUES ($1, $2, 'UPAH', 'OUT', $3, $4, $5, $6, $7, 'APPROVED', $8)
        RETURNING id`,
        [
          projectId,
          categoryId,
          amount,
          occurredAt,
          `Upah SDM: ${empName} (${days} hari @ Rp ${dailyRate.toLocaleString("id-ID")}) - ${note}`,
          rabRef?.sectionId || null,
          rabRef?.itemId || null,
          createdBy,
        ]
      );
      const transactionId = txRes.rows[0].id;

      // 4. Create wage payment record
      const wageRes = await client.query(
        `INSERT INTO wage_payments (
          project_id, employee_id, transaction_id, occurred_at,
          days, daily_rate, amount, note, rab_section_id, rab_item_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, project_id, employee_id, transaction_id, occurred_at,
                  days, daily_rate, amount, note, rab_section_id, rab_item_id, created_at`,
        [
          projectId,
          employeeId,
          transactionId,
          occurredAt,
          days,
          dailyRate,
          amount,
          note,
          rabRef?.sectionId || null,
          rabRef?.itemId || null,
        ]
      );

      const row = wageRes.rows[0];
      row.employee_name = empName;
      return mapWageRow(row);
    });
  },
};
