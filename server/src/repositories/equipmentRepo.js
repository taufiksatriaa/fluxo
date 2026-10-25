import { query, withTransaction } from "../db/pool.js";

function mapEquipmentRow(row) {
  if (!row) return null;
  const assignedDate =
    row.assigned_date instanceof Date
      ? row.assigned_date.toISOString().split("T")[0]
      : row.assigned_date ? String(row.assigned_date) : undefined;

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    status: row.status,
    condition: row.condition,
    currentProjectId: row.current_project_id || undefined,
    projectCode: row.project_code || undefined,
    projectName: row.project_name || undefined,
    assignedTo: row.assigned_to || undefined,
    assignedDate,
    location: row.location,
    serialNo: row.serial_no || undefined,
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEquipmentLogRow(row) {
  if (!row) return null;
  const occurredAt =
    row.occurred_at instanceof Date
      ? row.occurred_at.toISOString().split("T")[0]
      : String(row.occurred_at);

  return {
    id: row.id,
    equipmentId: row.equipment_id,
    equipmentCode: row.equipment_code,
    equipmentName: row.equipment_name,
    action: row.action,
    projectId: row.project_id || undefined,
    projectCode: row.project_code || undefined,
    projectName: row.project_name || undefined,
    pic: row.pic || undefined,
    note: row.note || "",
    previousCondition: row.previous_condition || undefined,
    newCondition: row.new_condition || undefined,
    occurredAt,
    createdAt: row.created_at,
  };
}

export const equipmentRepo = {
  async findAll() {
    const res = await query(
      `SELECT 
        e.id, e.code, e.name, e.category, e.status, e.condition,
        e.current_project_id, e.assigned_to, e.assigned_date,
        e.location, e.serial_no, e.notes, e.created_at, e.updated_at,
        p.code AS project_code, p.name AS project_name
       FROM equipments e
       LEFT JOIN projects p ON p.id = e.current_project_id
       ORDER BY e.code ASC`
    );
    return res.rows.map(mapEquipmentRow);
  },

  async findById(id) {
    const res = await query(
      `SELECT 
        e.id, e.code, e.name, e.category, e.status, e.condition,
        e.current_project_id, e.assigned_to, e.assigned_date,
        e.location, e.serial_no, e.notes, e.created_at, e.updated_at,
        p.code AS project_code, p.name AS project_name
       FROM equipments e
       LEFT JOIN projects p ON p.id = e.current_project_id
       WHERE e.id = $1`,
      [id]
    );
    return mapEquipmentRow(res.rows[0]);
  },

  async createEquipment({
    code,
    name,
    category = "Alat Berat",
    serialNo = "",
    condition = "BAIK",
    status = "TERSEDIA",
    location = "Pool Pusat",
    notes = "",
  }) {
    const res = await query(
      `INSERT INTO equipments (
        code, name, category, serial_no, condition, status, location, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, code, name, category, serial_no, condition, status, 
                current_project_id, assigned_to, assigned_date, location, notes, created_at, updated_at`,
      [code, name, category, serialNo, condition, status, location, notes]
    );
    return mapEquipmentRow(res.rows[0]);
  },

  async updateEquipment(id, updates = {}) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = {
      name: "name",
      category: "category",
      serialNo: "serial_no",
      condition: "condition",
      status: "status",
      location: "location",
      notes: "notes",
      currentProjectId: "current_project_id",
      assignedTo: "assigned_to",
      assignedDate: "assigned_date",
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
      `UPDATE equipments
       SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING id, code, name, category, serial_no, condition, status, 
                 current_project_id, assigned_to, assigned_date, location, notes, created_at, updated_at`,
      values
    );
    return mapEquipmentRow(res.rows[0]);
  },

  async getLogs({ equipmentId, projectId } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (equipmentId) {
      conditions.push(`l.equipment_id = $${idx++}`);
      values.push(equipmentId);
    }
    if (projectId) {
      conditions.push(`l.project_id = $${idx++}`);
      values.push(projectId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        l.id, l.equipment_id, l.project_id, l.action, l.previous_condition,
        l.new_condition, l.pic, l.note, l.occurred_at, l.created_at,
        e.code AS equipment_code, e.name AS equipment_name,
        p.code AS project_code, p.name AS project_name
      FROM equipment_logs l
      JOIN equipments e ON e.id = l.equipment_id
      LEFT JOIN projects p ON p.id = l.project_id
      ${whereClause}
      ORDER BY l.occurred_at DESC, l.created_at DESC
    `;

    const res = await query(sql, values);
    return res.rows.map(mapEquipmentLogRow);
  },

  async assignProject({ equipmentId, projectId, assignedTo = "", note = "", occurredAt, createdBy = null }) {
    return await withTransaction(async (client) => {
      const eqRes = await client.query(
        "SELECT id, status, condition, name FROM equipments WHERE id = $1 FOR UPDATE",
        [equipmentId]
      );

      if (eqRes.rows.length === 0) {
        throw new Error("Peralatan tidak ditemukan");
      }

      const eq = eqRes.rows[0];
      if (eq.status === "PERBAIKAN" || eq.condition === "RUSAK") {
        throw new Error(`Alat "${eq.name}" sedang dalam perbaikan dan tidak dapat ditugaskan`);
      }

      // Update equipment status
      await client.query(
        `UPDATE equipments
         SET status = 'DIPAKAI', current_project_id = $1, assigned_to = $2, assigned_date = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [projectId, assignedTo, occurredAt, equipmentId]
      );

      // Insert log
      await client.query(
        `INSERT INTO equipment_logs (
          equipment_id, project_id, action, pic, note, occurred_at, created_by
        )
        VALUES ($1, $2, 'ASSIGN', $3, $4, $5, $6)`,
        [equipmentId, projectId, assignedTo, note, occurredAt, createdBy]
      );

      const full = await client.query(
        `SELECT 
          e.id, e.code, e.name, e.category, e.status, e.condition,
          e.current_project_id, e.assigned_to, e.assigned_date,
          e.location, e.serial_no, e.notes, e.created_at, e.updated_at,
          p.code AS project_code, p.name AS project_name
         FROM equipments e
         LEFT JOIN projects p ON p.id = e.current_project_id
         WHERE e.id = $1`,
        [equipmentId]
      );
      return mapEquipmentRow(full.rows[0]);
    });
  },

  async returnEquipment({ equipmentId, condition = "BAIK", note = "", occurredAt, createdBy = null }) {
    return await withTransaction(async (client) => {
      const eqRes = await client.query(
        "SELECT id, condition, current_project_id, assigned_to FROM equipments WHERE id = $1 FOR UPDATE",
        [equipmentId]
      );

      if (eqRes.rows.length === 0) {
        throw new Error("Peralatan tidak ditemukan");
      }

      const eq = eqRes.rows[0];
      const previousCondition = eq.condition;
      const nextStatus = condition === "BAIK" ? "TERSEDIA" : "PERBAIKAN";

      await client.query(
        `UPDATE equipments
         SET status = $1, condition = $2, current_project_id = NULL, assigned_to = NULL, assigned_date = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [nextStatus, condition, equipmentId]
      );

      await client.query(
        `INSERT INTO equipment_logs (
          equipment_id, project_id, action, previous_condition, new_condition, pic, note, occurred_at, created_by
        )
        VALUES ($1, $2, 'RETURN', $3, $4, $5, $6, $7, $8)`,
        [
          equipmentId,
          eq.current_project_id,
          previousCondition,
          condition,
          eq.assigned_to,
          note,
          occurredAt,
          createdBy,
        ]
      );

      const full = await client.query(
        `SELECT 
          e.id, e.code, e.name, e.category, e.status, e.condition,
          e.current_project_id, e.assigned_to, e.assigned_date,
          e.location, e.serial_no, e.notes, e.created_at, e.updated_at,
          p.code AS project_code, p.name AS project_name
         FROM equipments e
         LEFT JOIN projects p ON p.id = e.current_project_id
         WHERE e.id = $1`,
        [equipmentId]
      );
      return mapEquipmentRow(full.rows[0]);
    });
  },
};
