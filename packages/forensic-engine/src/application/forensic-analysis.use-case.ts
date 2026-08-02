import { type Chain } from '@aegis/core';
import { type FoundryService, type SimulationRequest } from '../adapters/foundry/index.js';
import { type TransactionTraceAnalyzer } from '../adapters/tracing/index.js';
import { type StorageDiffAnalyzer, type StorageSlotDiscoverer } from '../adapters/storage/index.js';
import { type ExploitPatternRecognizer } from '../adapters/patterns/index.js';
import { type IForensicReportRepositoryPort } from '../domain/ports/forensic-report-repository.port.js';
import { type ForensicReport } from '../domain/report-types.js';
import { randomUUID } from 'crypto';
import { type StorageSlotRequirement } from '../domain/storage-types.js';
import { type CallTreeNode } from '../domain/trace-types.js';

export class ForensicAnalysisUseCase {
  constructor(
    private readonly foundryService: FoundryService,
    private readonly traceAnalyzer: TransactionTraceAnalyzer,
    private readonly storageDiffAnalyzer: StorageDiffAnalyzer,
    private readonly slotDiscoverer: StorageSlotDiscoverer,
    private readonly patternRecognizer: ExploitPatternRecognizer,
    private readonly reportRepository: IForensicReportRepositoryPort,
  ) {}

  /**
   * Run Forensic Analysis in Trace mode (existing on-chain transaction).
   */
  async analyzeTrace(
    hackIncidentId: string,
    chain: Chain,
    txHash: string,
    updateProgress?: (p: number) => Promise<void>,
  ): Promise<ForensicReport> {
    const startTime = Date.now();
    await updateProgress?.(10);

    // 1. Trace the transaction
    const traceResult = await this.traceAnalyzer.analyze(chain, txHash);
    await updateProgress?.(40);

    // 2. Storage diff analysis
    // For now, let's discover slots from events in the trace, and pick one target contract (the "to" address of the root call)
    const targetContract = traceResult.callTree.to;
    
    // Discover slots from events
    let slotsToCheck: StorageSlotRequirement[] = [];
    if (traceResult.events) {
      slotsToCheck = this.slotDiscoverer.discoverFromEvents(traceResult.events, targetContract);
    }
    
    // This requires a blockBefore and blockAfter. In trace mode, we usually need the block number of the tx.
    // For this MVP, we will construct a mock StorageDiff since we lack block info directly from traceResult.
    const storageDiff = {
      contracts: [],
      totalChanges: 0,
      summary: 'Storage diff not available (requires block context)',
    };
    await updateProgress?.(60);

    // 3. Pattern recognition
    // We pass the mock storageDiff as per the current adapter implementation requirements.
    const patternResult = this.patternRecognizer.analyze(traceResult, { contracts: [], summary: '', totalChanges: 0 });
    await updateProgress?.(80);

    const report: ForensicReport = {
      id: randomUUID(),
      hackIncidentId,
      analysisMode: 'trace',
      chain,
      txHash,
      trace: {
        callTree: traceResult.callTree,
        totalCalls: traceResult.summary.totalNodes,
        uniqueContracts: traceResult.summary.uniqueContracts,
        gasBreakdown: traceResult.gasBreakdown,
        events: traceResult.events,
      },
      storageDiff,
      patterns: {
        detected: patternResult.matches,
        primaryPattern: patternResult.matches.length > 0 ? patternResult.matches[0].patternId : 'UNKNOWN',
        confidence: patternResult.matches.length > 0 ? patternResult.matches[0].confidence : 0,
      },
      metadata: {
        analysisDuration: Date.now() - startTime,
        rpcCalls: 1, // approximate
        timestamp: new Date(),
        engineVersion: '1.0.0',
      },
    };

    // 4. Persist
    await this.reportRepository.save(report);
    await updateProgress?.(100);

    return report;
  }

  /**
   * Run Forensic Analysis in Simulation mode (Foundry POC).
   */
  async analyzeSimulation(
    hackIncidentId: string,
    chain: Chain,
    request: SimulationRequest,
    updateProgress?: (p: number) => Promise<void>,
  ): Promise<ForensicReport> {
    const startTime = Date.now();
    await updateProgress?.(10);

    // 1. Simulate POC
    const simResult = await this.foundryService.simulate(request);
    await updateProgress?.(40);

    // 2. Build mock CallTree for simulation traces (since we don't have a direct mapper yet)
    // To satisfy the schema for the MVP, we will provide a root mock tree node.
    const callTree: CallTreeNode = {
      id: 'root',
      depth: 0,
      type: 'CALL',
      from: '0x0',
      to: '0x0',
      value: 0n,
      gasUsed: simResult.gasUsed,
      input: '0x',
      output: '0x',
      children: [],
    };

    await updateProgress?.(60);

    // 3. Storage Diff (not strictly available in simulation without RPC)
    const storageDiff = {
      contracts: [],
      totalChanges: 0,
      summary: 'Storage diff not available in simulation mode',
    };

    // 4. Pattern Recognition (mocked since traceResult isn't fully built)
    await updateProgress?.(80);

    const report: ForensicReport = {
      id: randomUUID(),
      hackIncidentId,
      analysisMode: 'simulation',
      chain,
      simulation: {
        pocFilePath: request.pocFilePath,
        success: simResult.success,
        gasUsed: simResult.gasUsed,
        duration: simResult.duration,
        logs: simResult.logs as any,
      },
      trace: {
        callTree,
        totalCalls: simResult.traces.length,
        uniqueContracts: [],
        gasBreakdown: {},
        events: [],
      },
      storageDiff,
      patterns: {
        detected: [],
        primaryPattern: 'UNKNOWN',
        confidence: 0,
      },
      metadata: {
        analysisDuration: Date.now() - startTime,
        rpcCalls: 0,
        timestamp: new Date(),
        engineVersion: '1.0.0',
      },
    };

    // 5. Persist
    await this.reportRepository.save(report);
    await updateProgress?.(100);

    return report;
  }
}
