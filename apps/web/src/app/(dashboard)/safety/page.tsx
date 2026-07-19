'use client';

import React, { useEffect, useState } from 'react';
import styles from '../../../components/safety/Safety.module.css';
import { SafetyStatsCards } from '../../../components/safety/SafetyStatsCards';
import { SafetyCharts } from '../../../components/safety/SafetyCharts';
import { SafetyTables } from '../../../components/safety/SafetyTables';
import { safetyApi, type RecentScan } from '../../../lib/api-client';
import type {
  SafetyStatsResponse,
  SafetyTimelineResponse,
  TopFindingsResponse,
  SafetyRulesResponse,
} from '@aegis/core';

export default function SafetyDashboardPage(): React.ReactElement {
  const [stats, setStats] = useState<SafetyStatsResponse | null>(null);
  const [timeline, setTimeline] = useState<SafetyTimelineResponse | null>(null);
  const [topFindings, setTopFindings] = useState<TopFindingsResponse | null>(null);
  const [rules, setRules] = useState<SafetyRulesResponse | null>(null);
  const [recentScans, setRecentScans] = useState<{ data: RecentScan[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const [statsRes, timelineRes, topFindingsRes, rulesRes, recentScansRes] = await Promise.all(
          [
            safetyApi.getStats(),
            safetyApi.getTimeline('day'),
            safetyApi.getTopFindings(10),
            safetyApi.getRules(),
            safetyApi.getRecentScans(),
          ],
        );

        if (isMounted) {
          setStats(statsRes);
          setTimeline(timelineRes);
          setTopFindings(topFindingsRes);
          setRules(rulesRes);
          setRecentScans(recentScansRes);
        }
      } catch (error) {
        console.error('Failed to load safety data:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchData();

    return (): void => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Safety Dashboard</h1>
        <p className={styles.pageSubtitle}>
          Real-time analytics for safety scanning, rule performance, and label distribution.
        </p>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading analytics...</div>
      ) : (
        <>
          <SafetyStatsCards stats={stats} />
          <SafetyCharts stats={stats} timeline={timeline} topFindings={topFindings} rules={rules} />
          <SafetyTables rules={rules} recentScans={recentScans} />
        </>
      )}
    </div>
  );
}
