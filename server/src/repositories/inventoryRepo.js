import { query, withTransaction } from "../db/pool.js";

function mapItemRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    unit: row.unit,
    currentStock: Number(row.current_stock),
    minStock: Number(row.min_stock),
    unitPrice: Number(row.unit_price),
    location: row.location,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMovementRow(row) {
  if (!row) return null;
  const occurredAt =
    row.occurred_at instanceof Date
      ? row.occurred_at.toISOString().split("T")[0]
      : String(row.occurred_at);

  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    itemCode: row.item_code,
    unit: row.unit,
    type: row.type,
    qty: Number(row.qty),
    projectId: row.project_id || undefined,
    projectCode: row.project_code || undefined,
    projectName: row.project_name || undefined,
    notes: row.notes || "",
    occurredAt,
    createdAt: row.created_at,
  };
}

export const inventoryRepo = {
  async findAll() {
    const res = await query(
      `SELECT id, code, name, category, unit, min_stock, current_stock, 
              unit_price, location, notes, created_at, updated_at
       FROM inventory_items
       ORDER BY category ASC, code ASC`
    );
    return res.rows.map(mapItemRow);
  },

  async findById(id) {
    const res = await query(
      `SELECT id, code, name, category, unit, min_stock, current_stock, 
              unit_price, location, notes, created_at, updated_at
       FROM inventory_items
       WHERE id = $1`,
      [id]
    );
    return mapItemRow(res.rows[0]);
  },

  async createItem({
    code,
    name,
    category = "Material",
    unit,
    minStock = 0,
    currentStock = 0,
    unitPrice = 0,
    location = "Gudang Utama",
    notes = "",
  }) {
    const res = await query(
      `INSERT INTO inventory_items (
        code, name, category, unit, min_stock, current_stock, unit_price, location, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, code, name, category, unit, min_stock, current_stock, 
                unit_price, location, notes, created_at, updated_at`,
      [code, name, category, unit, minStock, currentStock, unitPrice, location, notes]
    );
    return mapItemRow(res.rows[0]);
  },

  async updateItem(id, updates = {}) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = {
      name: "name",
      category: "category",
      unit: "unit",
      minStock: "min_stock",
      currentStock: "current_stock",
      unitPrice: "unit_price",
      location: "location",
      notes: "notes",
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
      `UPDATE inventory_items
       SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING id, code, name, category, unit, min_stock, current_stock, 
                 unit_price, location, notes, created_at, updated_at`,
      values
    );
    return mapItemRow(res.rows[0]);
  },

  async getMovements({ itemId, projectId } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (itemId) {
      conditions.push(`m.item_id = $${idx++}`);
      values.push(itemId);
    }
    if (projectId) {
      conditions.push(`m.project_id = $${idx++}`);
      values.push(projectId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        m.id, m.item_id, m.project_id, m.type, m.qty, m.notes,
        m.occurred_at, m.created_at,
        i.code AS item_code, i.name AS item_name, i.unit,
        p.code AS project_code, p.name AS project_name
      FROM inventory_movements m
      JOIN inventory_items i ON i.id = m.item_id
      LEFT JOIN projects p ON p.id = m.project_id
      ${whereClause}
      ORDER BY m.occurred_at DESC, m.created_at DESC
    `;

    const res = await query(sql, values);
    return res.rows.map(mapMovementRow);
  },

  async recordMovement({ itemId, projectId = null, type, qty, notes = "", occurredAt, createdBy = null }) {
    const numericQty = Number(qty);
    if (!numericQty || numericQty <= 0) {
      throw new Error("Kuantitas mutasi harus lebih besar dari 0");
    }

    return await withTransaction(async (client) => {
      // 1. Lock item row for update to prevent race conditions
      const itemRes = await client.query(
        "SELECT id, current_stock, name FROM inventory_items WHERE id = $1 FOR UPDATE",
        [itemId]
      );

      if (itemRes.rows.length === 0) {
        throw new Error("Item inventaris tidak ditemukan");
      }

      const item = itemRes.rows[0];
      const currentStock = Number(item.current_stock);

      if (type === "OUT" && currentStock < numericQty) {
        throw new Error(
          `Stok "${item.name}" tidak mencukupi (Tersedia: ${currentStock}, Dibutuhkan: ${numericQty})`
        );
      }

      // 2. Insert movement log
      const movRes = await client.query(
        `INSERT INTO inventory_movements (
          item_id, project_id, type, qty, notes, occurred_at, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, item_id, project_id, type, qty, notes, occurred_at, created_at`,
        [itemId, projectId || null, type, numericQty, notes, occurredAt, createdBy]
      );

      // 3. Update stock balance
      const newStock = type === "IN" ? currentStock + numericQty : currentStock - numericQty;

      await client.query(
        `UPDATE inventory_items
         SET current_stock = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [newStock, itemId]
      );

      return mapMovementRow(movRes.rows[0]);
    });
  },
};
