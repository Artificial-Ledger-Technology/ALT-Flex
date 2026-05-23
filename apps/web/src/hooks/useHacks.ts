/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-redundant-type-constituents */
import { useState, useEffect, useCallback } from 'react';
import { hacksApi, type PaginatedResponse } from '@/lib/api-client';
import type { HackListQuery, HackIncident } from '@aegis/core';

interface UseHacksResult {
  data: PaginatedResponse<HackIncident> | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useHacks(initialParams?: HackListQuery): UseHacksResult {
  const [data, setData] = useState<PaginatedResponse<HackIncident> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHacks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await hacksApi.getHacks(initialParams);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error fetching hacks'));
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(initialParams)]);

  useEffect(() => {
    void fetchHacks();
  }, [fetchHacks]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchHacks,
  };
}
