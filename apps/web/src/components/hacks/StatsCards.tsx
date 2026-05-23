/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-argument */
import { Activity, DollarSign, RefreshCw, ShieldCheck } from 'lucide-react';
import type { DashboardStats } from '@/lib/api-client';
import styles from './StatsCards.module.css';

interface StatsCardsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps): React.ReactNode {
  const formatCurrency = (val: number): string => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const formatPercentage = (val: number): string => {
    return `${val.toFixed(1)}%`;
  };

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Total Incidents</span>
          <Activity size={18} className={styles.cardIcon} />
        </div>
        <div className={styles.cardValue}>
          {isLoading || !stats ? <div className={styles.skeleton} /> : stats.totalIncidents.toLocaleString()}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Total Value Lost</span>
          <DollarSign size={18} className={styles.cardIcon} style={{ color: 'var(--accent-red)' }} />
        </div>
        <div className={styles.cardValue}>
          {isLoading || !stats ? <div className={styles.skeleton} /> : formatCurrency(stats.totalLossUsd)}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span>Funds Recovered</span>
          <RefreshCw size={18} className={styles.cardIcon} style={{ color: 'var(--accent-emerald)' }} />
        </div>
        <div className={styles.cardValue}>
          {isLoading || !stats ? <div className={styles.skeleton} /> : formatPercentage(stats.recoveryRate)}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span>POC Coverage</span>
          <ShieldCheck size={18} className={styles.cardIcon} style={{ color: 'var(--accent-purple)' }} />
        </div>
        <div className={styles.cardValue}>
          {isLoading || !stats ? <div className={styles.skeleton} /> : formatPercentage(stats.pocCoverage)}
        </div>
      </div>
    </div>
  );
}
