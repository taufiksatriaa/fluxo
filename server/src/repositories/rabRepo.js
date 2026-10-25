import { query, withTransaction } from "../db/pool.js";

export const rabRepo = {
  async findByProjectId(projectId) {
    const rabRes = await query(
      "SELECT id, project_id, title, version, created_at, updated_at FROM rabs WHERE project_id = $1",
      [projectId]
    );

    if (rabRes.rows.length === 0) {
      return null;
    }

    const rabRow = rabRes.rows[0];
    const sectionsRes = await query(
      "SELECT id, code, title, sort_order FROM rab_sections WHERE rab_id = $1 ORDER BY sort_order ASC",
      [rabRow.id]
    );

    const sectionIds = sectionsRes.rows.map((s) => s.id);
    let itemsBySection = new Map();

    if (sectionIds.length > 0) {
      const itemsRes = await query(
        `SELECT id, section_id, item_no, title, spec, qty, unit, unit_price, sort_order
         FROM rab_items
         WHERE section_id = ANY($1)
         ORDER BY sort_order ASC`,
        [sectionIds]
      );

      for (const item of itemsRes.rows) {
        if (!itemsBySection.has(item.section_id)) {
          itemsBySection.set(item.section_id, []);
        }
        itemsBySection.get(item.section_id).push({
          id: item.id,
          no: item.item_no,
          title: item.title,
          spec: item.spec || "",
          qty: String(item.qty),
          unit: item.unit,
          unitPrice: String(item.unit_price),
        });
      }
    }

    const sections = sectionsRes.rows.map((s) => ({
      id: s.id,
      code: s.code,
      title: s.title,
      items: itemsBySection.get(s.id) || [],
    }));

    return {
      id: rabRow.id,
      projectId: rabRow.project_id,
      title: rabRow.title,
      version: rabRow.version,
      sections,
      updatedAt: rabRow.updated_at,
    };
  },

  async saveRabDoc({ projectId, title, sections = [] }) {
    return await withTransaction(async (client) => {
      // 1. Upsert rab record
      const rabRes = await client.query(
        `INSERT INTO rabs (project_id, title, version)
         VALUES ($1, $2, 1)
         ON CONFLICT (project_id) 
         DO UPDATE SET 
            title = EXCLUDED.title,
            version = rabs.version + 1,
            updated_at = CURRENT_TIMESTAMP
         RETURNING id, project_id, title, version, updated_at`,
        [projectId, title]
      );

      const rabId = rabRes.rows[0].id;

      // 2. Clear old sections (CASCADE removes items)
      await client.query("DELETE FROM rab_sections WHERE rab_id = $1", [rabId]);

      // 3. Insert new sections and items
      let totalBudget = 0;

      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const sec = sections[sIdx];
        const secRes = await client.query(
          `INSERT INTO rab_sections (rab_id, code, title, sort_order)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [rabId, sec.code, sec.title, sIdx + 1]
        );
        const sectionId = secRes.rows[0].id;

        for (let iIdx = 0; iIdx < (sec.items || []).length; iIdx++) {
          const item = sec.items[iIdx];
          const qty = Number(item.qty) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          totalBudget += qty * unitPrice;

          await client.query(
            `INSERT INTO rab_items (section_id, item_no, title, spec, qty, unit, unit_price, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              sectionId,
              item.no || `${sIdx + 1}.${iIdx + 1}`,
              item.title,
              item.spec || "",
              qty,
              item.unit || "ls",
              unitPrice,
              iIdx + 1,
            ]
          );
        }
      }

      // 4. Update project's budget_plan_total
      await client.query(
        `UPDATE projects 
         SET budget_plan_total = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [totalBudget, projectId]
      );

      return {
        id: rabId,
        projectId,
        title,
        totalBudget,
        sectionCount: sections.length,
      };
    });
  },
};
