/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/explicit-function-return-type */
import { Suspense } from 'react';
import { Shield } from 'lucide-react';
import { HacksTable } from '@/components/hacks/HacksTable';
import { HacksTableSkeleton } from '@/components/hacks/HacksTableSkeleton';
import { HacksFilterSidebar } from '@/components/hacks/HacksFilterSidebar';
import { hacksApi } from '@/lib/api-client';
import { HacksDashboardCharts } from '@/components/hacks/HacksDashboardCharts';

import type { AttackVector, Chain } from '@aegis/core';

export const metadata = {
  title: 'Hacks Dashboard | ALTFlex AEGIS',
  description: 'View and analyze real-time DeFi hack incidents.',
};

interface HackPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: string;
    attackVector?: string | string[];
    chain?: string | string[];
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    minLossUsd?: string;
    maxLossUsd?: string;
    hasFoundryPoc?: string;
  }>;
}

export default async function HacksPage({ searchParams }: HackPageProps): Promise<React.ReactNode> {
  const params = await searchParams;

  // Clean up params for the API query
  const query = {
    page: params.page ? parseInt(params.page) : 1,
    pageSize: params.pageSize ? parseInt(params.pageSize) : 20,
    sortBy: (params.sortBy as 'date' | 'lossUsd' | 'protocolName') || 'date',
    sortOrder: (params.sortOrder as 'asc' | 'desc') || 'desc',
    attackVector: params.attackVector as AttackVector | AttackVector[] | undefined,
    chain: params.chain as Chain | Chain[] | undefined,
    search: params.search,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
    minLossUsd: params.minLossUsd ? parseFloat(params.minLossUsd) : undefined,
    maxLossUsd: params.maxLossUsd ? parseFloat(params.maxLossUsd) : undefined,
    hasFoundryPoc: params.hasFoundryPoc === 'true' ? true : undefined,
  };

  // Pre-fetch data for the table
  const dataPromise = hacksApi.getHacks(query);

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            padding: 'var(--space-2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-cyan)',
          }}
        >
          <Shield size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', color: 'var(--text-primary)', margin: 0 }}>
            Hacks Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Browse, filter, and analyze DeFi hack incidents with forensic-grade detail.
          </p>
        </div>
      </header>

      <HacksDashboardCharts />

      <div style={{ display: 'flex', gap: 'var(--space-6)', position: 'relative' }}>
        <aside style={{ width: '300px', flexShrink: 0 }}>
          <Suspense fallback={<div style={{ width: 300, height: 500, backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }} />}>
            <HacksFilterSidebar />
          </Suspense>
        </aside>

        <section style={{ flexGrow: 1, minWidth: 0 }}>
          <Suspense fallback={<HacksTableSkeleton />}>
            {/* Await the data resolution in the server component and pass it */}
            <HacksTableWrapper dataPromise={dataPromise} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

async function HacksTableWrapper({
  dataPromise,
}: {
  dataPromise: ReturnType<typeof hacksApi.getHacks>;
}) {
  const data = await dataPromise;
  return <HacksTable data={data} />;
}
