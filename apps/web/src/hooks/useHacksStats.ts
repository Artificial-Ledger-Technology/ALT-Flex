import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  hacksApi,
  type DashboardStats,
  type TimelineDataPoint,
  type VectorStat,
  type ChainStat,
} from '../lib/api-client';

export interface HacksStatsData {
  dashboard: DashboardStats | null;
  timeline: TimelineDataPoint[];
  timelineYearly: TimelineDataPoint[];
  vectors: VectorStat[];
  chains: ChainStat[];
}

export function useHacksStats(): HacksStatsData & { isLoading: boolean; error: Error | null } {
  const searchParams = useSearchParams();

  const [data, setData] = useState<HacksStatsData>({
    dashboard: null,
    timeline: [],
    timelineYearly: [],
    vectors: [],
    chains: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchStats(): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);

        // Convert searchParams to an object
        const params: Record<string, string | string[]> = {};
        if (searchParams) {
          searchParams.forEach((value, key) => {
            if (params[key]) {
              if (Array.isArray(params[key])) {
                params[key].push(value);
              } else {
                params[key] = [params[key], value];
              }
            } else {
              params[key] = value;
            }
          });
        }

        const [dashboardRes, timelineRes, timelineYearRes, vectorsRes, chainsRes] =
          await Promise.allSettled([
            hacksApi.getDashboardStats(params),
            hacksApi.getTimelineStats({ ...params, granularity: 'month' }),
            hacksApi.getTimelineStats({ ...params, granularity: 'year' }),
            hacksApi.getVectorStats(params),
            hacksApi.getChainStats(params),
          ]);

        if (mounted) {
          setData({
            dashboard: dashboardRes.status === 'fulfilled' ? dashboardRes.value : null,
            timeline: timelineRes.status === 'fulfilled' ? timelineRes.value.timeline : [],
            timelineYearly:
              timelineYearRes.status === 'fulfilled' ? timelineYearRes.value.timeline : [],
            vectors: vectorsRes.status === 'fulfilled' ? vectorsRes.value.vectors : [],
            chains: chainsRes.status === 'fulfilled' ? chainsRes.value.chains : [],
          });

          const rejected = [
            dashboardRes,
            timelineRes,
            timelineYearRes,
            vectorsRes,
            chainsRes,
          ].filter((r) => r.status === 'rejected');
          if (rejected.length > 0) {
            console.error('Some stats failed to load:', rejected);
            if (dashboardRes.status === 'rejected') {
              setError(
                dashboardRes.reason instanceof Error
                  ? dashboardRes.reason
                  : new Error('Failed to load dashboard statistics'),
              );
            }
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchStats();

    return (): void => {
      mounted = false;
    };
  }, [searchParams]);

  return { ...data, isLoading, error };
}
