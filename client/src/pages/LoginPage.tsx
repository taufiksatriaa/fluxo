import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!email.trim() || !password.trim()) {
        setError("Isi email dan password dulu (template)");
        return;
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 520, margin: "60px auto" }}>
        <h1 style={{ margin: 0 }}>Fluxo</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Kerangka frontend untuk cashflow project.
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <div>
            <div className="label">Email</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button className="btn primary" disabled={loading}>
              {loading ? "Memproses..." : "Login"}
            </button>
            {error ? <span className="danger">{error}</span> : null}
          </div>
        </form>

        <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          Ini masih template UI, belum ada integrasi API.
        </div>
      </div>
    </div>
  );
}
