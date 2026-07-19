/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/require-await */
import useSWR from 'swr';
import { hacksApi, type PaginatedResponse } from '../lib/api-client';
import type { HackListQuery, HackIncident } from '@aegis/core';

export interface UseHacksResult {
  data: PaginatedResponse<HackIncident> | null;
  isLoading: boolean;
  error: Error | null;
  mutate: () => Promise<PaginatedResponse<HackIncident> | undefined>;
}

/**
 * SWR-powered hook for fetching paginated hacks.
 * Supports automatic request deduplication, revalidation-on-focus, and retry.
 */
export function useHacks(params?: HackListQuery): UseHacksResult {
  const serializedKey = params !== undefined ? JSON.stringify(params) : '';
  const cacheKey = `/hacks${serializedKey.length > 0 ? `?_params=${serializedKey}` : ''}`;

  const fetcher = async (): Promise<PaginatedResponse<HackIncident>> => hacksApi.getHacks(params);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<HackIncident>, Error>(
    cacheKey,
    fetcher,
  );

  return {
    data: data ?? null,
    isLoading,
    error: error ?? null,
    mutate,
  };
}
