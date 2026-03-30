export default function HomePage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
        color: '#e0e0e0',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#ffffff' }}>
        🛡️ AltFlex AEGIS v3.0
      </h1>
      <p style={{ fontSize: '1.1rem', color: '#a0a0c0', marginBottom: '2rem' }}>
        Adaptive Exploit &amp; Governance Intelligence System
      </p>
      <div
        style={{
          padding: '1.5rem 2rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <p style={{ margin: 0, color: '#2ecc71', fontWeight: 600 }}>
          ✅ Phase 0 — Environment Validated
        </p>
      </div>
    </main>
  );
}
