import type { HackListQuery, HackIncident } from '@aegis/core';

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
