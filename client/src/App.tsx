import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { TransactionsPage } from "./pages/TransactionsPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="container">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <div className="muted">Template halaman. Nanti kita isi fitur dan integrasi API.</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/approvals" element={<PlaceholderPage title="Approval" />} />
        <Route path="/budgets" element={<PlaceholderPage title="RAB (Budget)" />} />
        <Route path="/reports" element={<PlaceholderPage title="Laporan" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
