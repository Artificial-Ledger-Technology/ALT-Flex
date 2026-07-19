/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import useSWR from 'swr';
import { safetyApi, type RecentScan } from '../lib/api-client';
import type {
  SafetyStatsResponse,
  SafetyRulesResponse,
  SafetyTimelineResponse,
  TopFindingsResponse,
} from '@aegis/core';

export interface UseSafetyStatsResult {
  stats: SafetyStatsResponse | null;
  rules: SafetyRulesResponse | null;
  timeline: SafetyTimelineResponse | null;
  topFindings: TopFindingsResponse | null;
  recentScans: { data: RecentScan[] } | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * SWR-powered hook for all safety dashboard analytics.
 * Each endpoint is independently cached and retried.
 */
export function useSafetyStats(): UseSafetyStatsResult {
  const statsFetcher = async (): Promise<SafetyStatsResponse> => safetyApi.getStats();
  const rulesFetcher = async (): Promise<SafetyRulesResponse> => safetyApi.getRules();
  const timelineFetcher = async (): Promise<SafetyTimelineResponse> => safetyApi.getTimeline('day');
  const topFindingsFetcher = async (): Promise<TopFindingsResponse> => safetyApi.getTopFindings(10);
  const recentScansFetcher = async (): Promise<{ data: RecentScan[] }> =>
    safetyApi.getRecentScans();

  const stats = useSWR<SafetyStatsResponse, Error>('/safety/stats', statsFetcher);
  const rules = useSWR<SafetyRulesResponse, Error>('/safety/rules', rulesFetcher);
  const timeline = useSWR<SafetyTimelineResponse, Error>('/safety/timeline', timelineFetcher);
  const topFindings = useSWR<TopFindingsResponse, Error>(
    '/safety/findings/top',
    topFindingsFetcher,
  );
  const recentScans = useSWR<{ data: RecentScan[] }, Error>(
    '/safety/recent-scans',
    recentScansFetcher,
  );

  const isLoading =
    stats.isLoading ||
    rules.isLoading ||
    timeline.isLoading ||
    topFindings.isLoading ||
    recentScans.isLoading;

  const firstError =
    stats.error ?? rules.error ?? timeline.error ?? topFindings.error ?? recentScans.error ?? null;

  return {
    stats: stats.data ?? null,
    rules: rules.data ?? null,
    timeline: timeline.data ?? null,
    topFindings: topFindings.data ?? null,
    recentScans: recentScans.data ?? null,
    isLoading,
    error: firstError ?? null,
  };
}
