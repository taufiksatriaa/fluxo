import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

const transactionTypeEnum = z.enum(["IN", "OUT"]);

function ok(res, data, status = 200) {
  res.status(status).json({ ok: true, data });
}

function fail(res, status, code, message, details) {
  res.status(status).json({ ok: false, error: { code, message, details } });
}

function getBearerToken(req) {
  const header = req.header("authorization");
  if (!header) return null;
  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return null;
  return header.slice(prefix.length).trim() || null;
}

function signToken({ id, email, role }, jwtSecret) {
  return jwt.sign({ sub: id, email, role }, jwtSecret, { expiresIn: "12h" });
}

function verifyToken(token, jwtSecret) {
  return jwt.verify(token, jwtSecret);
}

export function buildApiRouter({ jwtSecret }) {
  const router = express.Router();

  const users = new Map();
  const projects = [];
  const categories = [];
  const transactions = [];
  const approvals = [];
  const budgets = [];

  const authRequired = (req, res, next) => {
    const token = getBearerToken(req);
    if (!token) {
      fail(res, 401, "UNAUTHORIZED", "Unauthorized");
      return;
    }
    try {
      const payload = verifyToken(token, jwtSecret);
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
      next();
    } catch {
      fail(res, 401, "UNAUTHORIZED", "Unauthorized");
    }
  };

  const requireRole = (roles) => (req, res, next) => {
    if (!req.user) {
      fail(res, 401, "UNAUTHORIZED", "Unauthorized");
      return;
    }
    if (!roles.includes(req.user.role)) {
      fail(res, 403, "FORBIDDEN", "Forbidden");
      return;
    }
    next();
  };

  router.get("/health", (_req, res) => ok(res, { ok: true }));

  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).optional(),
  });

  router.post("/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "INVALID_INPUT", "Invalid input", parsed.error.flatten());
      return;
    }

    const email = parsed.data.email.toLowerCase();
    if (users.has(email)) {
      fail(res, 409, "CONFLICT", "Email sudah terdaftar");
      return;
    }

    const id = randomUUID();
    const role = users.size === 0 ? "ADMIN" : "REQUESTER";
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = {
      id,
      email,
      name: parsed.data.name ?? null,
      role,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.set(email, user);

    ok(
      res,
      { user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt } },
      201,
    );
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  router.post("/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "INVALID_INPUT", "Invalid input", parsed.error.flatten());
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const user = users.get(email);
    if (!user) {
      fail(res, 401, "INVALID_CREDENTIALS", "Email atau password salah");
      return;
    }

    const okPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!okPassword) {
      fail(res, 401, "INVALID_CREDENTIALS", "Email atau password salah");
      return;
    }

    const accessToken = signToken({ id: user.id, email: user.email, role: user.role }, jwtSecret);
    ok(res, { accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  router.get("/me", authRequired, (req, res) => {
    ok(res, { user: req.user });
  });

  const projectCreateSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
  });

  router.get("/projects", authRequired, (_req, res) => ok(res, { projects }));

  router.post("/projects", authRequired, requireRole(["ADMIN"]), (req, res) => {
    const parsed = projectCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "INVALID_INPUT", "Invalid input", parsed.error.flatten());
      return;
    }

    const existing = projects.find((p) => p.code === parsed.data.code);
    if (existing) {
      fail(res, 409, "CONFLICT", "Kode project sudah dipakai");
      return;
    }

    const project = {
      id: randomUUID(),
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      createdAt: new Date().toISOString(),
      ownerId: req.user.id,
    };
    projects.push(project);
    ok(res, { project }, 201);
  });

  const categoryCreateSchema = z.object({
    name: z.string().min(1),
    type: transactionTypeEnum,
  });

  router.get("/categories", authRequired, (req, res) => {
    const type = req.query.type ? transactionTypeEnum.safeParse(req.query.type).data : undefined;
    const list = type ? categories.filter((c) => c.type === type) : categories;
    ok(res, { categories: list });
  });

  router.post("/categories", authRequired, requireRole(["ADMIN"]), (req, res) => {
    const parsed = categoryCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "INVALID_INPUT", "Invalid input", parsed.error.flatten());
      return;
    }

    const category = {
      id: randomUUID(),
      name: parsed.data.name,
      type: parsed.data.type,
      createdAt: new Date().toISOString(),
    };
    categories.push(category);
    ok(res, { category }, 201);
  });

  const transactionCreateSchema = z.object({
    projectId: z.string().min(1),
    categoryId: z.string().min(1),
    type: transactionTypeEnum,
    amount: z.coerce.number().positive(),
    occurredAt: z.coerce.date(),
    description: z.string().optional(),
  });

  router.get("/transactions", authRequired, (req, res) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const list = projectId ? transactions.filter((t) => t.projectId === projectId) : transactions;
    ok(res, { transactions: list });
  });

  router.post("/transactions", authRequired, (req, res) => {
    const parsed = transactionCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "INVALID_INPUT", "Invalid input", parsed.error.flatten());
      return;
    }

    const project = projects.find((p) => p.id === parsed.data.projectId);
    if (!project) {
      fail(res, 404, "NOT_FOUND", "Project tidak ditemukan");
      return;
    }

    const category = categories.find((c) => c.id === parsed.data.categoryId);
    if (!category) {
      fail(res, 404, "NOT_FOUND", "Kategori tidak ditemukan");
      return;
    }

    if (category.type !== parsed.data.type) {
      fail(res, 400, "INVALID_INPUT", "Tipe transaksi harus sama dengan tipe kategori");
      return;
    }

    const approvalStatus = parsed.data.type === "IN" ? "APPROVED" : "PENDING";

    const transaction = {
      id: randomUUID(),
      projectId: parsed.data.projectId,
      categoryId: parsed.data.categoryId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      occurredAt: parsed.data.occurredAt.toISOString(),
      description: parsed.data.description ?? null,
      approvalStatus,
      createdById: req.user.id,
      createdAt: new Date().toISOString(),
    };
    transactions.push(transaction);

    ok(res, { transaction }, 201);
  });

  router.get("/approvals/pending", authRequired, requireRole(["ADMIN"]), (_req, res) => {
    const pending = transactions.filter((t) => t.type === "OUT" && t.approvalStatus === "PENDING");
    ok(res, { transactions: pending });
  });

  const approvalActSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().optional(),
  });

  router.post("/approvals/:transactionId", authRequired, requireRole(["ADMIN"]), (req, res) => {
    const parsed = approvalActSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "INVALID_INPUT", "Invalid input", parsed.error.flatten());
      return;
    }

    const tx = transactions.find((t) => t.id === req.params.transactionId);
    if (!tx) {
      fail(res, 404, "NOT_FOUND", "Transaksi tidak ditemukan");
      return;
    }

    if (tx.approvalStatus !== "PENDING") {
      fail(res, 409, "CONFLICT", "Transaksi sudah diproses");
      return;
    }

    tx.approvalStatus = parsed.data.status;

    approvals.push({
      id: randomUUID(),
      transactionId: tx.id,
      status: parsed.data.status,
      note: parsed.data.note ?? null,
      actedById: req.user.id,
      actedAt: new Date().toISOString(),
    });

    ok(res, { transaction: tx });
  });

  const budgetCreateSchema = z.object({
    projectId: z.string().min(1),
    title: z.string().min(1),
    items: z
      .array(
        z.object({
          name: z.string().min(1),
          qty: z.coerce.number().positive(),
          unitPrice: z.coerce.number().nonnegative(),
        }),
      )
      .min(1),
  });

  router.get("/budgets", authRequired, (req, res) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const list = projectId ? budgets.filter((b) => b.projectId === projectId) : budgets;
    ok(res, { budgets: list });
  });

  router.post("/budgets", authRequired, requireRole(["ADMIN"]), (req, res) => {
    const parsed = budgetCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      fail(res, 400, "INVALID_INPUT", "Invalid input", parsed.error.flatten());
      return;
    }

    const project = projects.find((p) => p.id === parsed.data.projectId);
    if (!project) {
      fail(res, 404, "NOT_FOUND", "Project tidak ditemukan");
      return;
    }

    const items = parsed.data.items.map((it) => ({
      id: randomUUID(),
      name: it.name,
      qty: it.qty,
      unitPrice: it.unitPrice,
      total: it.qty * it.unitPrice,
    }));

    const budget = {
      id: randomUUID(),
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      version: 1,
      items,
      createdAt: new Date().toISOString(),
    };

    budgets.push(budget);
    ok(res, { budget }, 201);
  });

  router.get("/reports/cashflow", authRequired, (req, res) => {
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const list = projectId ? transactions.filter((t) => t.projectId === projectId) : transactions;

    const totalIn = list
      .filter((t) => t.type === "IN" && t.approvalStatus === "APPROVED")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalOut = list
      .filter((t) => t.type === "OUT" && t.approvalStatus === "APPROVED")
      .reduce((sum, t) => sum + t.amount, 0);

    ok(res, {
      projectId: projectId ?? null,
      totals: { in: totalIn, out: totalOut, net: totalIn - totalOut },
    });
  });

  router.get("/debug/state", authRequired, requireRole(["ADMIN"]), (_req, res) => {
    ok(res, {
      users: Array.from(users.values()).map((u) => ({ id: u.id, email: u.email, role: u.role })),
      projects,
      categories,
      transactions,
      approvals,
      budgets,
    });
  });

  router.use((_req, res) => {
    fail(res, 404, "NOT_FOUND", "Not found");
  });

  return router;
}
