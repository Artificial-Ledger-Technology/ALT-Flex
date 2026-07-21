'use client';

import React, { useState, useMemo } from 'react';
import styles from './Safety.module.css';
import type { SafetyRulesResponse } from '@aegis/core';
import type { RecentScan } from '../../lib/api-client';

export function SafetyTables({
  rules,
  recentScans,
}: {
  rules: SafetyRulesResponse | null;
  recentScans: { data: RecentScan[] } | null;
}): React.ReactElement {
  return (
    <div className={styles.tablesGrid}>
      <RulePerformanceTable rules={rules} />
      <RecentScansTable recentScans={recentScans} />
    </div>
  );
}

function RulePerformanceTable({
  rules,
}: {
  rules: SafetyRulesResponse | null;
}): React.ReactElement {
  const [sortField, setSortField] = useState<'hitCount' | 'name'>('hitCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedRules = useMemo(() => {
    if (!rules) return [];
    return [...rules.data].sort((a, b) => {
      const fieldA = a[sortField];
      const fieldB = b[sortField];

      let comp = 0;
      if (typeof fieldA === 'string' && typeof fieldB === 'string') {
        comp = fieldA.localeCompare(fieldB);
      } else if (typeof fieldA === 'number' && typeof fieldB === 'number') {
        comp = fieldA - fieldB;
      }

      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [rules, sortField, sortOrder]);

  const handleSort = (field: 'hitCount' | 'name'): void => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeader}>
        <h3 className={styles.tableTitle}>Rule Performance</h3>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.dataGrid}>
          <thead>
            <tr>
              <th
                style={{ width: '40%' }}
                onClick={(): void => handleSort('name')}
                scope="col"
                aria-sort={
                  sortField === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'
                }
              >
                Rule {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col">Category</th>
              <th
                onClick={(): void => handleSort('hitCount')}
                scope="col"
                aria-sort={
                  sortField === 'hitCount'
                    ? sortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                Hits {sortField === 'hitCount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col">FPR</th>
            </tr>
          </thead>
          <tbody>
            {sortedRules.map((rule) => (
              <tr key={rule.ruleId}>
                <td>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{rule.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rule.ruleId}</div>
                </td>
                <td>{rule.category}</td>
                <td>{rule.hitCount.toLocaleString()}</td>
                <td>
                  {rule.falsePositiveRate !== undefined
                    ? `${(rule.falsePositiveRate * 100).toFixed(1)}%`
                    : 'N/A'}
                </td>
              </tr>
            ))}
            {sortedRules.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                  No rule data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentScansTable({
  recentScans,
}: {
  recentScans: { data: RecentScan[] } | null;
}): React.ReactElement {
  const getBadgeClass = (label: string): string => {
    switch (label) {
      case 'safe':
        return styles.badgeSafe ?? '';
      case 'suspicious':
        return styles.badgeSuspicious ?? '';
      case 'malicious':
        return styles.badgeMalicious ?? '';
      default:
        return styles.badgeUnanalyzed ?? '';
    }
  };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeader}>
        <h3 className={styles.tableTitle}>Most Recent Scans</h3>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.dataGrid}>
          <thead>
            <tr>
              <th scope="col">Skill / ID</th>
              <th scope="col">Label</th>
              <th scope="col">Score</th>
              <th scope="col">Time</th>
            </tr>
          </thead>
          <tbody>
            {recentScans?.data.map((scan) => (
              <tr key={scan.id}>
                <td>
                  <div
                    style={{
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '180px',
                    }}
                  >
                    {scan.skillName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {scan.findingsCount} findings
                  </div>
                </td>
                <td>
                  <span className={`${styles.badge} ${getBadgeClass(scan.label)}`}>
                    {scan.label}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      color:
                        scan.score > 80
                          ? 'var(--accent-red)'
                          : scan.score > 40
                            ? 'var(--accent-amber)'
                            : 'var(--text-primary)',
                    }}
                  >
                    {scan.score}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(scan.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </td>
              </tr>
            ))}
            {(!recentScans || recentScans.data.length === 0) && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                  No recent scans
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
