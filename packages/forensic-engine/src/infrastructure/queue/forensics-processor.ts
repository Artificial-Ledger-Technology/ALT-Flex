import { Worker, type Job } from 'bullmq';
import { FORENSICS_QUEUE_NAME, type ForensicJobData } from './forensics-queue.js';
import { type ForensicAnalysisUseCase } from '../../application/forensic-analysis.use-case.js';
import { type ForensicReport } from '../../domain/report-types.js';

export function createForensicsWorker(
  connection: any,
  useCase: ForensicAnalysisUseCase,
): Worker<ForensicJobData, ForensicReport> {
  return new Worker<ForensicJobData, ForensicReport>(
    FORENSICS_QUEUE_NAME,
    async (job: Job<ForensicJobData>): Promise<ForensicReport> => {
      const { hackIncidentId, chain, mode, txHash, simulationRequest } = job.data;

      const updateProgress = async (p: number) => {
        await job.updateProgress(p);
      };

      if (mode === 'trace') {
        if (!txHash) {
          throw new Error('txHash is required for trace mode');
        }
        return useCase.analyzeTrace(hackIncidentId, chain, txHash, updateProgress);
      } else if (mode === 'simulation') {
        if (!simulationRequest) {
          throw new Error('simulationRequest is required for simulation mode');
        }
        return useCase.analyzeSimulation(hackIncidentId, chain, simulationRequest, updateProgress);
      } else {
        throw new Error(`Unsupported analysis mode: ${mode}`);
      }
    },
    {
      connection,
      concurrency: 3, // Requirements: "Concurrent analysis limit: 3 jobs max" (P5-EVM-007 but relevant here)
    },
  );
}
