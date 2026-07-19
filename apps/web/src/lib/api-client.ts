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

export interface RecentScan {
  id: string;
  skillName: string;
  label: 'safe' | 'suspicious' | 'malicious' | 'unanalyzed';
  score: number;
  findingsCount: number;
  timestamp: string;
}

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

import { clientEnv } from './env';

const API_BASE = `${clientEnv.NEXT_PUBLIC_API_URL}/api/v1`;

export const hacksApi = {
  async getHacks(params?: HackListQuery): Promise<PaginatedResponse<HackIncident>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }

    const queryStr = searchParams.toString();
    const url = `${API_BASE}/hacks${queryStr ? `?${queryStr}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch hacks: ${response.statusText}`);
    }

    const responseData: unknown = await response.json();
    return responseData as PaginatedResponse<HackIncident>;
  },

  async getHackDetails(id: string): Promise<HackIncident> {
    const response = await fetch(`${API_BASE}/hacks/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch hack details: ${response.statusText}`);
    }

    const responseData: unknown = await response.json();
    return responseData as HackIncident;
  },

  async getDashboardStats(
    params?: Record<string, string | string[] | boolean | number>,
  ): Promise<DashboardStats> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) value.forEach((v) => searchParams.append(key, String(v)));
          else searchParams.append(key, String(value));
        }
      });
    }
    const queryStr = searchParams.toString();
    const response = await fetch(`${API_BASE}/hacks/stats${queryStr ? `?${queryStr}` : ''}`);
    if (!response.ok) throw new Error(`Failed to fetch stats: ${response.statusText}`);
    const responseData: unknown = await response.json();
    return responseData as DashboardStats;
  },

  async getTimelineStats(
    params?: Record<string, string | string[] | boolean | number>,
  ): Promise<{ timeline: TimelineDataPoint[] }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) value.forEach((v) => searchParams.append(key, String(v)));
          else searchParams.append(key, String(value));
        }
      });
    }
    const queryStr = searchParams.toString();
    const response = await fetch(
      `${API_BASE}/hacks/stats/timeline${queryStr ? `?${queryStr}` : ''}`,
    );
    if (!response.ok) throw new Error(`Failed to fetch timeline: ${response.statusText}`);
    const responseData: unknown = await response.json();
    return responseData as { timeline: TimelineDataPoint[] };
  },

  async getVectorStats(
    params?: Record<string, string | string[] | boolean | number>,
  ): Promise<{ vectors: VectorStat[] }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) value.forEach((v) => searchParams.append(key, String(v)));
          else searchParams.append(key, String(value));
        }
      });
    }
    const queryStr = searchParams.toString();
    const response = await fetch(`${API_BASE}/hacks/vectors${queryStr ? `?${queryStr}` : ''}`);
    if (!response.ok) throw new Error(`Failed to fetch vectors: ${response.statusText}`);
    const responseData: unknown = await response.json();
    return responseData as { vectors: VectorStat[] };
  },

  async getChainStats(
    params?: Record<string, string | string[] | boolean | number>,
  ): Promise<{ chains: ChainStat[] }> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) value.forEach((v) => searchParams.append(key, String(v)));
          else searchParams.append(key, String(value));
        }
      });
    }
    const queryStr = searchParams.toString();
    const response = await fetch(`${API_BASE}/hacks/chains${queryStr ? `?${queryStr}` : ''}`);
    if (!response.ok) throw new Error(`Failed to fetch chains: ${response.statusText}`);
    const responseData: unknown = await response.json();
    return responseData as { chains: ChainStat[] };
  },
};

export const skillsApi = {
  async getSkills(
    params?: Record<string, string | string[] | boolean | number>,
  ): Promise<PaginatedResponse<AISkillFile>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) value.forEach((v) => searchParams.append(key, String(v)));
          else searchParams.append(key, String(value));
        }
      });
    }

    const queryStr = searchParams.toString();
    const url = `${API_BASE}/skills${queryStr ? `?${queryStr}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch skills: ${response.statusText}`);
    }

    const responseData: unknown = await response.json();
    return responseData as PaginatedResponse<AISkillFile>;
  },

  async getSkillContent(id: string): Promise<{ content: string }> {
    const response = await fetch(`${API_BASE}/skills/${id}/content`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch skill content: ${response.statusText}`);
    }

    const responseData: unknown = await response.json();
    return responseData as { content: string };
  },

  async incrementCopyCount(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/skills/${id}/copy`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to increment copy count: ${response.statusText}`);
    }
  },

  async toggleStar(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/skills/${id}/star`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle star: ${response.statusText}`);
    }
  },

  async getSkillSafety(id: string): Promise<SkillSafetyResponse> {
    const response = await fetch(`${API_BASE}/skills/${id}/safety`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch skill safety: ${response.statusText}`);
    }

    const responseData: unknown = await response.json();
    return responseData as SkillSafetyResponse;
  },
};

export const safetyApi = {
  async getStats(): Promise<SafetyStatsResponse> {
    const response = await fetch(`${API_BASE}/safety/stats`);
    if (!response.ok) throw new Error('Failed to fetch safety stats');
    const data: unknown = await response.json();
    return data as SafetyStatsResponse;
  },

  async getRules(): Promise<SafetyRulesResponse> {
    const response = await fetch(`${API_BASE}/safety/rules`);
    if (!response.ok) throw new Error('Failed to fetch safety rules');
    const data: unknown = await response.json();
    return data as SafetyRulesResponse;
  },

  async getTimeline(interval: 'day' | 'week' | 'month' = 'day'): Promise<SafetyTimelineResponse> {
    const params = new URLSearchParams({ interval });
    const response = await fetch(`${API_BASE}/safety/timeline?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch safety timeline');
    const data: unknown = await response.json();
    return data as SafetyTimelineResponse;
  },

  async getTopFindings(limit = 10): Promise<TopFindingsResponse> {
    const params = new URLSearchParams({ limit: limit.toString() });
    const response = await fetch(`${API_BASE}/safety/findings/top?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch top findings');
    const data: unknown = await response.json();
    return data as TopFindingsResponse;
  },

  async getRecentScans(): Promise<{ data: RecentScan[] }> {
    // Mock data since endpoint does not exist yet
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
