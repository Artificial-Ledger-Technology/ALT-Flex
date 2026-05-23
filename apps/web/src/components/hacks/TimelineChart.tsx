import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TimelineDataPoint } from '../../lib/api-client';
import styles from './Charts.module.css';

interface TimelineChartProps {
  data: TimelineDataPoint[];
  isLoading: boolean;
}

export function TimelineChart({ data, isLoading }: TimelineChartProps): React.ReactNode {
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Losses Over Time</h3>
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
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatDate}
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
                contentStyle={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
                itemStyle={{ color: 'var(--text-primary)' }}
                labelFormatter={formatDate}
                formatter={(value: number): [string, string] => [formatCurrency(value), 'Loss']}
              />
              <Area
                type="monotone"
                dataKey="lossUsd"
                stroke="#0ea5e9"
                fillOpacity={1}
                fill="url(#colorLoss)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
