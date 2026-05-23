import { Shield } from 'lucide-react';
import { HacksTable } from '@/components/hacks/HacksTable';

export const metadata = {
  title: 'Hacks Dashboard | ALTFlex AEGIS',
  description: 'View and analyze real-time DeFi hack incidents.',
};

export default function HacksPage(): React.ReactNode {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div 
          style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            padding: 'var(--space-2)', 
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-cyan)'
          }}
        >
          <Shield size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--text-primary)' }}>Hacks Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Browse, filter, and analyze DeFi hack incidents with forensic-grade detail.</p>
        </div>
      </header>

      <section>
        <HacksTable />
      </section>
    </div>
  );
}
