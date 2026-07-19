import { useState, useEffect } from 'react';
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

export function useSkills(): UseSkillsResult {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PaginatedResponse<AISkillFile> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = (): void => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    let mounted = true;

    async function fetchSkills(): Promise<void> {
      try {
        setIsLoading(true);
        setError(null);

        const params: Record<string, string | string[]> = {};
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (searchParams) {
          searchParams.forEach((value, key) => {
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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

        const res = await skillsApi.getSkills(params);

        if (mounted) {
          setData(res);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch skills'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchSkills();

    return (): void => {
      mounted = false;
    };
  }, [searchParams, refreshTrigger]);

  return {
    skills: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh,
  };
}
