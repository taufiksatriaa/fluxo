import { createContext, useContext, useMemo, useReducer } from "react";

export type ProjectStatus = "PLANNING" | "RUNNING" | "DONE" | "ON_HOLD";
export type TransactionType = "IN" | "OUT";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type TransactionGroup = "MATERIAL" | "UPAH" | "OPERASIONAL" | "OTHER";
export type RabUnit = "unit" | "m2" | "m1" | "m3" | "ls" | "set";

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
  approvalStatus: ApprovalStatus;
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

export type AppState = {
  projects: Project[];
  categories: Category[];
  transactions: Transaction[];
  rabsByProjectId: Record<string, RabDoc | undefined>;
};

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

function initialState(): AppState {
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

  const transactions: Transaction[] = [
    {
      id: "tx-1",
      projectId: "prj-1",
      categoryId: "cat-2",
      group: "MATERIAL",
      type: "OUT",
      amount: 1250000,
      occurredAt: "2026-04-04",
      description: "Beli material awal",
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
      description: "DP dari client",
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
      description: "Upah harian",
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
      description: "Transport pengiriman barang",
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
      description: "Biaya lain-lain",
      approvalStatus: "PENDING",
      attachments: [],
      createdAt: "2026-04-01T09:10:00Z",
    },
  ];

  const rabsByProjectId: Record<string, RabDoc | undefined> = {
    "prj-1": {
      projectId: "prj-1",
      title: "RAB Pekerjaan Tambahan",
      updatedAt: "2026-04-04",
      sections: [
        {
          id: "sec-a",
          code: "A",
          title: "PEKERJAAN TAMBAHAN",
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
              title: "Pekerjaan Pembuatan Acitrap 2 Sisi Gawangan Pintu dan Tiang Cover Pipa AC",
              spec: "Acitrap 2 Sisi, Bahan Multiplek Finnish HPL",
              qty: "1,00",
              unit: "unit",
              unitPrice: "1.700.000",
            },
            {
              id: "a-3",
              no: "3",
              title: "Pekerjaan Pembobokan Dinding Lioket 1",
              spec: "Boobok Dinding Finnish Cap dan Cat Include Pembuangan Puing",
              qty: "65,48",
              unit: "m2",
              unitPrice: "250.000",
            },
          ],
        },
      ],
    },
  };

  return { projects, categories, transactions, rabsByProjectId };
}

type Action =
  | { type: "project/create"; payload: { code: string; name: string; owner: string; startDate: string; endDate: string; budgetPlanTotal: number } }
  | { type: "project/update"; payload: { id: string; patch: Partial<Omit<Project, "id">> } }
  | { type: "transaction/create"; payload: Omit<Transaction, "id" | "createdAt"> & { id?: string; createdAt?: string } }
  | { type: "transaction/setStatus"; payload: { id: string; approvalStatus: ApprovalStatus } }
  | { type: "rab/set"; payload: RabDoc };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
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
          t.id === action.payload.id ? { ...t, approvalStatus: action.payload.approvalStatus } : t,
        ),
      };
    }
    case "rab/set": {
      return {
        ...state,
        rabsByProjectId: { ...state.rabsByProjectId, [action.payload.projectId]: action.payload },
      };
    }
    default:
      return state;
  }
}

type AppStore = {
  state: AppState;
  actions: {
    createProject: (input: { code: string; name: string; owner: string; startDate: string; endDate: string; budgetPlanTotal: number }) => void;
    updateProject: (id: string, patch: Partial<Omit<Project, "id">>) => void;
    createTransaction: (input: Omit<Transaction, "id" | "createdAt"> & { id?: string; createdAt?: string }) => void;
    setTransactionStatus: (id: string, approvalStatus: ApprovalStatus) => void;
    setRab: (doc: Omit<RabDoc, "updatedAt"> & { updatedAt?: string }) => void;
  };
};

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const actions = useMemo<AppStore["actions"]>(
    () => ({
      createProject: (input) => dispatch({ type: "project/create", payload: input }),
      updateProject: (id, patch) => dispatch({ type: "project/update", payload: { id, patch } }),
      createTransaction: (input) => dispatch({ type: "transaction/create", payload: input }),
      setTransactionStatus: (id, approvalStatus) =>
        dispatch({ type: "transaction/setStatus", payload: { id, approvalStatus } }),
      setRab: (doc) =>
        dispatch({
          type: "rab/set",
          payload: { ...doc, updatedAt: doc.updatedAt ?? today() },
        }),
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
