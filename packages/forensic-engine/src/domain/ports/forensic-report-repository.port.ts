import { type ForensicReport } from '../report-types.js';

export interface IForensicReportRepositoryPort {
  save(report: ForensicReport): Promise<void>;
  findById(id: string): Promise<ForensicReport | null>;
  findByHackIncidentId(hackIncidentId: string): Promise<ForensicReport[]>;
}
