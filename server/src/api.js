import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { userRepo } from "./repositories/userRepo.js";
import { projectRepo } from "./repositories/projectRepo.js";
import { categoryRepo } from "./repositories/categoryRepo.js";
import { rabRepo } from "./repositories/rabRepo.js";
import { transactionRepo } from "./repositories/transactionRepo.js";
import { employeeRepo } from "./repositories/employeeRepo.js";
import { wageRepo } from "./repositories/wageRepo.js";
import { inventoryRepo } from "./repositories/inventoryRepo.js";
import { equipmentRepo } from "./repositories/equipmentRepo.js";
import { reportRepo } from "./repositories/reportRepo.js";

const transactionTypeEnum = z.enum(["IN", "OUT"]);
const transactionGroupEnum = z.enum(["MATERIAL", "UPAH", "OPERASIONAL", "OTHER"]);

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

  const authRequired = async (req, res, next) => {
    const token = getBearerToken(req);
    if (!token) {
      fail(res, 401, "UNAUTHORIZED", "Token autentikasi tidak ditemukan");
      return;
    }
    try {
      const payload = verifyToken(token, jwtSecret);
      const user = await userRepo.findById(payload.sub);
      if (!user) {
        fail(res, 401, "UNAUTHORIZED", "Pengguna tidak ditemukan");
        return;
      }
      req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
      next();
    } catch {
      fail(res, 401, "UNAUTHORIZED", "Sesi kedaluwarsa atau token tidak valid");
    }
  };

  const requireRole = (roles) => (req, res, next) => {
    if (!req.user) {
      fail(res, 401, "UNAUTHORIZED", "Harap login terlebih dahulu");
      return;
    }
    if (!roles.includes(req.user.role)) {
      fail(res, 403, "FORBIDDEN", "Anda tidak memiliki hak akses untuk aksi ini");
      return;
    }
    next();
  };

  // ==================== HEALTH & ME ====================
  router.get("/health", (_req, res) => ok(res, { ok: true, timestamp: new Date().toISOString() }));

  router.get("/me", authRequired, (req, res) => {
    ok(res, { user: req.user });
  });

  // ==================== AUTH ====================
  const registerSchema = z.object({
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    name: z.string().min(1, "Nama wajib diisi"),
    role: z.enum(["ADMIN", "FINANCE", "VIEWER"]).optional(),
  });

  router.post("/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data tidak valid", parsed.error.flatten());
        return;
      }

      const existing = await userRepo.findByEmail(parsed.data.email);
      if (existing) {
        fail(res, 409, "CONFLICT", "Email sudah terdaftar");
        return;
      }

      const totalUsers = await userRepo.count();
      const role = parsed.data.role || (totalUsers === 0 ? "ADMIN" : "VIEWER");
      const passwordHash = await bcrypt.hash(parsed.data.password, 10);

      const user = await userRepo.create({
        email: parsed.data.email,
        passwordHash,
        name: parsed.data.name,
        role,
      });

      const accessToken = signToken({ id: user.id, email: user.email, role: user.role }, jwtSecret);
      ok(res, { accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } }, 201);
    } catch (err) {
      console.error("[Auth Register Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mendaftarkan pengguna");
    }
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  router.post("/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Email dan password wajib diisi");
        return;
      }

      const user = await userRepo.findByEmail(parsed.data.email);
      if (!user) {
        fail(res, 401, "INVALID_CREDENTIALS", "Email atau kata sandi tidak sesuai");
        return;
      }

      const okPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!okPassword) {
        fail(res, 401, "INVALID_CREDENTIALS", "Email atau kata sandi tidak sesuai");
        return;
      }

      const accessToken = signToken({ id: user.id, email: user.email, role: user.role }, jwtSecret);
      ok(res, {
        accessToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      console.error("[Auth Login Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal memproses autentikasi");
    }
  });

  // ==================== PROJECTS ====================
  const projectCreateSchema = z.object({
    code: z.string().min(1, "Kode proyek wajib diisi"),
    name: z.string().min(1, "Nama proyek wajib diisi"),
    description: z.string().optional(),
    owner: z.string().min(1, "Pemilik/Klien proyek wajib diisi"),
    startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
    endDate: z.string().min(1, "Tanggal selesai wajib diisi"),
    status: z.enum(["PLANNING", "RUNNING", "DONE", "ON_HOLD"]).optional(),
    progressPct: z.coerce.number().min(0).max(100).optional(),
    budgetPlanTotal: z.coerce.number().nonnegative().optional(),
  });

  router.get("/projects", authRequired, async (_req, res) => {
    try {
      const projects = await projectRepo.findAll();
      ok(res, { projects });
    } catch (err) {
      console.error("[Projects GetAll Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil daftar proyek");
    }
  });

  router.get("/projects/:id", authRequired, async (req, res) => {
    try {
      const project = await projectRepo.findById(req.params.id);
      if (!project) {
        fail(res, 404, "NOT_FOUND", "Proyek tidak ditemukan");
        return;
      }
      ok(res, { project });
    } catch (err) {
      console.error("[Projects GetById Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil data proyek");
    }
  });

  router.post("/projects", authRequired, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const parsed = projectCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data proyek tidak valid", parsed.error.flatten());
        return;
      }

      const existing = await projectRepo.findByCode(parsed.data.code);
      if (existing) {
        fail(res, 409, "CONFLICT", `Kode proyek "${parsed.data.code}" sudah digunakan`);
        return;
      }

      const project = await projectRepo.create({
        ...parsed.data,
        createdBy: req.user.id,
      });

      ok(res, { project }, 201);
    } catch (err) {
      console.error("[Projects Create Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal membuat proyek baru");
    }
  });

  router.patch("/projects/:id", authRequired, requireRole(["ADMIN", "FINANCE"]), async (req, res) => {
    try {
      const updated = await projectRepo.update(req.params.id, req.body);
      if (!updated) {
        fail(res, 404, "NOT_FOUND", "Proyek tidak ditemukan");
        return;
      }
      ok(res, { project: updated });
    } catch (err) {
      console.error("[Projects Update Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal memperbarui proyek");
    }
  });

  // ==================== CATEGORIES ====================
  const categoryCreateSchema = z.object({
    name: z.string().min(1, "Nama kategori wajib diisi"),
    type: transactionTypeEnum,
  });

  router.get("/categories", authRequired, async (req, res) => {
    try {
      const type = req.query.type ? transactionTypeEnum.safeParse(req.query.type).data : undefined;
      const categories = await categoryRepo.findAll(type);
      ok(res, { categories });
    } catch (err) {
      console.error("[Categories GetAll Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil daftar kategori");
    }
  });

  router.post("/categories", authRequired, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const parsed = categoryCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data kategori tidak valid", parsed.error.flatten());
        return;
      }

      const category = await categoryRepo.create(parsed.data);
      ok(res, { category }, 201);
    } catch (err) {
      console.error("[Categories Create Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal menambahkan kategori");
    }
  });

  // ==================== TRANSACTIONS ====================
  const transactionCreateSchema = z.object({
    projectId: z.string().uuid("ID Proyek tidak valid"),
    categoryId: z.string().uuid("ID Kategori tidak valid"),
    group: transactionGroupEnum.optional(),
    type: transactionTypeEnum,
    amount: z.coerce.number().positive("Nominal harus lebih dari 0"),
    occurredAt: z.string().min(1, "Tanggal transaksi wajib diisi"),
    description: z.string().min(1, "Keterangan transaksi wajib diisi"),
    rabRef: z
      .object({
        sectionId: z.string(),
        itemId: z.string(),
      })
      .optional(),
    attachments: z
      .array(
        z.object({
          name: z.string(),
          mimeType: z.string(),
          size: z.number(),
          url: z.string(),
        })
      )
      .optional(),
  });

  router.get("/transactions", authRequired, async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
      const approvalStatus = typeof req.query.status === "string" ? req.query.status : undefined;
      const type = typeof req.query.type === "string" ? req.query.type : undefined;

      const transactions = await transactionRepo.findAll({ projectId, approvalStatus, type });
      ok(res, { transactions });
    } catch (err) {
      console.error("[Transactions GetAll Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil transaksi");
    }
  });

  router.get("/transactions/:id", authRequired, async (req, res) => {
    try {
      const tx = await transactionRepo.findById(req.params.id);
      if (!tx) {
        fail(res, 404, "NOT_FOUND", "Transaksi tidak ditemukan");
        return;
      }
      ok(res, { transaction: tx });
    } catch (err) {
      console.error("[Transactions GetById Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil detail transaksi");
    }
  });

  router.post("/transactions", authRequired, async (req, res) => {
    try {
      const parsed = transactionCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data transaksi tidak valid", parsed.error.flatten());
        return;
      }

      const project = await projectRepo.findById(parsed.data.projectId);
      if (!project) {
        fail(res, 404, "NOT_FOUND", "Proyek tidak ditemukan");
        return;
      }

      const category = await categoryRepo.findById(parsed.data.categoryId);
      if (!category) {
        fail(res, 404, "NOT_FOUND", "Kategori tidak ditemukan");
        return;
      }

      if (category.type !== parsed.data.type) {
        fail(res, 400, "INVALID_INPUT", "Tipe transaksi harus sama dengan jenis kategori");
        return;
      }

      const transaction = await transactionRepo.create({
        ...parsed.data,
        createdBy: req.user.id,
      });

      ok(res, { transaction }, 201);
    } catch (err) {
      console.error("[Transactions Create Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mencatat transaksi");
    }
  });

  // ==================== APPROVALS ====================
  router.get("/approvals/pending", authRequired, requireRole(["ADMIN"]), async (_req, res) => {
    try {
      const pending = await transactionRepo.findAll({ approvalStatus: "PENDING", type: "OUT" });
      ok(res, { transactions: pending });
    } catch (err) {
      console.error("[Approvals Pending Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil daftar antrean persetujuan");
    }
  });

  const approvalActSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().optional(),
  });

  router.post("/approvals/:transactionId", authRequired, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const parsed = approvalActSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data persetujuan tidak valid", parsed.error.flatten());
        return;
      }

      const tx = await transactionRepo.findById(req.params.transactionId);
      if (!tx) {
        fail(res, 404, "NOT_FOUND", "Transaksi tidak ditemukan");
        return;
      }

      if (tx.approvalStatus !== "PENDING") {
        fail(res, 409, "CONFLICT", `Transaksi sudah berstatus ${tx.approvalStatus}`);
        return;
      }

      const updated = await transactionRepo.updateApprovalStatus(
        req.params.transactionId,
        parsed.data.status,
        parsed.data.note,
        req.user.id
      );

      ok(res, { transaction: updated });
    } catch (err) {
      console.error("[Approvals Process Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal memproses persetujuan transaksi");
    }
  });

  // ==================== RAB (BUDGETS) ====================
  router.get("/rab/:projectId", authRequired, async (req, res) => {
    try {
      const rabDoc = await rabRepo.findByProjectId(req.params.projectId);
      if (!rabDoc) {
        fail(res, 404, "NOT_FOUND", "RAB belum disusun untuk proyek ini");
        return;
      }
      ok(res, { rab: rabDoc });
    } catch (err) {
      console.error("[RAB Get Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal memuat dokumen RAB");
    }
  });

  const saveRabSchema = z.object({
    title: z.string().min(1, "Judul RAB wajib diisi"),
    sections: z.array(
      z.object({
        code: z.string(),
        title: z.string(),
        items: z.array(
          z.object({
            no: z.string().optional(),
            title: z.string(),
            spec: z.string().optional(),
            qty: z.coerce.string(),
            unit: z.string(),
            unitPrice: z.coerce.string(),
          })
        ),
      })
    ),
  });

  router.put("/rab/:projectId", authRequired, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const parsed = saveRabSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Format RAB tidak valid", parsed.error.flatten());
        return;
      }

      const result = await rabRepo.saveRabDoc({
        projectId: req.params.projectId,
        title: parsed.data.title,
        sections: parsed.data.sections,
      });

      ok(res, { rab: result });
    } catch (err) {
      console.error("[RAB Save Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal menyimpan dokumen RAB");
    }
  });

  // Legacy budgets alias for backwards compatibility
  router.get("/budgets", authRequired, async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
      if (projectId) {
        const doc = await rabRepo.findByProjectId(projectId);
        ok(res, { budgets: doc ? [doc] : [] });
      } else {
        const bva = await reportRepo.getBudgetVsActual();
        ok(res, { budgets: bva });
      }
    } catch (err) {
      console.error("[Budgets Legacy Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal memuat anggaran");
    }
  });

  // ==================== EMPLOYEES (SDM) ====================
  const employeeCreateSchema = z.object({
    name: z.string().min(1, "Nama tenaga kerja wajib diisi"),
    roleTitle: z.string().min(1, "Jabatan / keahlian wajib diisi"),
    defaultDailyRate: z.coerce.number().nonnegative(),
    active: z.boolean().optional(),
  });

  router.get("/employees", authRequired, async (req, res) => {
    try {
      const activeOnly = req.query.active === "true";
      const employees = await employeeRepo.findAll(activeOnly);
      ok(res, { employees });
    } catch (err) {
      console.error("[Employees GetAll Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil daftar tenaga kerja");
    }
  });

  router.post("/employees", authRequired, requireRole(["ADMIN", "FINANCE"]), async (req, res) => {
    try {
      const parsed = employeeCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data pegawai tidak valid", parsed.error.flatten());
        return;
      }
      const employee = await employeeRepo.create(parsed.data);
      ok(res, { employee }, 201);
    } catch (err) {
      console.error("[Employees Create Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal menambahkan pegawai");
    }
  });

  router.patch("/employees/:id", authRequired, requireRole(["ADMIN", "FINANCE"]), async (req, res) => {
    try {
      const updated = await employeeRepo.update(req.params.id, req.body);
      if (!updated) {
        fail(res, 404, "NOT_FOUND", "Pegawai tidak ditemukan");
        return;
      }
      ok(res, { employee: updated });
    } catch (err) {
      console.error("[Employees Update Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal memperbarui pegawai");
    }
  });

  // ==================== WAGE PAYMENTS ====================
  const wageCreateSchema = z.object({
    projectId: z.string().uuid(),
    employeeId: z.string().uuid(),
    occurredAt: z.string().min(1),
    days: z.coerce.number().positive("Hari kerja harus lebih dari 0"),
    dailyRate: z.coerce.number().nonnegative(),
    note: z.string().optional(),
    rabRef: z
      .object({
        sectionId: z.string(),
        itemId: z.string(),
      })
      .optional(),
  });

  router.get("/wages", authRequired, async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
      const employeeId = typeof req.query.employeeId === "string" ? req.query.employeeId : undefined;
      const wages = await wageRepo.findAll({ projectId, employeeId });
      ok(res, { wages });
    } catch (err) {
      console.error("[Wages GetAll Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil data upah");
    }
  });

  router.post("/wages", authRequired, requireRole(["ADMIN", "FINANCE"]), async (req, res) => {
    try {
      const parsed = wageCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data pembayaran upah tidak valid", parsed.error.flatten());
        return;
      }

      const wage = await wageRepo.create({
        ...parsed.data,
        createdBy: req.user.id,
      });

      ok(res, { wage }, 201);
    } catch (err) {
      console.error("[Wages Create Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mencatat upah tenaga kerja");
    }
  });

  // ==================== INVENTORY & LOGISTICS ====================
  const itemCreateSchema = z.object({
    code: z.string().min(1, "Kode barang wajib diisi"),
    name: z.string().min(1, "Nama barang wajib diisi"),
    category: z.string().default("Material"),
    unit: z.string().min(1, "Satuan wajib diisi"),
    minStock: z.coerce.number().nonnegative().default(0),
    currentStock: z.coerce.number().default(0),
    unitPrice: z.coerce.number().nonnegative().default(0),
    location: z.string().default("Gudang Utama"),
    notes: z.string().optional(),
  });

  router.get("/inventory", authRequired, async (_req, res) => {
    try {
      const items = await inventoryRepo.findAll();
      ok(res, { items });
    } catch (err) {
      console.error("[Inventory GetAll Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil data inventaris");
    }
  });

  router.post("/inventory", authRequired, requireRole(["ADMIN", "FINANCE"]), async (req, res) => {
    try {
      const parsed = itemCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data barang tidak valid", parsed.error.flatten());
        return;
      }
      const item = await inventoryRepo.createItem(parsed.data);
      ok(res, { item }, 201);
    } catch (err) {
      console.error("[Inventory Create Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal menambahkan item inventaris");
    }
  });

  router.patch("/inventory/:id", authRequired, requireRole(["ADMIN", "FINANCE"]), async (req, res) => {
    try {
      const updated = await inventoryRepo.updateItem(req.params.id, req.body);
      if (!updated) {
        fail(res, 404, "NOT_FOUND", "Item inventaris tidak ditemukan");
        return;
      }
      ok(res, { item: updated });
    } catch (err) {
      console.error("[Inventory Update Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal memperbarui item inventaris");
    }
  });

  router.get("/inventory/movements", authRequired, async (req, res) => {
    try {
      const itemId = typeof req.query.itemId === "string" ? req.query.itemId : undefined;
      const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
      const movements = await inventoryRepo.getMovements({ itemId, projectId });
      ok(res, { movements });
    } catch (err) {
      console.error("[Inventory Movements Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil riwayat mutasi stok");
    }
  });

  const movementCreateSchema = z.object({
    itemId: z.string().uuid("ID Barang tidak valid"),
    projectId: z.string().uuid("ID Proyek tidak valid").optional(),
    type: z.enum(["IN", "OUT"]),
    qty: z.coerce.number().positive("Jumlah mutasi harus lebih besar dari 0"),
    notes: z.string().optional(),
    occurredAt: z.string().min(1, "Tanggal mutasi wajib diisi"),
  });

  router.post("/inventory/movements", authRequired, requireRole(["ADMIN", "FINANCE"]), async (req, res) => {
    try {
      const parsed = movementCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data mutasi stok tidak valid", parsed.error.flatten());
        return;
      }

      const movement = await inventoryRepo.recordMovement({
        ...parsed.data,
        createdBy: req.user.id,
      });

      ok(res, { movement }, 201);
    } catch (err) {
      console.error("[Inventory Movement Error]", err.message);
      fail(res, 400, "MUTATION_ERROR", err.message);
    }
  });

  // ==================== EQUIPMENTS ====================
  const equipmentCreateSchema = z.object({
    code: z.string().min(1, "Kode alat wajib diisi"),
    name: z.string().min(1, "Nama alat wajib diisi"),
    category: z.string().default("Alat Berat"),
    serialNo: z.string().optional(),
    condition: z.enum(["BAIK", "PERLU_SERVIS", "RUSAK"]).default("BAIK"),
    status: z.enum(["TERSEDIA", "DIPAKAI", "PERBAIKAN", "RUSAK"]).default("TERSEDIA"),
    location: z.string().default("Pool Pusat"),
    notes: z.string().optional(),
  });

  router.get("/equipments", authRequired, async (_req, res) => {
    try {
      const equipments = await equipmentRepo.findAll();
      ok(res, { equipments });
    } catch (err) {
      console.error("[Equipment GetAll Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil daftar alat & armada");
    }
  });

  router.post("/equipments", authRequired, requireRole(["ADMIN"]), async (req, res) => {
    try {
      const parsed = equipmentCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data alat tidak valid", parsed.error.flatten());
        return;
      }
      const equipment = await equipmentRepo.createEquipment(parsed.data);
      ok(res, { equipment }, 201);
    } catch (err) {
      console.error("[Equipment Create Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mendaftarkan alat");
    }
  });

  router.patch("/equipments/:id", authRequired, requireRole(["ADMIN", "FINANCE"]), async (req, res) => {
    try {
      const updated = await equipmentRepo.updateEquipment(req.params.id, req.body);
      if (!updated) {
        fail(res, 404, "NOT_FOUND", "Alat tidak ditemukan");
        return;
      }
      ok(res, { equipment: updated });
    } catch (err) {
      console.error("[Equipment Update Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal memperbarui data alat");
    }
  });

  router.get("/equipments/logs", authRequired, async (req, res) => {
    try {
      const equipmentId = typeof req.query.equipmentId === "string" ? req.query.equipmentId : undefined;
      const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
      const logs = await equipmentRepo.getLogs({ equipmentId, projectId });
      ok(res, { logs });
    } catch (err) {
      console.error("[Equipment Logs Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal mengambil riwayat log alat");
    }
  });

  const assignSchema = z.object({
    projectId: z.string().uuid("ID Proyek tidak valid"),
    assignedTo: z.string().optional(),
    note: z.string().optional(),
    occurredAt: z.string().min(1),
  });

  router.post("/equipments/:id/assign", authRequired, requireRole(["ADMIN", "FINANCE"]), async (req, res) => {
    try {
      const parsed = assignSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data penugasan tidak valid", parsed.error.flatten());
        return;
      }

      const equipment = await equipmentRepo.assignProject({
        equipmentId: req.params.id,
        ...parsed.data,
        createdBy: req.user.id,
      });

      ok(res, { equipment });
    } catch (err) {
      console.error("[Equipment Assign Error]", err.message);
      fail(res, 400, "ASSIGN_ERROR", err.message);
    }
  });

  const returnSchema = z.object({
    condition: z.enum(["BAIK", "PERLU_SERVIS", "RUSAK"]).default("BAIK"),
    note: z.string().optional(),
    occurredAt: z.string().min(1),
  });

  router.post("/equipments/:id/return", authRequired, requireRole(["ADMIN", "FINANCE"]), async (req, res) => {
    try {
      const parsed = returnSchema.safeParse(req.body);
      if (!parsed.success) {
        fail(res, 400, "INVALID_INPUT", "Data pengembalian tidak valid", parsed.error.flatten());
        return;
      }

      const equipment = await equipmentRepo.returnEquipment({
        equipmentId: req.params.id,
        ...parsed.data,
        createdBy: req.user.id,
      });

      ok(res, { equipment });
    } catch (err) {
      console.error("[Equipment Return Error]", err.message);
      fail(res, 400, "RETURN_ERROR", err.message);
    }
  });

  // ==================== REPORTS & ANALYTICS ====================
  router.get("/reports/cashflow", authRequired, async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
      const report = await reportRepo.getCashflowSummary(projectId);
      ok(res, report);
    } catch (err) {
      console.error("[Reports Cashflow Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal menyusun laporan arus kas");
    }
  });

  router.get("/reports/budget-vs-actual", authRequired, async (_req, res) => {
    try {
      const comparison = await reportRepo.getBudgetVsActual();
      ok(res, { comparison });
    } catch (err) {
      console.error("[Reports BudgetVsActual Error]", err);
      fail(res, 500, "INTERNAL_ERROR", "Gagal menyusun evaluasi pagu vs realisasi");
    }
  });

  // Catch-all 404 handler for API routes
  router.use((_req, res) => {
    fail(res, 404, "NOT_FOUND", "Endpoint API tidak ditemukan");
  });

  return router;
}
