interface Props {
  icon: string;
  title: string;
  description: string;
  comingSoon?: boolean;
  children?: React.ReactNode;
}

export default function PlaceholderPage({ icon, title, description, comingSoon = true, children }: Props) {
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#c9a84c', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          {title}
        </h1>
        <p style={{ fontSize: 13, color: '#6b7280' }}>{description}</p>
      </div>

      {comingSoon && (
        <div
          className="glass"
          style={{
            padding: 48,
            borderRadius: 16,
            textAlign: 'center',
            border: '1px dashed rgba(201,168,76,0.3)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#c9a84c', marginBottom: 8 }}>
            Coming in Phase {title === 'Chat' || title === 'Tasks' || title === 'Team' || title === 'Activity' ? '2' : '3'}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', maxWidth: 400, margin: '0 auto' }}>
            This panel is scheduled for implementation. The shell, routing, and role permissions are ready.
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
