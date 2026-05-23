'use client';

import { useHacksStats } from '../../hooks/useHacksStats';
import { StatsCards } from './StatsCards';
import { TimelineChart } from './TimelineChart';
import { VectorChart } from './VectorChart';
import { ChainChart } from './ChainChart';
import styles from './Charts.module.css';

export function HacksDashboardCharts(): React.ReactNode {
  const { dashboard, timeline, vectors, chains, isLoading, error } = useHacksStats();

  if (error) {
    return (
      <div className={styles.errorBanner}>
        <p>Failed to load dashboard metrics. Please reload the page.</p>
      </div>
    );
  }

  return (
    <section className={styles.container}>
      <StatsCards stats={dashboard} isLoading={isLoading} />

      <div className={styles.timelineGrid}>
        <TimelineChart data={timeline} isLoading={isLoading} />
      </div>

      <div className={styles.distributionGrid}>
        <VectorChart data={vectors} isLoading={isLoading} />
        <ChainChart data={chains} isLoading={isLoading} />
      </div>
    </section>
  );
}
