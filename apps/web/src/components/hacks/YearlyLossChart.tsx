import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
const MotionDiv = motion.div as React.ElementType;
import type { TimelineDataPoint } from '../../lib/api-client';
import styles from './Charts.module.css';

interface YearlyLossChartProps {
  data: TimelineDataPoint[];
  isLoading: boolean;
}

export function YearlyLossChart({ data, isLoading }: YearlyLossChartProps): React.ReactNode {
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatYear = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.getFullYear().toString();
  };

  return (
    <MotionDiv
      className={styles.chartCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Losses by Year</h3>
      </div>
      <div className={styles.chartContainer}>
        {isLoading ? (
          <div className={styles.skeleton} />
        ) : data.length === 0 ? (
          <div className={styles.emptyState}>No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatYear}
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tickFormatter={formatCurrency}
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip
                cursor={{ fill: 'var(--bg-tertiary)' }}
                contentStyle={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
                itemStyle={{ color: 'var(--text-primary)' }}
                labelFormatter={formatYear}
                formatter={(value: number): [string, string] => [
                  formatCurrency(value),
                  'Total Loss',
                ]}
              />
              <Bar dataKey="lossUsd" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="var(--accent-purple)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </MotionDiv>
  );
}
