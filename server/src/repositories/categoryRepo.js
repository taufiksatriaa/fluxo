import { query } from "../db/pool.js";

function mapCategoryRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    createdAt: row.created_at,
  };
}

export const categoryRepo = {
  async findAll(type) {
    if (type) {
      const res = await query(
        "SELECT id, name, type, created_at FROM categories WHERE type = $1 ORDER BY name ASC",
        [type]
      );
      return res.rows.map(mapCategoryRow);
    }
    const res = await query(
      "SELECT id, name, type, created_at FROM categories ORDER BY type ASC, name ASC"
    );
    return res.rows.map(mapCategoryRow);
  },

  async findById(id) {
    const res = await query(
      "SELECT id, name, type, created_at FROM categories WHERE id = $1",
      [id]
    );
    return mapCategoryRow(res.rows[0]);
  },

  async create({ name, type }) {
    const res = await query(
      `INSERT INTO categories (name, type)
       VALUES ($1, $2)
       RETURNING id, name, type, created_at`,
      [name, type]
    );
    return mapCategoryRow(res.rows[0]);
  },
};
