/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-redundant-type-constituents */
'use client';

import { useHacksStats } from '@/hooks/useHacksStats';
import { StatsCards } from './StatsCards';
import { TimelineChart } from './TimelineChart';
import { VectorChart } from './VectorChart';
import { ChainChart } from './ChainChart';

export function HacksDashboardCharts(): React.ReactNode {
  const { dashboard, timeline, vectors, chains, isLoading } = useHacksStats();

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
      <StatsCards stats={dashboard} isLoading={isLoading} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-4)' }}>
        <TimelineChart data={timeline} isLoading={isLoading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
        <VectorChart data={vectors} isLoading={isLoading} />
        <ChainChart data={chains} isLoading={isLoading} />
      </div>
    </section>
  );
}
