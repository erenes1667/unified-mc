export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1200 }}>
      {/* Skeleton header */}
      <div style={{ height: 28, width: 200, borderRadius: 8, background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      {/* Skeleton stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[0,1,2,3].map(i => (
          <div key={i} className="glass" style={{ padding: '20px 24px', borderRadius: 12, height: 80, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      {/* Skeleton content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {[0,1].map(i => (
          <div key={i} className="glass" style={{ borderRadius: 12, height: 300, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
    </div>
  );
}
