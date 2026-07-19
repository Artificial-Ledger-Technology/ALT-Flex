import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
const MotionDiv = motion.div as React.ElementType;
import type { ChainStat } from '../../lib/api-client';
import styles from './Charts.module.css';

interface ChainChartProps {
  data: ChainStat[];
  isLoading: boolean;
}

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627EEA',
  bsc: '#F3BA2F',
  polygon: '#8247E5',
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
  solana: '#14F195',
  avalanche: '#E84142',
  fantom: '#13B5C1',
  base: '#0052FF',
  default: '#6b7280',
};

export function ChainChart({ data, isLoading }: ChainChartProps): React.ReactNode {
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const getChainColor = (chainName: string): string => {
    const normalized = chainName.toLowerCase();
    for (const [key, color] of Object.entries(CHAIN_COLORS)) {
      if (normalized.includes(key)) return color;
    }
    return CHAIN_COLORS['default'] as string;
  };

  return (
    <MotionDiv
      className={styles.chartCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Losses by Chain</h3>
      </div>
      <div className={styles.chartContainer}>
        {isLoading ? (
          <div className={styles.skeleton} />
        ) : data.length === 0 ? (
          <div className={styles.emptyState}>No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="totalLossUsd"
                nameKey="chain"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getChainColor(entry.chain)} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
                itemStyle={{ color: 'var(--text-primary)' }}
                formatter={(value: number): [string, string] => [
                  formatCurrency(value),
                  'Total Loss',
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </MotionDiv>
  );
}
