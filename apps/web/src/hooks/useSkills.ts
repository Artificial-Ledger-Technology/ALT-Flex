/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { skillsApi, type PaginatedResponse } from '../lib/api-client';
import type { AISkillFile } from '@aegis/core';

export interface UseSkillsResult {
  skills: AISkillFile[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
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
 * SWR-powered hook for fetching paginated skills.
 * Supports automatic dedup, caching, and cache invalidation via `refresh()`.
 */
export function useSkills(): UseSkillsResult {
  const searchParams = useSearchParams();
  const params = searchParamsToRecord(searchParams);
  const paramKey = JSON.stringify(params);

  const fetcher = async (): Promise<PaginatedResponse<AISkillFile>> => skillsApi.getSkills(params);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<AISkillFile>, Error>(
    [`/skills`, paramKey],
    fetcher,
  );

  const refresh = (): void => {
    void mutate();
  };

  return {
    skills: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    error: error ?? null,
    refresh,
  };
}
