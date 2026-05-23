/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-redundant-type-constituents */
import { useState, useEffect } from 'react';
import { hacksApi, type DashboardStats, type TimelineDataPoint, type VectorStat, type ChainStat } from '@/lib/api-client';

export interface HacksStatsData {
  dashboard: DashboardStats | null;
  timeline: TimelineDataPoint[];
  vectors: VectorStat[];
  chains: ChainStat[];
}

export function useHacksStats(): HacksStatsData & { isLoading: boolean; error: Error | null } {
  const [data, setData] = useState<HacksStatsData>({
    dashboard: null,
    timeline: [],
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

        const [dashboard, timelineRes, vectorsRes, chainsRes] = await Promise.all([
          hacksApi.getDashboardStats(),
          hacksApi.getTimelineStats('month'),
          hacksApi.getVectorStats(),
          hacksApi.getChainStats(),
        ]);

        if (mounted) {
          setData({
            dashboard,
            timeline: timelineRes.timeline,
            vectors: vectorsRes.vectors,
            chains: chainsRes.chains,
          });
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

    fetchStats().catch((err) => {
      console.error('Unhandled error in useHacksStats:', err);
    });

    return (): void => {
      mounted = false;
    };
  }, []);

  return { ...data, isLoading, error };
}
