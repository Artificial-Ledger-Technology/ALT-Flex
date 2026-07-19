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
import type { VectorStat } from '../../lib/api-client';
import styles from './Charts.module.css';

interface VectorChartProps {
  data: VectorStat[];
  isLoading: boolean;
}

const COLORS = [
  'var(--accent-cyan)',
  'var(--accent-purple)',
  'var(--accent-emerald)',
  'var(--accent-amber)',
  'var(--accent-red)',
  '#3b82f6',
  '#f43f5e',
  '#14b8a6',
  '#06b6d4',
  '#64748b',
];

export function VectorChart({ data, isLoading }: VectorChartProps): React.ReactNode {
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <MotionDiv
      className={styles.chartCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Attack Vectors</h3>
      </div>
      <div className={styles.chartContainer}>
        {isLoading ? (
          <div className={styles.skeleton} />
        ) : data.length === 0 ? (
          <div className={styles.emptyState}>No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tickFormatter={formatCurrency}
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="vector"
                type="category"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip
                cursor={{ fill: 'var(--bg-tertiary)' }}
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
              <Bar dataKey="totalLossUsd" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </MotionDiv>
  );
}
