import styles from './HackBadges.module.css';

interface BadgeProps {
  label: string;
}

export function SeverityBadge({ label }: BadgeProps): React.ReactNode {
  const getSeverityClass = (severity: string): string => {
    const s = severity.toLowerCase();
    if (s === 'critical') return styles.severityCritical ?? '';
    if (s === 'high') return styles.severityHigh ?? '';
    if (s === 'medium') return styles.severityMedium ?? '';
    if (s === 'low') return styles.severityLow ?? '';
    return styles.severityLow ?? '';
  };

  return (
    <span className={`${styles.badge ?? ''} ${getSeverityClass(label)}`}>
      {label}
    </span>
  );
}

export function ChainBadge({ label }: BadgeProps): React.ReactNode {
  const getChainClass = (chain: string): string => {
    const c = chain.toLowerCase();
    if (c.includes('ethereum') || c === 'eth') return styles.chainEthereum ?? '';
    if (c.includes('bsc') || c.includes('binance')) return styles.chainBsc ?? '';
    if (c.includes('polygon') || c === 'matic') return styles.chainPolygon ?? '';
    if (c.includes('arbitrum')) return styles.chainArbitrum ?? '';
    if (c.includes('optimism')) return styles.chainOptimism ?? '';
    if (c.includes('solana')) return styles.chainSolana ?? '';
    return styles.chainDefault ?? '';
  };

  return (
    <span className={`${styles.badge} ${getChainClass(label)}`}>
      {label}
    </span>
  );
}

export function VectorBadge({ label }: BadgeProps): React.ReactNode {
  return (
    <span className={`${styles.badge ?? ''} ${styles.vectorBadge ?? ''}`}>
      {label}
    </span>
  );
}
