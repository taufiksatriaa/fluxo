import { query } from "../db/pool.js";

export const reportRepo = {
  async getCashflowSummary(projectId) {
    const params = [];
    let whereClause = "WHERE t.approval_status = 'APPROVED'";

    if (projectId) {
      whereClause += " AND t.project_id = $1";
      params.push(projectId);
    }

    // 1. Overall In, Out, Net
    const totalsRes = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN t.tx_type = 'IN' THEN t.amount ELSE 0 END), 0) AS total_in,
        COALESCE(SUM(CASE WHEN t.tx_type = 'OUT' THEN t.amount ELSE 0 END), 0) AS total_out
       FROM transactions t
       ${whereClause}`,
      params
    );

    const totalIn = Number(totalsRes.rows[0]?.total_in || 0);
    const totalOut = Number(totalsRes.rows[0]?.total_out || 0);
    const net = totalIn - totalOut;

    // 2. Group Breakdown (MATERIAL, UPAH, OPERASIONAL, OTHER)
    const groupsRes = await query(
      `SELECT 
        t.tx_group,
        COALESCE(SUM(t.amount), 0) AS total_amount
       FROM transactions t
       ${whereClause} AND t.tx_type = 'OUT'
       GROUP BY t.tx_group
       ORDER BY total_amount DESC`,
      params
    );

    const groupBreakdown = groupsRes.rows.map((r) => ({
      group: r.tx_group,
      amount: Number(r.total_amount),
    }));

    // 3. Monthly Trend
    const trendRes = await query(
      `SELECT 
        TO_CHAR(t.occurred_at, 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN t.tx_type = 'IN' THEN t.amount ELSE 0 END), 0) AS in_amount,
        COALESCE(SUM(CASE WHEN t.tx_type = 'OUT' THEN t.amount ELSE 0 END), 0) AS out_amount
       FROM transactions t
       ${whereClause}
       GROUP BY TO_CHAR(t.occurred_at, 'YYYY-MM')
       ORDER BY month ASC`,
      params
    );

    const monthlyTrend = trendRes.rows.map((r) => ({
      month: r.month,
      in: Number(r.in_amount),
      out: Number(r.out_amount),
      net: Number(r.in_amount) - Number(r.out_amount),
    }));

    return {
      projectId: projectId || null,
      totals: {
        in: totalIn,
        out: totalOut,
        net,
      },
      groupBreakdown,
      monthlyTrend,
    };
  },

  async getBudgetVsActual() {
    const res = await query(
      `SELECT 
        p.id AS project_id,
        p.code AS project_code,
        p.name AS project_name,
        p.budget_plan_total,
        p.status,
        COALESCE(SUM(t.amount) FILTER (WHERE t.tx_type = 'OUT' AND t.approval_status = 'APPROVED'), 0) AS total_expense
       FROM projects p
       LEFT JOIN transactions t ON t.project_id = p.id
       GROUP BY p.id
       ORDER BY p.code ASC`
    );

    return res.rows.map((r) => {
      const budget = Number(r.budget_plan_total);
      const actual = Number(r.total_expense);
      const variance = budget - actual;
      const pctUsed = budget > 0 ? Math.round((actual / budget) * 100) : 0;

      return {
        projectId: r.project_id,
        code: r.project_code,
        name: r.project_name,
        status: r.status,
        budget,
        actual,
        variance,
        pctUsed,
      };
    });
  },
};
