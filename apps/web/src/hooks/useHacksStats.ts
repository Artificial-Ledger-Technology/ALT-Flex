/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import useSWR from 'swr';
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

/**
 * Convert URLSearchParams into a Record for API consumption.
 */
function searchParamsToRecord(
  searchParams: URLSearchParams | null,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  if (searchParams === null) return params;

  searchParams.forEach((value, key) => {
    const existing = params[key];
    if (existing !== undefined) {
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        params[key] = [existing, value];
      }
    } else {
      params[key] = value;
    }
  });

  return params;
}

/**
 * SWR-powered hook for all hacks dashboard statistics.
 * Each stat request is independently cached and retried.
 */
export function useHacksStats(): HacksStatsData & { isLoading: boolean; error: Error | null } {
  const searchParams = useSearchParams();
  const params = searchParamsToRecord(searchParams);
  const paramKey = JSON.stringify(params);

  const dashboardFetcher = async (): Promise<DashboardStats> => hacksApi.getDashboardStats(params);
  const timelineFetcher = async (): Promise<{ timeline: TimelineDataPoint[] }> =>
    hacksApi.getTimelineStats({ ...params, granularity: 'month' });
  const timelineYearlyFetcher = async (): Promise<{ timeline: TimelineDataPoint[] }> =>
    hacksApi.getTimelineStats({ ...params, granularity: 'year' });
  const vectorsFetcher = async (): Promise<{ vectors: VectorStat[] }> =>
    hacksApi.getVectorStats(params);
  const chainsFetcher = async (): Promise<{ chains: ChainStat[] }> =>
    hacksApi.getChainStats(params);

  const dashboard = useSWR<DashboardStats, Error>([`/hacks/stats`, paramKey], dashboardFetcher);

  const timeline = useSWR<{ timeline: TimelineDataPoint[] }, Error>(
    [`/hacks/stats/timeline/month`, paramKey],
    timelineFetcher,
  );

  const timelineYearly = useSWR<{ timeline: TimelineDataPoint[] }, Error>(
    [`/hacks/stats/timeline/year`, paramKey],
    timelineYearlyFetcher,
  );

  const vectors = useSWR<{ vectors: VectorStat[] }, Error>(
    [`/hacks/vectors`, paramKey],
    vectorsFetcher,
  );

  const chains = useSWR<{ chains: ChainStat[] }, Error>([`/hacks/chains`, paramKey], chainsFetcher);

  const isLoading =
    dashboard.isLoading ||
    timeline.isLoading ||
    timelineYearly.isLoading ||
    vectors.isLoading ||
    chains.isLoading;

  const firstError =
    dashboard.error ??
    timeline.error ??
    timelineYearly.error ??
    vectors.error ??
    chains.error ??
    null;

  return {
    dashboard: dashboard.data ?? null,
    timeline: timeline.data?.timeline ?? [],
    timelineYearly: timelineYearly.data?.timeline ?? [],
    vectors: vectors.data?.vectors ?? [],
    chains: chains.data?.chains ?? [],
    isLoading,
    error: firstError ?? null,
  };
}
