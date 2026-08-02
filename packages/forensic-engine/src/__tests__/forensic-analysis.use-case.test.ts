import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForensicAnalysisUseCase } from '../application/forensic-analysis.use-case.js';
import { Chain } from '@aegis/core';
import type { FoundryService, SimulationRequest, SimulationResult } from '../adapters/foundry/index.js';
import type { TransactionTraceAnalyzer } from '../adapters/tracing/index.js';
import type { StorageDiffAnalyzer, StorageSlotDiscoverer } from '../adapters/storage/index.js';
import type { ExploitPatternRecognizer } from '../adapters/patterns/index.js';
import type { IForensicReportRepositoryPort } from '../domain/ports/forensic-report-repository.port.js';
import type { TransactionTraceResult, CallTreeNode } from '../domain/trace-types.js';
import type { PatternDetectionResult } from '../domain/pattern-types.js';

describe('ForensicAnalysisUseCase', () => {
  let foundryService: ReturnType<typeof vi.mocked<FoundryService>>;
  let traceAnalyzer: ReturnType<typeof vi.mocked<TransactionTraceAnalyzer>>;
  let storageDiffAnalyzer: ReturnType<typeof vi.mocked<StorageDiffAnalyzer>>;
  let slotDiscoverer: ReturnType<typeof vi.mocked<StorageSlotDiscoverer>>;
  let patternRecognizer: ReturnType<typeof vi.mocked<ExploitPatternRecognizer>>;
  let reportRepository: ReturnType<typeof vi.mocked<IForensicReportRepositoryPort>>;
  let useCase: ForensicAnalysisUseCase;

  beforeEach(() => {
    foundryService = {
      simulate: vi.fn(),
    } as any;

    traceAnalyzer = {
      analyze: vi.fn(),
    } as any;

    storageDiffAnalyzer = {
      analyze: vi.fn(),
    } as any;

    slotDiscoverer = {
      discoverFromEvents: vi.fn(),
    } as any;

    patternRecognizer = {
      analyze: vi.fn(),
    } as any;

    reportRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByHackIncidentId: vi.fn(),
    } as any;

    useCase = new ForensicAnalysisUseCase(
      foundryService,
      traceAnalyzer,
      storageDiffAnalyzer,
      slotDiscoverer,
      patternRecognizer,
      reportRepository,
    );
  });

  const mockTxHash = '0x123';
  const mockChain = Chain.ETHEREUM;
  const mockHackId = 'hack-1';

  const mockCallTree: CallTreeNode = {
    id: '1',
    depth: 0,
    type: 'CALL',
    from: '0xsender',
    to: '0xtarget',
    value: 0n,
    gasUsed: 1000n,
    input: '0x',
    output: '0x',
    children: [],
  };

  const mockTraceResult: TransactionTraceResult = {
    txHash: mockTxHash,
    chain: mockChain,
    callTree: mockCallTree,
    events: [],
    gasBreakdown: {},
    valueFlow: [],
    summary: { totalNodes: 1, maxDepth: 0, uniqueContracts: ['0xtarget'], callTypes: {} as any },
  };

  describe('analyzeTrace', () => {
    it('1. should execute full pipeline and persist report', async () => {
      traceAnalyzer.analyze.mockResolvedValue(mockTraceResult);
      patternRecognizer.analyze.mockReturnValue({ matches: [], metadata: {} as any });

      const report = await useCase.analyzeTrace(mockHackId, mockChain, mockTxHash);

      expect(traceAnalyzer.analyze).toHaveBeenCalledWith(mockChain, mockTxHash);
      expect(patternRecognizer.analyze).toHaveBeenCalled();
      expect(reportRepository.save).toHaveBeenCalled();
      expect(report.analysisMode).toBe('trace');
      expect(report.trace.totalCalls).toBe(1);
    });

    it('2. should discover slots if events are present in trace', async () => {
      const traceWithEvents = { ...mockTraceResult, events: [{ name: 'Transfer' } as any] };
      traceAnalyzer.analyze.mockResolvedValue(traceWithEvents);
      patternRecognizer.analyze.mockReturnValue({ matches: [], metadata: {} as any });
      slotDiscoverer.discoverFromEvents.mockReturnValue([{ slot: '0x1', contractAddress: '0xtarget' }]);

      await useCase.analyzeTrace(mockHackId, mockChain, mockTxHash);

      expect(slotDiscoverer.discoverFromEvents).toHaveBeenCalledWith(traceWithEvents.events, '0xtarget');
    });

    it('3. should default to UNKNOWN pattern if none detected', async () => {
      traceAnalyzer.analyze.mockResolvedValue(mockTraceResult);
      patternRecognizer.analyze.mockReturnValue({ matches: [], metadata: {} as any });

      const report = await useCase.analyzeTrace(mockHackId, mockChain, mockTxHash);

      expect(report.patterns.primaryPattern).toBe('UNKNOWN');
      expect(report.patterns.confidence).toBe(0);
    });

    it('4. should map primary pattern when detected', async () => {
      traceAnalyzer.analyze.mockResolvedValue(mockTraceResult);
      patternRecognizer.analyze.mockReturnValue({
        matches: [{ patternId: 'FLASH_LOAN', confidence: 0.95 } as any],
        metadata: {} as any,
      });

      const report = await useCase.analyzeTrace(mockHackId, mockChain, mockTxHash);

      expect(report.patterns.primaryPattern).toBe('FLASH_LOAN');
      expect(report.patterns.confidence).toBe(0.95);
    });

    it('5. should throw if trace analysis fails', async () => {
      traceAnalyzer.analyze.mockRejectedValue(new Error('RPC Error'));

      await expect(useCase.analyzeTrace(mockHackId, mockChain, mockTxHash)).rejects.toThrow('RPC Error');
      expect(reportRepository.save).not.toHaveBeenCalled();
    });

    it('6. should call updateProgress correctly', async () => {
      traceAnalyzer.analyze.mockResolvedValue(mockTraceResult);
      patternRecognizer.analyze.mockReturnValue({ matches: [], metadata: {} as any });
      const updateProgress = vi.fn();

      await useCase.analyzeTrace(mockHackId, mockChain, mockTxHash, updateProgress);

      expect(updateProgress).toHaveBeenCalledWith(10);
      expect(updateProgress).toHaveBeenCalledWith(40);
      expect(updateProgress).toHaveBeenCalledWith(60);
      expect(updateProgress).toHaveBeenCalledWith(80);
      expect(updateProgress).toHaveBeenCalledWith(100);
      expect(updateProgress).toHaveBeenCalledTimes(5);
    });
  });

  describe('analyzeSimulation', () => {
    const mockRequest: SimulationRequest = { pocFilePath: 'path/to/poc.sol', forkBlockNumber: 123, forkUrl: 'http' };
    const mockSimResult: SimulationResult = {
      success: true,
      gasUsed: 5000n,
      traces: [{ depth: 0 } as any],
      logs: [],
      duration: 1200,
      testName: 'testExploit',
    };

    it('7. should execute pipeline and save report for simulation', async () => {
      foundryService.simulate.mockResolvedValue(mockSimResult);

      const report = await useCase.analyzeSimulation(mockHackId, mockChain, mockRequest);

      expect(foundryService.simulate).toHaveBeenCalledWith(mockRequest);
      expect(reportRepository.save).toHaveBeenCalled();
      expect(report.analysisMode).toBe('simulation');
      expect(report.simulation?.success).toBe(true);
    });

    it('8. should handle failed simulation gracefully but still generate report', async () => {
      foundryService.simulate.mockResolvedValue({ ...mockSimResult, success: false });

      const report = await useCase.analyzeSimulation(mockHackId, mockChain, mockRequest);

      expect(report.simulation?.success).toBe(false);
      expect(reportRepository.save).toHaveBeenCalled();
    });

    it('9. should map mock CallTree properly in simulation mode', async () => {
      foundryService.simulate.mockResolvedValue(mockSimResult);

      const report = await useCase.analyzeSimulation(mockHackId, mockChain, mockRequest);

      expect(report.trace.callTree.type).toBe('CALL');
      expect(report.trace.callTree.gasUsed).toBe(5000n);
      expect(report.trace.totalCalls).toBe(1); // 1 trace in mockSimResult
    });

    it('10. should call updateProgress correctly in simulation mode', async () => {
      foundryService.simulate.mockResolvedValue(mockSimResult);
      const updateProgress = vi.fn();

      await useCase.analyzeSimulation(mockHackId, mockChain, mockRequest, updateProgress);

      expect(updateProgress).toHaveBeenCalledWith(10);
      expect(updateProgress).toHaveBeenCalledWith(40);
      expect(updateProgress).toHaveBeenCalledWith(60);
      expect(updateProgress).toHaveBeenCalledWith(80);
      expect(updateProgress).toHaveBeenCalledWith(100);
      expect(updateProgress).toHaveBeenCalledTimes(5);
    });
  });
});
