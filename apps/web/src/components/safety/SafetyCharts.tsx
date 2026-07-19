'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import styles from './Safety.module.css';
import type {
  SafetyStatsResponse,
  SafetyTimelineResponse,
  TopFindingsResponse,
  SafetyRulesResponse,
} from '@aegis/core';

// Colors matched to badges
const COLORS = {
  safe: '#10b981',
  suspicious: '#f59e0b',
  malicious: '#ef4444',
  unanalyzed: '#6b7280',
};

export function SafetyCharts({
  stats,
  timeline,
  topFindings,
  rules,
}: {
  stats: SafetyStatsResponse | null;
  timeline: SafetyTimelineResponse | null;
  topFindings: TopFindingsResponse | null;
  rules: SafetyRulesResponse | null;
}): React.ReactElement {
  // 1. Label Distribution Data
  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Safe', value: stats.labelDistribution.safe, fill: COLORS.safe },
      { name: 'Suspicious', value: stats.labelDistribution.suspicious, fill: COLORS.suspicious },
      { name: 'Malicious', value: stats.labelDistribution.malicious, fill: COLORS.malicious },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // 2. Scan Timeline Data
  const areaData = useMemo(() => {
    if (!timeline) return [];
    return timeline.data.map((pt) => ({
      date: new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      safe: pt.safe,
      suspicious: pt.suspicious,
      malicious: pt.malicious,
      total: pt.total,
    }));
  }, [timeline]);

  // 3. Top Triggered Rules Data
  const barData = useMemo(() => {
    if (!topFindings) return [];
    return topFindings.data.map((f) => ({
      name: f.ruleName.length > 20 ? f.ruleName.substring(0, 20) + '...' : f.ruleName,
      fullName: f.ruleName,
      triggers: f.triggerCount,
      severity: f.severity.toLowerCase(),
    }));
  }, [topFindings]);

  // 4. Category Breakdown Data
  const categoryData = useMemo(() => {
    if (!rules) return [];
    // Group by category, then just hit count for simplicity since we don't have severity in rules
    const catMap = new Map<string, number>();
    rules.data.forEach((r) => {
      const current = catMap.get(r.category) ?? 0;
      catMap.set(r.category, current + r.hitCount);
    });
    return Array.from(catMap.entries())
      .map(([name, Hits]) => ({ name, Hits }))
      .sort((a, b) => b.Hits - a.Hits)
      .slice(0, 5); // Top 5 categories
  }, [rules]);

  return (
    <div className={styles.chartsGrid}>
      {/* Timeline Chart */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Scan Timeline (Last 30 Days)</h3>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.safe} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.safe} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMalicious" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.malicious} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.malicious} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Area
                type="monotone"
                dataKey="malicious"
                name="Malicious"
                stackId="1"
                stroke={COLORS.malicious}
                fill="url(#colorMalicious)"
              />
              <Area
                type="monotone"
                dataKey="safe"
                name="Safe"
                stackId="1"
                stroke={COLORS.safe}
                fill="url(#colorSafe)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Label Distribution */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Label Distribution</h3>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Triggered Rules */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Top Triggered Rules</h3>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'var(--bg-tertiary)' }}
                contentStyle={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
                formatter={(value: number): [number, string] => [value, 'Triggers']}
              />
              <Bar dataKey="triggers" fill="var(--accent-amber)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Top Categories by Hits</h3>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'var(--bg-tertiary)' }}
                contentStyle={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
              <Bar dataKey="Hits" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
