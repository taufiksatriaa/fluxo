import { query } from "../db/pool.js";

function mapProjectRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    owner: row.owner,
    startDate: row.start_date instanceof Date ? row.start_date.toISOString().split("T")[0] : String(row.start_date),
    endDate: row.end_date instanceof Date ? row.end_date.toISOString().split("T")[0] : String(row.end_date),
    status: row.status,
    progressPct: Number(row.progress_pct),
    budgetPlanTotal: Number(row.budget_plan_total),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const projectRepo = {
  async findAll() {
    const res = await query(
      `SELECT id, code, name, description, owner, start_date, end_date, 
              status, progress_pct, budget_plan_total, created_by, created_at, updated_at
       FROM projects
       ORDER BY code ASC`
    );
    return res.rows.map(mapProjectRow);
  },

  async findById(id) {
    const res = await query(
      `SELECT id, code, name, description, owner, start_date, end_date, 
              status, progress_pct, budget_plan_total, created_by, created_at, updated_at
       FROM projects
       WHERE id = $1`,
      [id]
    );
    return mapProjectRow(res.rows[0]);
  },

  async findByCode(code) {
    const res = await query(
      `SELECT id, code, name, description, owner, start_date, end_date, 
              status, progress_pct, budget_plan_total, created_by, created_at, updated_at
       FROM projects
       WHERE code = $1`,
      [code]
    );
    return mapProjectRow(res.rows[0]);
  },

  async create({
    code,
    name,
    description = "",
    owner = "",
    startDate,
    endDate,
    status = "PLANNING",
    progressPct = 0,
    budgetPlanTotal = 0,
    createdBy = null,
  }) {
    const res = await query(
      `INSERT INTO projects (
        code, name, description, owner, start_date, end_date, 
        status, progress_pct, budget_plan_total, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, code, name, description, owner, start_date, end_date, 
                status, progress_pct, budget_plan_total, created_by, created_at, updated_at`,
      [
        code,
        name,
        description,
        owner,
        startDate,
        endDate,
        status,
        progressPct,
        budgetPlanTotal,
        createdBy,
      ]
    );
    return mapProjectRow(res.rows[0]);
  },

  async update(id, updates = {}) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = {
      name: "name",
      description: "description",
      owner: "owner",
      startDate: "start_date",
      endDate: "end_date",
      status: "status",
      progressPct: "progress_pct",
      budgetPlanTotal: "budget_plan_total",
    };

    for (const [key, col] of Object.entries(allowed)) {
      if (updates[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const res = await query(
      `UPDATE projects
       SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING id, code, name, description, owner, start_date, end_date, 
                 status, progress_pct, budget_plan_total, created_by, created_at, updated_at`,
      values
    );
    return mapProjectRow(res.rows[0]);
  },
};
