import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Attack Vectors</h3>
      </div>
      <div className={styles.chartContainer}>
        {isLoading ? (
          <div className={styles.skeleton} />
        ) : data.length === 0 ? (
          <div
            style={{
              display: 'flex',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            No data available
          </div>
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
                nameKey="vector"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
    </div>
  );
}
