import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ApprovalsPage } from "./pages/ApprovalsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EquipmentPage } from "./pages/EquipmentPage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SdmPage } from "./pages/SdmPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { useAppStore } from "./store/appStore";
import type { UserRole } from "./store/appStore";

function ProtectedRoute({ allow, children }: { allow: UserRole[]; children: React.ReactNode }) {
  const { state } = useAppStore();
  if (allow.includes(state.currentUser.role)) return children;
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route
          path="/sdm"
          element={
            <ProtectedRoute allow={["ADMIN", "FINANCE"]}>
              <SdmPage />
            </ProtectedRoute>
          }
        />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/equipment" element={<EquipmentPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
