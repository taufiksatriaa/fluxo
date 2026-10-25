import { query } from "../db/pool.js";

/**
 * Map raw SQL row to camelCase user object
 */
function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const userRepo = {
  async findByEmail(email) {
    const res = await query(
      "SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );
    return mapUserRow(res.rows[0]);
  },

  async findById(id) {
    const res = await query(
      "SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE id = $1",
      [id]
    );
    return mapUserRow(res.rows[0]);
  },

  async findAll() {
    const res = await query(
      "SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at ASC"
    );
    return res.rows.map(mapUserRow);
  },

  async count() {
    const res = await query("SELECT COUNT(*)::int AS count FROM users");
    return res.rows[0]?.count ?? 0;
  },

  async create({ email, passwordHash, name, role = "VIEWER" }) {
    const res = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at, updated_at`,
      [email.toLowerCase(), passwordHash, name, role]
    );
    return mapUserRow(res.rows[0]);
  },
};
