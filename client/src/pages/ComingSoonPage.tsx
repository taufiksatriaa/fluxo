export function ComingSoonPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="container">
      <div className="card" style={{ marginTop: 12 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div className="muted" style={{ marginTop: 6 }}>
          {subtitle ?? "Coming Soon"}
        </div>
        <div style={{ marginTop: 12 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            Fokus local deployment dulu. Menu ini disiapkan untuk next phase.
          </div>
        </div>
      </div>
    </div>
  );
}

