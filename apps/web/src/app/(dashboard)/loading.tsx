export default function DashboardLoading(): React.ReactNode {
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', padding: 'var(--space-4)', width: '100%', maxWidth: 'var(--breakpoint-xl)', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="animate-shimmer" style={{ width: '200px', height: '40px', borderRadius: 'var(--radius-md)' }} />
        <div className="animate-shimmer" style={{ width: '120px', height: '40px', borderRadius: 'var(--radius-md)' }} />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-shimmer" style={{ height: '120px', borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>

      <div className="animate-shimmer" style={{ width: '100%', height: '400px', borderRadius: 'var(--radius-md)', marginTop: 'var(--space-4)' }} />
    </div>
  );
}
