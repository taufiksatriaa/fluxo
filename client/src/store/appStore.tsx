import { createContext, useContext, useEffect, useMemo, useReducer } from "react";

export type ProjectStatus = "PLANNING" | "RUNNING" | "DONE" | "ON_HOLD";
export type TransactionType = "IN" | "OUT";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TransactionGroup = "MATERIAL" | "UPAH" | "OPERASIONAL" | "OTHER";
export type RabUnit = "unit" | "m2" | "m1" | "m3" | "ls" | "set";
export type UserRole = "ADMIN" | "FINANCE" | "VIEWER";

export type User = {
  id: string;
  name: string;
  role: UserRole;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  owner: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  progressPct: number;
  budgetPlanTotal: number;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
};

export type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
};

export type Transaction = {
  id: string;
  projectId: string;
  categoryId: string;
  group: TransactionGroup;
  type: TransactionType;
  amount: number;
  occurredAt: string;
  description: string;
  rabRef?: {
    sectionId: string;
    itemId: string;
  };
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  attachments: Attachment[];
  createdAt: string;
};

export type RabItem = {
  id: string;
  no: string;
  title: string;
  spec: string;
  qty: string;
  unit: RabUnit;
  unitPrice: string;
};

export type RabSection = {
  id: string;
  code: string;
  title: string;
  items: RabItem[];
};

export type RabDoc = {
  projectId: string;
  title: string;
  sections: RabSection[];
  updatedAt: string;
};

export type Employee = {
  id: string;
  name: string;
  roleTitle: string;
  defaultDailyRate: number;
  active: boolean;
};

export type WagePayment = {
  id: string;
  projectId: string;
  employeeId: string;
  occurredAt: string;
  days: number;
  dailyRate: number;
  amount: number;
  note: string;
  rabRef?: { sectionId: string; itemId: string };
  transactionId: string;
  createdAt: string;
};

// ==================== INVENTORY TYPES ====================
export type InventoryUnit = "sak" | "m3" | "btg" | "lbr" | "kg" | "roll" | "box" | "unit" | "galon" | "btl";

export type InventoryItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: InventoryUnit;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  location: string;
  updatedAt: string;
};

export type InventoryMovementType = "IN" | "OUT";

export type InventoryMovement = {
  id: string;
  itemId: string;
  type: InventoryMovementType;
  qty: number;
  projectId?: string;
  notes: string;
  occurredAt: string;
  createdAt: string;
};

// ==================== EQUIPMENT TYPES ====================
export type EquipmentStatus = "TERSEDIA" | "DIPAKAI" | "PERBAIKAN" | "RUSAK";
export type EquipmentCondition = "BAIK" | "PERLU_SERVIS" | "RUSAK";

export type EquipmentItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  currentProjectId?: string;
  assignedTo?: string;
  assignedDate?: string;
  location: string;
  serialNo?: string;
  updatedAt: string;
};

export type EquipmentLog = {
  id: string;
  equipmentId: string;
  action: "ASSIGN" | "RETURN" | "SERVICE_START" | "SERVICE_DONE";
  projectId?: string;
  pic?: string;
  note: string;
  occurredAt: string;
  createdAt: string;
};

// ==================== ROOT STATE ====================
export type AppState = {
  currentUser: User;
  projects: Project[];
  categories: Category[];
  transactions: Transaction[];
  employees: Employee[];
  wagePayments: WagePayment[];
  rabsByProjectId: Record<string, RabDoc | undefined>;
  inventoryItems: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  equipments: EquipmentItem[];
  equipmentLogs: EquipmentLog[];
};

export const STORAGE_KEY = "fluxo_state_v2";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampPct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function getSeedState(): AppState {
  const currentUser: User = { id: "u-1", name: "Admin", role: "ADMIN" };

  const projects: Project[] = [
    {
      id: "prj-1",
      code: "PRJ-001",
      name: "Renovasi Kantor",
      owner: "PM A",
      startDate: "2026-03-15",
      endDate: "2026-04-30",
      status: "RUNNING",
      progressPct: 68,
      budgetPlanTotal: 25000000,
      updatedAt: "2026-04-04",
    },
    {
      id: "prj-2",
      code: "PRJ-002",
      name: "Pembangunan Gudang",
      owner: "PM B",
      startDate: "2026-03-01",
      endDate: "2026-06-30",
      status: "RUNNING",
      progressPct: 34,
      budgetPlanTotal: 80000000,
      updatedAt: "2026-04-03",
    },
    {
      id: "prj-3",
      code: "PRJ-003",
      name: "Implementasi Sistem",
      owner: "PM C",
      startDate: "2026-02-01",
      endDate: "2026-04-10",
      status: "DONE",
      progressPct: 100,
      budgetPlanTotal: 15000000,
      updatedAt: "2026-04-02",
    },
  ];

  const categories: Category[] = [
    { id: "cat-1", name: "Pembayaran Client", type: "IN" },
    { id: "cat-2", name: "Material", type: "OUT" },
    { id: "cat-3", name: "Upah", type: "OUT" },
    { id: "cat-4", name: "Operasional", type: "OUT" },
    { id: "cat-5", name: "Other", type: "OUT" },
  ];

  const employees: Employee[] = [
    { id: "emp-1", name: "Budi", roleTitle: "Tukang", defaultDailyRate: 175000, active: true },
    { id: "emp-2", name: "Siti", roleTitle: "Helper", defaultDailyRate: 150000, active: true },
    { id: "emp-3", name: "Andi", roleTitle: "Mandor", defaultDailyRate: 250000, active: true },
  ];

  const wagePayments: WagePayment[] = [];

  const transactions: Transaction[] = [
    {
      id: "tx-1",
      projectId: "prj-1",
      categoryId: "cat-2",
      group: "MATERIAL",
      type: "OUT",
      amount: 1250000,
      occurredAt: "2026-04-04",
      description: "Beli material semen dan pasir awal",
      rabRef: { sectionId: "sec-a", itemId: "a-1" },
      approvalStatus: "APPROVED",
      attachments: [],
      createdAt: "2026-04-04T09:30:00Z",
    },
    {
      id: "tx-2",
      projectId: "prj-1",
      categoryId: "cat-1",
      group: "OTHER",
      type: "IN",
      amount: 5000000,
      occurredAt: "2026-04-03",
      description: "DP dari client termin 1",
      approvalStatus: "APPROVED",
      attachments: [],
      createdAt: "2026-04-03T10:10:00Z",
    },
    {
      id: "tx-3",
      projectId: "prj-2",
      categoryId: "cat-3",
      group: "UPAH",
      type: "OUT",
      amount: 800000,
      occurredAt: "2026-04-03",
      description: "Upah harian tukang",
      approvalStatus: "PENDING",
      attachments: [],
      createdAt: "2026-04-03T15:05:00Z",
    },
    {
      id: "tx-4",
      projectId: "prj-2",
      categoryId: "cat-4",
      group: "OPERASIONAL",
      type: "OUT",
      amount: 175000,
      occurredAt: "2026-04-02",
      description: "Transport pengiriman barang material",
      approvalStatus: "APPROVED",
      attachments: [],
      createdAt: "2026-04-02T08:20:00Z",
    },
    {
      id: "tx-5",
      projectId: "prj-3",
      categoryId: "cat-2",
      group: "MATERIAL",
      type: "OUT",
      amount: 650000,
      occurredAt: "2026-04-01",
      description: "Pembelian alat kecil",
      approvalStatus: "REJECTED",
      attachments: [],
      createdAt: "2026-04-01T14:55:00Z",
    },
    {
      id: "tx-6",
      projectId: "prj-1",
      categoryId: "cat-5",
      group: "OTHER",
      type: "OUT",
      amount: 300000,
      occurredAt: "2026-04-01",
      description: "Biaya perizinan lapangan",
      approvalStatus: "PENDING",
      attachments: [],
      createdAt: "2026-04-01T09:10:00Z",
    },
  ];

  const rabsByProjectId: Record<string, RabDoc | undefined> = {
    "prj-1": {
      projectId: "prj-1",
      title: "RAB Pekerjaan Tambahan Renovasi",
      updatedAt: "2026-04-04",
      sections: [
        {
          id: "sec-a",
          code: "A",
          title: "PEKERJAAN TAMBAHAN DINDING & PINTU",
          items: [
            {
              id: "a-1",
              no: "1",
              title: "Pekerjaan Pembobokan Openingan Pintu Uk (1.6x2.2)",
              spec: "Pekerjaan Pembobokan Dinding Batu",
              qty: "1,00",
              unit: "unit",
              unitPrice: "2.125.000",
            },
            {
              id: "a-2",
              no: "2",
              title: "Pekerjaan Pembuatan Acitrap 2 Sisi Gawangan Pintu",
              spec: "Acitrap 2 Sisi, Bahan Multiplek Finnish HPL",
              qty: "1,00",
              unit: "unit",
              unitPrice: "1.700.000",
            },
            {
              id: "a-3",
              no: "3",
              title: "Pekerjaan Pembobokan Dinding Lioket 1",
              spec: "Bobok Dinding Finish Cap dan Cat Include Buang Puing",
              qty: "65,48",
              unit: "m2",
              unitPrice: "250.000",
            },
          ],
        },
      ],
    },
  };

  const inventoryItems: InventoryItem[] = [
    {
      id: "inv-1",
      code: "MAT-001",
      name: "Semen Portland 50kg (Gresik/Tiga Roda)",
      category: "Semen & Pasir",
      unit: "sak",
      currentStock: 85,
      minStock: 20,
      unitPrice: 68000,
      location: "Gudang Utama A",
      updatedAt: "2026-04-04",
    },
    {
      id: "inv-2",
      code: "MAT-002",
      name: "Pasir Pasang Super",
      category: "Semen & Pasir",
      unit: "m3",
      currentStock: 14,
      minStock: 5,
      unitPrice: 280000,
      location: "Gudang Proyek Site 1",
      updatedAt: "2026-04-03",
    },
    {
      id: "inv-3",
      code: "MAT-003",
      name: "Besi Beton Ulir D13mm Sni",
      category: "Besi & Baja",
      unit: "btg",
      currentStock: 65,
      minStock: 25,
      unitPrice: 115000,
      location: "Gudang Utama B",
      updatedAt: "2026-04-02",
    },
    {
      id: "inv-4",
      code: "MAT-004",
      name: "Multiplek Film 18mm",
      category: "Kayu & Bekisting",
      unit: "lbr",
      currentStock: 32,
      minStock: 15,
      unitPrice: 215000,
      location: "Gudang Proyek Site 1",
      updatedAt: "2026-04-01",
    },
    {
      id: "inv-5",
      code: "MAT-005",
      name: "Cat Dinding Interior Putih 20L",
      category: "Cat & Finishing",
      unit: "galon",
      currentStock: 8,
      minStock: 4,
      unitPrice: 650000,
      location: "Gudang Utama A",
      updatedAt: "2026-03-30",
    },
    {
      id: "inv-6",
      code: "MAT-006",
      name: "Kabel NYM 3x2.5mm Supreme 50m",
      category: "Kelistrikan",
      unit: "roll",
      currentStock: 6,
      minStock: 3,
      unitPrice: 430000,
      location: "Gudang Utama B",
      updatedAt: "2026-03-28",
    },
  ];

  const inventoryMovements: InventoryMovement[] = [
    {
      id: "mov-1",
      itemId: "inv-1",
      type: "IN",
      qty: 100,
      notes: "Penerimaan restock dari supplier PT Mitra Semen",
      occurredAt: "2026-04-02",
      createdAt: "2026-04-02T10:00:00Z",
    },
    {
      id: "mov-2",
      itemId: "inv-1",
      type: "OUT",
      qty: 15,
      projectId: "prj-1",
      notes: "Alokasi material plesteran PRJ-001",
      occurredAt: "2026-04-04",
      createdAt: "2026-04-04T08:30:00Z",
    },
    {
      id: "mov-3",
      itemId: "inv-3",
      type: "OUT",
      qty: 10,
      projectId: "prj-2",
      notes: "Alokasi pembesian kolom PRJ-002",
      occurredAt: "2026-04-03",
      createdAt: "2026-04-03T14:15:00Z",
    },
  ];

  const equipments: EquipmentItem[] = [
    {
      id: "eq-1",
      code: "ALT-001",
      name: "Mesin Molen Cor Beton 350L (Tiger Engine 8HP)",
      category: "Mesin Konstruksi",
      status: "DIPAKAI",
      condition: "BAIK",
      currentProjectId: "prj-1",
      assignedTo: "Mandor Andi",
      assignedDate: "2026-03-20",
      location: "Site PRJ-001 Renovasi Kantor",
      serialNo: "MLN-2024-089",
      updatedAt: "2026-03-20",
    },
    {
      id: "eq-2",
      code: "ALT-002",
      name: "Genset Silent 5 KVA Honda",
      category: "Mesin Tenaga Listrik",
      status: "TERSEDIA",
      condition: "BAIK",
      location: "Gudang Utama",
      serialNo: "GEN-5K-012",
      updatedAt: "2026-04-01",
    },
    {
      id: "eq-3",
      code: "ALT-003",
      name: "Jack Hammer Elektrik Demolition",
      category: "Alat Pembobokan",
      status: "DIPAKAI",
      condition: "BAIK",
      currentProjectId: "prj-1",
      assignedTo: "Budi Tukang",
      assignedDate: "2026-04-01",
      location: "Site PRJ-001",
      serialNo: "JH-DE-441",
      updatedAt: "2026-04-01",
    },
    {
      id: "eq-4",
      code: "ALT-004",
      name: "Scaffolding Set 1.7m (20 Set Lengkap)",
      category: "Perancah & Safety",
      status: "DIPAKAI",
      condition: "BAIK",
      currentProjectId: "prj-2",
      assignedTo: "PM B",
      assignedDate: "2026-03-10",
      location: "Site PRJ-002 Pembangunan Gudang",
      updatedAt: "2026-03-10",
    },
    {
      id: "eq-5",
      code: "ALT-005",
      name: "Mesin Las Inverter 200A Daiden",
      category: "Alat Pengelasan",
      status: "PERBAIKAN",
      condition: "PERLU_SERVIS",
      location: "Bengkel Servis Resmi",
      serialNo: "INV-200-992",
      updatedAt: "2026-04-03",
    },
    {
      id: "eq-6",
      code: "ALT-006",
      name: "Total Station / Theodolite Digital Topcon",
      category: "Alat Ukur Survei",
      status: "TERSEDIA",
      condition: "BAIK",
      location: "Ruang Alat Presisi",
      serialNo: "TS-TOP-118",
      updatedAt: "2026-04-02",
    },
  ];

  const equipmentLogs: EquipmentLog[] = [
    {
      id: "log-1",
      equipmentId: "eq-1",
      action: "ASSIGN",
      projectId: "prj-1",
      pic: "Mandor Andi",
      note: "Penugasan untuk pekerjaan pengecoran balok",
      occurredAt: "2026-03-20",
      createdAt: "2026-03-20T08:00:00Z",
    },
    {
      id: "log-2",
      equipmentId: "eq-3",
      action: "ASSIGN",
      projectId: "prj-1",
      pic: "Budi Tukang",
      note: "Digunakan untuk pembobokan dinding lioket",
      occurredAt: "2026-04-01",
      createdAt: "2026-04-01T09:00:00Z",
    },
    {
      id: "log-3",
      equipmentId: "eq-5",
      action: "SERVICE_START",
      pic: "Teknisi Gudang",
      note: "Masuk perbaikan relay inverter trip saat voltase drop",
      occurredAt: "2026-04-03",
      createdAt: "2026-04-03T11:00:00Z",
    },
  ];

  return {
    currentUser,
    projects,
    categories,
    transactions,
    employees,
    wagePayments,
    rabsByProjectId,
    inventoryItems,
    inventoryMovements,
    equipments,
    equipmentLogs,
  };
}

export function loadInitialState(): AppState {
  const seed = getSeedState();
  if (typeof window === "undefined" || !window.localStorage) return seed;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    return {
      ...seed,
      ...parsed,
      inventoryItems:
        Array.isArray(parsed.inventoryItems) && parsed.inventoryItems.length > 0
          ? parsed.inventoryItems
          : seed.inventoryItems,
      inventoryMovements: Array.isArray(parsed.inventoryMovements)
        ? parsed.inventoryMovements
        : seed.inventoryMovements,
      equipments:
        Array.isArray(parsed.equipments) && parsed.equipments.length > 0
          ? parsed.equipments
          : seed.equipments,
      equipmentLogs: Array.isArray(parsed.equipmentLogs)
        ? parsed.equipmentLogs
        : seed.equipmentLogs,
    };
  } catch (e) {
    console.error("Gagal memuat local state, fallback ke seed:", e);
    return seed;
  }
}

type Action =
  | { type: "auth/setCurrentUser"; payload: { name: string; role: UserRole } }
  | { type: "project/create"; payload: { code: string; name: string; owner: string; startDate: string; endDate: string; budgetPlanTotal: number } }
  | { type: "project/update"; payload: { id: string; patch: Partial<Omit<Project, "id">> } }
  | {
      type: "transaction/create";
      payload: Omit<Transaction, "id" | "createdAt"> & { id?: string; createdAt?: string };
    }
  | { type: "transaction/setStatus"; payload: { id: string; approvalStatus: ApprovalStatus; rejectionReason?: string } }
  | { type: "employee/create"; payload: { name: string; roleTitle: string; defaultDailyRate: number } }
  | {
      type: "wage/pay";
      payload: {
        projectId: string;
        employeeId: string;
        occurredAt: string;
        days: number;
        dailyRate: number;
        note: string;
        rabRef?: { sectionId: string; itemId: string };
        attachments: Attachment[];
      };
    }
  | { type: "rab/set"; payload: RabDoc }
  | {
      type: "inventory/addItem";
      payload: Omit<InventoryItem, "id" | "updatedAt">;
    }
  | {
      type: "inventory/recordMovement";
      payload: {
        itemId: string;
        type: InventoryMovementType;
        qty: number;
        projectId?: string;
        notes: string;
        occurredAt: string;
      };
    }
  | {
      type: "equipment/addItem";
      payload: Omit<EquipmentItem, "id" | "updatedAt">;
    }
  | {
      type: "equipment/assignProject";
      payload: {
        equipmentId: string;
        projectId: string;
        assignedTo: string;
        date: string;
        note?: string;
      };
    }
  | {
      type: "equipment/returnToGudang";
      payload: {
        equipmentId: string;
        condition: EquipmentCondition;
        location: string;
        date: string;
        note?: string;
      };
    }
  | {
      type: "equipment/setCondition";
      payload: {
        equipmentId: string;
        condition: EquipmentCondition;
        status: EquipmentStatus;
      };
    }
  | { type: "store/resetToDefault" };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "store/resetToDefault": {
      const fresh = getSeedState();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.warn(err);
      }
      return fresh;
    }
    case "auth/setCurrentUser": {
      return { ...state, currentUser: { ...state.currentUser, name: action.payload.name, role: action.payload.role } };
    }
    case "project/create": {
      const now = today();
      const project: Project = {
        id: createId(),
        code: action.payload.code.trim(),
        name: action.payload.name.trim(),
        owner: action.payload.owner.trim(),
        startDate: action.payload.startDate,
        endDate: action.payload.endDate,
        status: "PLANNING",
        progressPct: 0,
        budgetPlanTotal: Math.max(0, action.payload.budgetPlanTotal),
        updatedAt: now,
      };
      return { ...state, projects: [project, ...state.projects] };
    }
    case "project/update": {
      const now = today();
      return {
        ...state,
        projects: state.projects.map((p) => {
          if (p.id !== action.payload.id) return p;
          const patch = { ...action.payload.patch };
          if (typeof patch.progressPct === "number") patch.progressPct = clampPct(patch.progressPct);
          if (typeof patch.budgetPlanTotal === "number") patch.budgetPlanTotal = Math.max(0, patch.budgetPlanTotal);
          return { ...p, ...patch, updatedAt: now };
        }),
      };
    }
    case "transaction/create": {
      const tx: Transaction = {
        id: action.payload.id ?? createId(),
        projectId: action.payload.projectId,
        categoryId: action.payload.categoryId,
        group: action.payload.group,
        type: action.payload.type,
        amount: action.payload.amount,
        occurredAt: action.payload.occurredAt,
        description: action.payload.description,
        rabRef: action.payload.rabRef,
        approvalStatus: action.payload.approvalStatus,
        attachments: action.payload.attachments,
        createdAt: action.payload.createdAt ?? new Date().toISOString(),
      };
      return { ...state, transactions: [tx, ...state.transactions] };
    }
    case "transaction/setStatus": {
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id
            ? {
                ...t,
                approvalStatus: action.payload.approvalStatus,
                rejectionReason: action.payload.rejectionReason ?? t.rejectionReason,
              }
            : t,
        ),
      };
    }
    case "employee/create": {
      const emp: Employee = {
        id: createId(),
        name: action.payload.name.trim(),
        roleTitle: action.payload.roleTitle.trim(),
        defaultDailyRate: Math.max(0, action.payload.defaultDailyRate),
        active: true,
      };
      return { ...state, employees: [emp, ...state.employees] };
    }
    case "wage/pay": {
      const employee = state.employees.find((e) => e.id === action.payload.employeeId);
      const employeeName = employee?.name ?? "Karyawan";
      const amount = Math.max(0, Math.round(action.payload.days * action.payload.dailyRate));
      const txId = createId();
      const createdAt = new Date().toISOString();

      const tx: Transaction = {
        id: txId,
        projectId: action.payload.projectId,
        categoryId: "cat-3",
        group: "UPAH",
        type: "OUT",
        amount,
        occurredAt: action.payload.occurredAt,
        description: `Upah ${employeeName}${action.payload.note ? ` (${action.payload.note})` : ""}`,
        rabRef: action.payload.rabRef,
        approvalStatus: "PENDING",
        attachments: action.payload.attachments,
        createdAt,
      };

      const payment: WagePayment = {
        id: createId(),
        projectId: action.payload.projectId,
        employeeId: action.payload.employeeId,
        occurredAt: action.payload.occurredAt,
        days: action.payload.days,
        dailyRate: action.payload.dailyRate,
        amount,
        note: action.payload.note,
        rabRef: action.payload.rabRef,
        transactionId: txId,
        createdAt,
      };

      return {
        ...state,
        transactions: [tx, ...state.transactions],
        wagePayments: [payment, ...state.wagePayments],
      };
    }
    case "rab/set": {
      return {
        ...state,
        rabsByProjectId: { ...state.rabsByProjectId, [action.payload.projectId]: action.payload },
      };
    }

    // ==================== INVENTORY ACTIONS ====================
    case "inventory/addItem": {
      const now = today();
      const item: InventoryItem = {
        id: createId(),
        code: action.payload.code.trim().toUpperCase(),
        name: action.payload.name.trim(),
        category: action.payload.category.trim(),
        unit: action.payload.unit,
        currentStock: Math.max(0, action.payload.currentStock),
        minStock: Math.max(0, action.payload.minStock),
        unitPrice: Math.max(0, action.payload.unitPrice),
        location: action.payload.location.trim() || "Gudang Utama",
        updatedAt: now,
      };
      return { ...state, inventoryItems: [item, ...state.inventoryItems] };
    }
    case "inventory/recordMovement": {
      const now = today();
      const movement: InventoryMovement = {
        id: createId(),
        itemId: action.payload.itemId,
        type: action.payload.type,
        qty: Math.max(0, action.payload.qty),
        projectId: action.payload.projectId,
        notes: action.payload.notes.trim(),
        occurredAt: action.payload.occurredAt || now,
        createdAt: new Date().toISOString(),
      };

      const updatedItems = state.inventoryItems.map((it) => {
        if (it.id !== action.payload.itemId) return it;
        const delta = action.payload.type === "IN" ? action.payload.qty : -action.payload.qty;
        const newStock = Math.max(0, it.currentStock + delta);
        return { ...it, currentStock: newStock, updatedAt: now };
      });

      return {
        ...state,
        inventoryItems: updatedItems,
        inventoryMovements: [movement, ...state.inventoryMovements],
      };
    }

    // ==================== EQUIPMENT ACTIONS ====================
    case "equipment/addItem": {
      const now = today();
      const item: EquipmentItem = {
        id: createId(),
        code: action.payload.code.trim().toUpperCase(),
        name: action.payload.name.trim(),
        category: action.payload.category.trim(),
        status: action.payload.status || "TERSEDIA",
        condition: action.payload.condition || "BAIK",
        currentProjectId: action.payload.currentProjectId,
        assignedTo: action.payload.assignedTo,
        assignedDate: action.payload.assignedDate,
        location: action.payload.location.trim() || "Gudang Utama",
        serialNo: action.payload.serialNo?.trim(),
        updatedAt: now,
      };
      return { ...state, equipments: [item, ...state.equipments] };
    }
    case "equipment/assignProject": {
      const now = today();
      const project = state.projects.find((p) => p.id === action.payload.projectId);
      const log: EquipmentLog = {
        id: createId(),
        equipmentId: action.payload.equipmentId,
        action: "ASSIGN",
        projectId: action.payload.projectId,
        pic: action.payload.assignedTo,
        note: action.payload.note || `Ditugaskan ke proyek ${project?.name ?? action.payload.projectId}`,
        occurredAt: action.payload.date || now,
        createdAt: new Date().toISOString(),
      };

      const updatedEquipments = state.equipments.map((eq) => {
        if (eq.id !== action.payload.equipmentId) return eq;
        return {
          ...eq,
          status: "DIPAKAI" as EquipmentStatus,
          currentProjectId: action.payload.projectId,
          assignedTo: action.payload.assignedTo,
          assignedDate: action.payload.date || now,
          location: `Site ${project?.code ?? "Proyek"}`,
          updatedAt: now,
        };
      });

      return {
        ...state,
        equipments: updatedEquipments,
        equipmentLogs: [log, ...state.equipmentLogs],
      };
    }
    case "equipment/returnToGudang": {
      const now = today();
      const log: EquipmentLog = {
        id: createId(),
        equipmentId: action.payload.equipmentId,
        action: "RETURN",
        note: action.payload.note || `Pengembalian ke ${action.payload.location}. Kondisi: ${action.payload.condition}`,
        occurredAt: action.payload.date || now,
        createdAt: new Date().toISOString(),
      };

      const nextStatus: EquipmentStatus =
        action.payload.condition === "RUSAK" ? "RUSAK" : action.payload.condition === "PERLU_SERVIS" ? "PERBAIKAN" : "TERSEDIA";

      const updatedEquipments = state.equipments.map((eq) => {
        if (eq.id !== action.payload.equipmentId) return eq;
        return {
          ...eq,
          status: nextStatus,
          condition: action.payload.condition,
          currentProjectId: undefined,
          assignedTo: undefined,
          assignedDate: undefined,
          location: action.payload.location || "Gudang Utama",
          updatedAt: now,
        };
      });

      return {
        ...state,
        equipments: updatedEquipments,
        equipmentLogs: [log, ...state.equipmentLogs],
      };
    }
    case "equipment/setCondition": {
      const now = today();
      return {
        ...state,
        equipments: state.equipments.map((eq) => {
          if (eq.id !== action.payload.equipmentId) return eq;
          return {
            ...eq,
            condition: action.payload.condition,
            status: action.payload.status,
            updatedAt: now,
          };
        }),
      };
    }

    default:
      return state;
  }
}

type AppStore = {
  state: AppState;
  actions: {
    setCurrentUser: (input: { name: string; role: UserRole }) => void;
    createProject: (input: { code: string; name: string; owner: string; startDate: string; endDate: string; budgetPlanTotal: number }) => void;
    updateProject: (id: string, patch: Partial<Omit<Project, "id">>) => void;
    createTransaction: (input: Omit<Transaction, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
    setTransactionStatus: (id: string, approvalStatus: ApprovalStatus, rejectionReason?: string) => void;
    createEmployee: (input: { name: string; roleTitle: string; defaultDailyRate: number }) => void;
    payWage: (input: {
      projectId: string;
      employeeId: string;
      occurredAt: string;
      days: number;
      dailyRate: number;
      note: string;
      rabRef?: { sectionId: string; itemId: string };
      attachments?: Attachment[];
    }) => void;
    setRab: (doc: Omit<RabDoc, "updatedAt"> & { updatedAt?: string }) => void;
    addInventoryItem: (input: Omit<InventoryItem, "id" | "updatedAt">) => void;
    recordInventoryMovement: (input: {
      itemId: string;
      type: InventoryMovementType;
      qty: number;
      projectId?: string;
      notes: string;
      occurredAt: string;
    }) => void;
    addEquipmentItem: (input: Omit<EquipmentItem, "id" | "updatedAt">) => void;
    assignEquipment: (input: {
      equipmentId: string;
      projectId: string;
      assignedTo: string;
      date: string;
      note?: string;
    }) => void;
    returnEquipment: (input: {
      equipmentId: string;
      condition: EquipmentCondition;
      location: string;
      date: string;
      note?: string;
    }) => void;
    setEquipmentCondition: (input: {
      equipmentId: string;
      condition: EquipmentCondition;
      status: EquipmentStatus;
    }) => void;
    resetStoreToDefault: () => void;
  };
};

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);

  // Sync automatically ke LocalStorage setiap state berubah
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Gagal menyimpan ke localStorage:", err);
    }
  }, [state]);

  const actions = useMemo<AppStore["actions"]>(
    () => ({
      setCurrentUser: (input) => dispatch({ type: "auth/setCurrentUser", payload: input }),
      createProject: (input) => dispatch({ type: "project/create", payload: input }),
      updateProject: (id, patch) => dispatch({ type: "project/update", payload: { id, patch } }),
      createTransaction: (input) => dispatch({ type: "transaction/create", payload: input }),
      setTransactionStatus: (id, approvalStatus, rejectionReason) =>
        dispatch({ type: "transaction/setStatus", payload: { id, approvalStatus, rejectionReason } }),
      createEmployee: (input) => dispatch({ type: "employee/create", payload: input }),
      payWage: (input) =>
        dispatch({
          type: "wage/pay",
          payload: { ...input, attachments: input.attachments ?? [] },
        }),
      setRab: (doc) =>
        dispatch({
          type: "rab/set",
          payload: { ...doc, updatedAt: doc.updatedAt ?? today() },
        }),
      addInventoryItem: (input) => dispatch({ type: "inventory/addItem", payload: input }),
      recordInventoryMovement: (input) => dispatch({ type: "inventory/recordMovement", payload: input }),
      addEquipmentItem: (input) => dispatch({ type: "equipment/addItem", payload: input }),
      assignEquipment: (input) => dispatch({ type: "equipment/assignProject", payload: input }),
      returnEquipment: (input) => dispatch({ type: "equipment/returnToGudang", payload: input }),
      setEquipmentCondition: (input) => dispatch({ type: "equipment/setCondition", payload: input }),
      resetStoreToDefault: () => dispatch({ type: "store/resetToDefault" }),
    }),
    [],
  );

  const value = useMemo<AppStore>(() => ({ state, actions }), [state, actions]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("AppStoreProvider missing");
  return ctx;
}

export function groupToCategoryId(group: TransactionGroup): string {
  switch (group) {
    case "MATERIAL":
      return "cat-2";
    case "UPAH":
      return "cat-3";
    case "OPERASIONAL":
      return "cat-4";
    case "OTHER":
      return "cat-5";
  }
}

export function groupLabel(group: TransactionGroup) {
  switch (group) {
    case "MATERIAL":
      return "Material";
    case "UPAH":
      return "Upah";
    case "OPERASIONAL":
      return "Operasional";
    case "OTHER":
      return "Other";
  }
}

export function calcRabGrandTotal(doc: RabDoc): number {
  const parseIdMoney = (value: string): number => {
    const cleaned = value.replace(/[^0-9.,-]/g, "").trim();
    if (!cleaned) return 0;
    const sign = cleaned.startsWith("-") ? -1 : 1;
    const digits = cleaned.replace(/[^0-9.,]/g, "");
    const normalized = digits.replace(/\./g, "").replace(/,/g, ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? sign * n : 0;
  };

  let total = 0;
  for (const section of doc.sections) {
    for (const item of section.items) {
      const qty = parseIdMoney(item.qty);
      const unitPrice = parseIdMoney(item.unitPrice);
      total += qty * unitPrice;
    }
  }
  return total;
}
