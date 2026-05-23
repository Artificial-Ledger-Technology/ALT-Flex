/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
import type { HackListQuery, HackIncident } from '@aegis/core';

export interface DashboardStats {
  totalIncidents: number;
  totalLossUsd: number;
  recoveredUsd: number;
  recoveryRate: number;
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

const API_BASE = '/api/v1';

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

    return (await response.json()) as PaginatedResponse<HackIncident>;
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

    return (await response.json()) as HackIncident;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await fetch(`${API_BASE}/hacks/stats`);
    if (!response.ok) throw new Error(`Failed to fetch stats: ${response.statusText}`);
    return (await response.json()) as DashboardStats;
  },

  async getTimelineStats(granularity: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{ timeline: TimelineDataPoint[] }> {
    const response = await fetch(`${API_BASE}/hacks/stats/timeline?granularity=${granularity}`);
    if (!response.ok) throw new Error(`Failed to fetch timeline: ${response.statusText}`);
    return (await response.json()) as { timeline: TimelineDataPoint[] };
  },

  async getVectorStats(): Promise<{ vectors: VectorStat[] }> {
    const response = await fetch(`${API_BASE}/hacks/vectors`);
    if (!response.ok) throw new Error(`Failed to fetch vectors: ${response.statusText}`);
    return (await response.json()) as { vectors: VectorStat[] };
  },

  async getChainStats(): Promise<{ chains: ChainStat[] }> {
    const response = await fetch(`${API_BASE}/hacks/chains`);
    if (!response.ok) throw new Error(`Failed to fetch chains: ${response.statusText}`);
    return (await response.json()) as { chains: ChainStat[] };
  }
};
