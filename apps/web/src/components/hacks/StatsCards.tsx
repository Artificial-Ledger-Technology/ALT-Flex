import { Activity, DollarSign, RefreshCw, Layers, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
const MotionDiv = motion.div as React.ElementType;
import type { DashboardStats } from '../../lib/api-client';
import styles from './StatsCards.module.css';

interface StatsCardsProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export function StatsCards({ stats, isLoading }: StatsCardsProps): React.ReactNode {
  const formatCurrency = (val: number): string => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const formatPercentage = (val: number): string => {
    return `${val.toFixed(1)}%`;
  };

  const recoveryRate =
    stats && stats.totalLossUsd > 0 ? (stats.totalRecoveredUsd / stats.totalLossUsd) * 100 : 0;

  return (
    <MotionDiv
      className={styles.grid}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <MotionDiv className={styles.card} variants={cardVariants}>
        <div className={styles.cardHeader}>
          <span>Total Incidents</span>
          <Activity size={18} className={styles.cardIcon} style={{ color: 'var(--accent-cyan)' }} />
        </div>
        <div
          className={styles.cardValue}
          style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}
        >
          {isLoading || !stats ? (
            <div className={styles.skeleton} />
          ) : (
            <>
              {(stats.totalIncidents ?? 0).toLocaleString()}
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--accent-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <TrendingUp size={12} style={{ marginRight: '2px' }} />
                +12%
              </span>
            </>
          )}
        </div>
      </MotionDiv>

      <MotionDiv className={styles.card} variants={cardVariants}>
        <div className={styles.cardHeader}>
          <span>Total Value Lost</span>
          <DollarSign
            size={18}
            className={styles.cardIcon}
            style={{ color: 'var(--accent-red)' }}
          />
        </div>
        <div className={styles.cardValue}>
          {isLoading || !stats ? (
            <div className={styles.skeleton} />
          ) : (
            formatCurrency(stats.totalLossUsd ?? 0)
          )}
        </div>
      </MotionDiv>

      <MotionDiv className={styles.card} variants={cardVariants}>
        <div className={styles.cardHeader}>
          <span>Funds Recovered</span>
          <RefreshCw
            size={18}
            className={styles.cardIcon}
            style={{ color: 'var(--accent-emerald)' }}
          />
        </div>
        <div className={styles.cardValue}>
          {isLoading || !stats ? (
            <div className={styles.skeleton} />
          ) : (
            formatPercentage(recoveryRate)
          )}
        </div>
      </MotionDiv>

      <MotionDiv className={styles.card} variants={cardVariants}>
        <div className={styles.cardHeader}>
          <span>Protocols Affected</span>
          <Layers size={18} className={styles.cardIcon} style={{ color: 'var(--accent-purple)' }} />
        </div>
        <div className={styles.cardValue}>
          {isLoading || !stats ? (
            <div className={styles.skeleton} />
          ) : (
            (stats.uniqueProtocols ?? 0).toLocaleString()
          )}
        </div>
      </MotionDiv>
    </MotionDiv>
  );
}
