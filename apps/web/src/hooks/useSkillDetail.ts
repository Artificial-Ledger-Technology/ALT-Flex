/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import useSWR from 'swr';
import { skillsApi } from '../lib/api-client';
import type { SkillSafetyResponse } from '@aegis/core';

export interface UseSkillDetailResult {
  content: string | null;
  safety: SkillSafetyResponse | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * SWR-powered hook for fetching a single skill's content and safety data.
 * Pass `null` to skip fetching (conditional SWR).
 */
export function useSkillDetail(id: string | null): UseSkillDetailResult {
  const contentFetcher = async (): Promise<{ content: string }> => skillsApi.getSkillContent(id!);
  const safetyFetcher = async (): Promise<SkillSafetyResponse> => skillsApi.getSkillSafety(id!);

  const contentResult = useSWR<{ content: string }, Error>(
    id !== null ? `/skills/${id}/content` : null,
    contentFetcher,
  );

  const safetyResult = useSWR<SkillSafetyResponse, Error>(
    id !== null ? `/skills/${id}/safety` : null,
    safetyFetcher,
  );

  return {
    content: contentResult.data?.content ?? null,
    safety: safetyResult.data ?? null,
    isLoading: contentResult.isLoading || safetyResult.isLoading,
    error: contentResult.error ?? safetyResult.error ?? null,
  };
}
