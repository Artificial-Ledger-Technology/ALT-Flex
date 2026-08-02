import { Queue, type JobsOptions } from 'bullmq';
import { type Chain } from '@aegis/core';
import { type SimulationRequest } from '../../domain/forge-types.js';

export interface ForensicJobData {
  hackIncidentId: string;
  chain: Chain;
  mode: 'simulation' | 'trace';
  txHash?: string;
  simulationRequest?: SimulationRequest;
}

export const FORENSICS_QUEUE_NAME = 'aegis:queue:forensics';

export function createForensicsQueue(connection: any): Queue<ForensicJobData> {
  return new Queue<ForensicJobData>(FORENSICS_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });
}
