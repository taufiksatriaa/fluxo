import { query } from "../db/pool.js";

function mapEmployeeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    roleTitle: row.role_title,
    defaultDailyRate: Number(row.default_daily_rate),
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const employeeRepo = {
  async findAll(activeOnly = false) {
    const sql = activeOnly
      ? "SELECT id, name, role_title, default_daily_rate, active, created_at, updated_at FROM employees WHERE active = TRUE ORDER BY name ASC"
      : "SELECT id, name, role_title, default_daily_rate, active, created_at, updated_at FROM employees ORDER BY name ASC";
    const res = await query(sql);
    return res.rows.map(mapEmployeeRow);
  },

  async findById(id) {
    const res = await query(
      "SELECT id, name, role_title, default_daily_rate, active, created_at, updated_at FROM employees WHERE id = $1",
      [id]
    );
    return mapEmployeeRow(res.rows[0]);
  },

  async create({ name, roleTitle, defaultDailyRate = 0, active = true }) {
    const res = await query(
      `INSERT INTO employees (name, role_title, default_daily_rate, active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, role_title, default_daily_rate, active, created_at, updated_at`,
      [name, roleTitle, defaultDailyRate, active]
    );
    return mapEmployeeRow(res.rows[0]);
  },

  async update(id, updates = {}) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = {
      name: "name",
      roleTitle: "role_title",
      defaultDailyRate: "default_daily_rate",
      active: "active",
    };

    for (const [key, col] of Object.entries(allowed)) {
      if (updates[key] !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const res = await query(
      `UPDATE employees
       SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING id, name, role_title, default_daily_rate, active, created_at, updated_at`,
      values
    );
    return mapEmployeeRow(res.rows[0]);
  },
};
