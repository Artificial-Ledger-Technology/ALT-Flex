/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Type-Safe API Client Layer (P4-FE-009)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Centralized API client with retry logic, exponential backoff, and
 * user-friendly error handling. All endpoint methods are usable both
 * in React Server Components (direct await) and client-side SWR hooks.
 *
 * @module apps/web/lib/api-client
 */

import type {
  HackListQuery,
  HackIncident,
  AISkillFile,
  SkillSafetyResponse,
  SafetyStatsResponse,
  SafetyRulesResponse,
  SafetyTimelineResponse,
  TopFindingsResponse,
} from '@aegis/core';
import { clientEnv } from './env';

// ── Error Types ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Shared Types ────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalIncidents: number;
  totalLossUsd: number;
  totalRecoveredUsd: number;
  avgLossUsd: number;
  medianLossUsd: number;
  pocCoverage: number;
  uniqueProtocols: number;
  uniqueChains: number;
}

export interface TimelineDataPoint {
  timestamp: string;
  lossUsd: number;
}

export interface VectorStat {
  vector: string;
  count: number;
  totalLossUsd: number;
}

export interface ChainStat {
  chain: string;
  count: number;
  totalLossUsd: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RecentScan {
  id: string;
  skillName: string;
  label: 'safe' | 'suspicious' | 'malicious' | 'unanalyzed';
  score: number;
  findingsCount: number;
  timestamp: string;
}

// ── ApiClient Class ─────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic request method with retry logic (3 retries, exponential backoff).
   * Produces user-friendly `ApiError` instances on failure.
   */
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
          ...init,
        });

        if (!response.ok) {
          throw new ApiError(
            `Request failed: ${response.statusText}`,
            response.status,
            response.statusText,
            url,
          );
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        const data: unknown = await response.json();
        return data as T;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Don't retry on 4xx client errors (except 429 Too Many Requests)
        if (
          err instanceof ApiError &&
          err.status >= 400 &&
          err.status < 500 &&
          err.status !== 429
        ) {
          throw err;
        }

        // Don't retry if we've exhausted attempts
        if (attempt === MAX_RETRIES) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }

  /** Build a query string from a params object, filtering out empty values. */
  buildQuery(
    params?: Record<string, string | string[] | boolean | number | undefined | null>,
  ): string {
    if (!params) return '';
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach((v) => sp.append(key, String(v)));
      } else {
        sp.append(key, String(value));
      }
    });
    const qs = sp.toString();
    return qs.length > 0 ? `?${qs}` : '';
  }
}

// ── Singleton Instance ──────────────────────────────────────────────────────

const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;
const apiClient = new ApiClient(API_BASE);

// ── SWR Fetcher ─────────────────────────────────────────────────────────────

/**
 * Default SWR fetcher. Accepts a URL string (relative to API_BASE)
 * and returns parsed JSON. Used by `SWRProvider` as the global fetcher.
 */
export async function swrFetcher<T>(url: string): Promise<T> {
  return apiClient.request<T>(url.startsWith('/api/v1') ? url.replace('/api/v1', '') : url);
}

// ── Hacks API ───────────────────────────────────────────────────────────────

export const hacksApi = {
  async getHacks(params?: HackListQuery): Promise<PaginatedResponse<HackIncident>> {
    const query = apiClient.buildQuery(
      params as unknown as Record<string, string | string[] | boolean | number>,
    );
    return apiClient.request<PaginatedResponse<HackIncident>>(`/hacks${query}`);
  },

  async getHackDetails(id: string): Promise<HackIncident> {
    return apiClient.request<HackIncident>(`/hacks/${id}`);
  },

  async getDashboardStats(
    params?: Record<string, string | string[] | boolean | number>,
  ): Promise<DashboardStats> {
    const query = apiClient.buildQuery(params);
    return apiClient.request<DashboardStats>(`/hacks/stats${query}`);
  },

  async getTimelineStats(
    params?: Record<string, string | string[] | boolean | number>,
  ): Promise<{ timeline: TimelineDataPoint[] }> {
    const query = apiClient.buildQuery(params);
    return apiClient.request<{ timeline: TimelineDataPoint[] }>(`/hacks/stats/timeline${query}`);
  },

  async getVectorStats(
    params?: Record<string, string | string[] | boolean | number>,
  ): Promise<{ vectors: VectorStat[] }> {
    const query = apiClient.buildQuery(params);
    return apiClient.request<{ vectors: VectorStat[] }>(`/hacks/vectors${query}`);
  },

  async getChainStats(
    params?: Record<string, string | string[] | boolean | number>,
  ): Promise<{ chains: ChainStat[] }> {
    const query = apiClient.buildQuery(params);
    return apiClient.request<{ chains: ChainStat[] }>(`/hacks/chains${query}`);
  },
};

// ── Skills API ──────────────────────────────────────────────────────────────

export const skillsApi = {
  async getSkills(
    params?: Record<string, string | string[] | boolean | number>,
  ): Promise<PaginatedResponse<AISkillFile>> {
    const query = apiClient.buildQuery(params);
    return apiClient.request<PaginatedResponse<AISkillFile>>(`/skills${query}`);
  },

  async getSkillContent(id: string): Promise<{ content: string }> {
    return apiClient.request<{ content: string }>(`/skills/${id}/content`);
  },

  async incrementCopyCount(id: string): Promise<void> {
    return apiClient.request<void>(`/skills/${id}/copy`, { method: 'POST' });
  },

  async toggleStar(id: string): Promise<void> {
    return apiClient.request<void>(`/skills/${id}/star`, { method: 'POST' });
  },

  async getSkillSafety(id: string): Promise<SkillSafetyResponse> {
    return apiClient.request<SkillSafetyResponse>(`/skills/${id}/safety`);
  },
};

// ── Safety API ──────────────────────────────────────────────────────────────

export const safetyApi = {
  async getStats(): Promise<SafetyStatsResponse> {
    return apiClient.request<SafetyStatsResponse>('/safety/stats');
  },

  async getRules(): Promise<SafetyRulesResponse> {
    return apiClient.request<SafetyRulesResponse>('/safety/rules');
  },

  async getTimeline(interval: 'day' | 'week' | 'month' = 'day'): Promise<SafetyTimelineResponse> {
    const query = apiClient.buildQuery({ interval });
    return apiClient.request<SafetyTimelineResponse>(`/safety/timeline${query}`);
  },

  async getTopFindings(limit = 10): Promise<TopFindingsResponse> {
    const query = apiClient.buildQuery({ limit });
    return apiClient.request<TopFindingsResponse>(`/safety/findings/top${query}`);
  },

  async getRecentScans(): Promise<{ data: RecentScan[] }> {
    // Mock data — backend endpoint not yet implemented
    return Promise.resolve({
      data: [
        {
          id: '1',
          skillName: 'Flash Loan Exploit Pattern',
          label: 'malicious',
          score: 92,
          findingsCount: 4,
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          skillName: 'Reentrancy Guard Template',
          label: 'safe',
          score: 15,
          findingsCount: 0,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          skillName: 'Arbitrage Bot Logic',
          label: 'suspicious',
          score: 65,
          findingsCount: 2,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: '4',
          skillName: 'Basic ERC20 Implementation',
          label: 'safe',
          score: 5,
          findingsCount: 0,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '5',
          skillName: 'Obfuscated DelegateCall',
          label: 'malicious',
          score: 98,
          findingsCount: 6,
          timestamp: new Date(Date.now() - 90000000).toISOString(),
        },
      ],
    });
  },
};
