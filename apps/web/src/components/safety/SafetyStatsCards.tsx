import React from 'react';
import styles from './Safety.module.css';
import type { SafetyStatsResponse } from '@aegis/core';

interface SafetyStatsCardsProps {
  stats: SafetyStatsResponse | null;
}

export function SafetyStatsCards({ stats }: SafetyStatsCardsProps): React.ReactElement {
  if (!stats) return <></>;

  const { totalScans, averageScore, labelDistribution } = stats;

  const totalAnalyzed =
    labelDistribution.safe + labelDistribution.suspicious + labelDistribution.malicious;
  const percentSafe =
    totalAnalyzed > 0 ? ((labelDistribution.safe / totalAnalyzed) * 100).toFixed(1) : '0.0';
  const percentMalicious =
    totalAnalyzed > 0 ? ((labelDistribution.malicious / totalAnalyzed) * 100).toFixed(1) : '0.0';

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Total Scanned</div>
        <div className={styles.statValue}>{totalScans.toLocaleString()}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>% Safe</div>
        <div className={styles.statValue} style={{ color: 'var(--accent-emerald)' }}>
          {percentSafe}%
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>% Malicious</div>
        <div className={styles.statValue} style={{ color: 'var(--accent-red)' }}>
          {percentMalicious}%
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>Avg Score</div>
        <div className={styles.statValue}>{averageScore.toFixed(1)} / 100</div>
      </div>
    </div>
  );
}
