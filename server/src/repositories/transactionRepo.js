import { query, withTransaction } from "../db/pool.js";

function mapTxRow(row) {
  if (!row) return null;
  const occurredAt =
    row.occurred_at instanceof Date
      ? row.occurred_at.toISOString().split("T")[0]
      : String(row.occurred_at);

  const tx = {
    id: row.id,
    projectId: row.project_id,
    categoryId: row.category_id,
    group: row.tx_group,
    type: row.tx_type,
    amount: Number(row.amount),
    occurredAt,
    description: row.description,
    approvalStatus: row.approval_status,
    rejectionReason: row.rejection_reason || undefined,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdAt: row.created_at,
  };

  if (row.rab_section_id || row.rab_item_id) {
    tx.rabRef = {
      sectionId: row.rab_section_id,
      itemId: row.rab_item_id,
    };
  }

  return tx;
}

export const transactionRepo = {
  async findAll({ projectId, approvalStatus, type } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (projectId) {
      conditions.push(`t.project_id = $${idx++}`);
      values.push(projectId);
    }
    if (approvalStatus) {
      conditions.push(`t.approval_status = $${idx++}`);
      values.push(approvalStatus);
    }
    if (type) {
      conditions.push(`t.tx_type = $${idx++}`);
      values.push(type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        t.id, t.project_id, t.category_id, t.tx_group, t.tx_type, t.amount,
        t.occurred_at, t.description, t.rab_section_id, t.rab_item_id,
        t.approval_status, t.rejection_reason, t.created_by, t.created_at, t.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', a.id,
              'name', a.file_name,
              'mimeType', a.mime_type,
              'size', a.file_size,
              'url', a.data_url
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) AS attachments
      FROM transactions t
      LEFT JOIN transaction_attachments a ON a.transaction_id = t.id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.occurred_at DESC, t.created_at DESC
    `;

    const res = await query(sql, values);
    return res.rows.map(mapTxRow);
  },

  async findById(id) {
    const sql = `
      SELECT 
        t.id, t.project_id, t.category_id, t.tx_group, t.tx_type, t.amount,
        t.occurred_at, t.description, t.rab_section_id, t.rab_item_id,
        t.approval_status, t.rejection_reason, t.created_by, t.created_at, t.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', a.id,
              'name', a.file_name,
              'mimeType', a.mime_type,
              'size', a.file_size,
              'url', a.data_url
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) AS attachments
      FROM transactions t
      LEFT JOIN transaction_attachments a ON a.transaction_id = t.id
      WHERE t.id = $1
      GROUP BY t.id
    `;
    const res = await query(sql, [id]);
    return mapTxRow(res.rows[0]);
  },

  async create({
    projectId,
    categoryId,
    group = "OTHER",
    type,
    amount,
    occurredAt,
    description = "",
    rabRef,
    approvalStatus,
    rejectionReason = null,
    createdBy = null,
    attachments = [],
  }) {
    const resolvedApprovalStatus =
      approvalStatus || (type === "IN" ? "APPROVED" : "PENDING");

    return await withTransaction(async (client) => {
      const txRes = await client.query(
        `INSERT INTO transactions (
          project_id, category_id, tx_group, tx_type, amount,
          occurred_at, description, rab_section_id, rab_item_id,
          approval_status, rejection_reason, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, project_id, category_id, tx_group, tx_type, amount,
                  occurred_at, description, rab_section_id, rab_item_id,
                  approval_status, rejection_reason, created_by, created_at, updated_at`,
        [
          projectId,
          categoryId,
          group,
          type,
          amount,
          occurredAt,
          description,
          rabRef?.sectionId || null,
          rabRef?.itemId || null,
          resolvedApprovalStatus,
          rejectionReason,
          createdBy,
        ]
      );

      const txRow = txRes.rows[0];
      const insertedAttachments = [];

      for (const att of attachments) {
        const attRes = await client.query(
          `INSERT INTO transaction_attachments (
            transaction_id, file_name, mime_type, file_size, data_url
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, file_name, mime_type, file_size, data_url`,
          [
            txRow.id,
            att.name || "lampiran",
            att.mimeType || "application/octet-stream",
            att.size || 0,
            att.url || "",
          ]
        );
        const a = attRes.rows[0];
        insertedAttachments.push({
          id: a.id,
          name: a.file_name,
          mimeType: a.mime_type,
          size: Number(a.file_size),
          url: a.data_url,
        });
      }

      txRow.attachments = insertedAttachments;
      return mapTxRow(txRow);
    });
  },

  async updateApprovalStatus(transactionId, status, note = null, actedBy = null) {
    return await withTransaction(async (client) => {
      const rejectionReason = status === "REJECTED" ? note : null;

      const txRes = await client.query(
        `UPDATE transactions
         SET approval_status = $1, rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, project_id, category_id, tx_group, tx_type, amount,
                   occurred_at, description, rab_section_id, rab_item_id,
                   approval_status, rejection_reason, created_by, created_at, updated_at`,
        [status, rejectionReason, transactionId]
      );

      if (txRes.rows.length === 0) {
        return null;
      }

      if (actedBy) {
        await client.query(
          `INSERT INTO approvals (transaction_id, status, note, acted_by)
           VALUES ($1, $2, $3, $4)`,
          [transactionId, status, note, actedBy]
        );
      }

      // Re-fetch with attachments
      const full = await client.query(
        `SELECT 
          t.id, t.project_id, t.category_id, t.tx_group, t.tx_type, t.amount,
          t.occurred_at, t.description, t.rab_section_id, t.rab_item_id,
          t.approval_status, t.rejection_reason, t.created_by, t.created_at, t.updated_at,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', a.id,
                'name', a.file_name,
                'mimeType', a.mime_type,
                'size', a.file_size,
                'url', a.data_url
              )
            ) FILTER (WHERE a.id IS NOT NULL),
            '[]'
          ) AS attachments
        FROM transactions t
        LEFT JOIN transaction_attachments a ON a.transaction_id = t.id
        WHERE t.id = $1
        GROUP BY t.id`,
        [transactionId]
      );

      return mapTxRow(full.rows[0]);
    });
  },
};
