import React from 'react';
import { GlobalDiffSummary } from './mockStorageData';
import styles from './StorageDiffInspector.module.css';

interface StorageDiffSummaryCardProps {
  summary: GlobalDiffSummary;
}

export const StorageDiffSummaryCard: React.FC<StorageDiffSummaryCardProps> = ({ summary }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryHeader}>
        <div className={styles.metricBlock}>
          <span className={styles.metricTitle}>Attacker Gained</span>
          <span className={styles.metricValueGain}>{formatCurrency(summary.attackerGainedUsd)}</span>
        </div>
        <div className={styles.metricBlock} style={{ alignItems: 'flex-end' }}>
          <span className={styles.metricTitle}>Protocol Lost</span>
          <span className={styles.metricValueLoss}>{formatCurrency(summary.protocolLostUsd)}</span>
        </div>
      </div>
      
      <div className={styles.tokenSummaryList}>
        <div className={styles.metricTitle} style={{ marginBottom: '8px' }}>Token Balance Diff Summary</div>
        {summary.tokenSummaries.map((ts, idx) => (
          <div key={idx} className={styles.tokenRow}>
            <span className={styles.tokenSymbol}>{ts.symbol}</span>
            <span className={styles.tokenAttacker}>Attacker: {ts.attackerDiff}</span>
            <span className={styles.tokenProtocol}>Protocol: {ts.protocolDiff}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
