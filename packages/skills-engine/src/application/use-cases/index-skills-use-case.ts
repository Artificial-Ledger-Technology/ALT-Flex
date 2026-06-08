/**
 * @module index-skills-use-case
 * @description Application-layer orchestrator for the skills ETL pipeline.
 *
 * Coordinates the end-to-end index flow:
 *   1. Discover skill files in configured GitHub repositories
 *   2. Download raw file content
 *   3. Normalize and validate via SkillNormalizer
 *   4. Deduplicate against database by contentHash
 *   5. Upsert new/changed records to PostgreSQL
 *   6. Enqueue SafetyScanJob for each newly indexed skill
 *   7. Invalidate Redis cache
 *   8. Return summary statistics
 *
 * @hexagonal Application Layer — Engine β
 * @task P2-ETL-009
 */

import { Queue } from 'bullmq';
import type { ICachePort, ISkillDataPort, LoggerPort, AISkillFile, SafetyScanJobData, SafetyScanJobResult } from '@aegis/core';

import type { GitHubSkillsAdapter } from '../../adapters/github-skills-adapter.js';
import type { RawGitHubFileEntry, SkillNormalizationResult } from '../../adapters/skill-normalizer.js';
import { enqueueSafetyScan } from '../../infrastructure/safety-scan-queue.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface IndexResult {
  readonly added: number;
  readonly updated: number;
  readonly skipped: number;
  readonly errored: number;
  readonly durationMs: number;
}

export interface IndexSkillsOptions {
  readonly onProgress?: (percent: number, stage: string) => Promise<void>;
}

export interface SkillNormalizerPort {
  normalizeGitHubSkillFiles(
    files: ReadonlyArray<readonly [string, RawGitHubFileEntry]>,
    repoInfo: { owner: string; repo: string; defaultPlatform?: string },
    logger: LoggerPort,
  ): SkillNormalizationResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Use Case
// ═══════════════════════════════════════════════════════════════════════════════

export class IndexSkillsUseCase {
  private readonly logger: LoggerPort;

  constructor(
    private readonly githubAdapter: GitHubSkillsAdapter,
    private readonly skillRepo: ISkillDataPort,
    private readonly safetyScanQueue: Queue<SafetyScanJobData, SafetyScanJobResult, string>,
    private readonly normalizer: SkillNormalizerPort,
    private readonly cache: ICachePort,
    logger: LoggerPort,
  ) {
    this.logger = logger.child({ useCase: 'IndexSkillsUseCase' });
  }

  async execute(options: IndexSkillsOptions = {}): Promise<IndexResult> {
    const startMs = Date.now();
    const { onProgress } = options;

    this.logger.info('IndexSkillsUseCase started');

    let added = 0;
    let updated = 0;
    let skipped = 0;
    let errored = 0;

    await this.reportProgress(onProgress, 0, 'fetching');

    const sources = this.githubAdapter.skillSources;
    let sourceIndex = 0;

    for (const source of sources) {
      this.logger.info(`Processing source: ${source.owner}/${source.repo}`);
      try {
        const fileEntries = await this.githubAdapter.discoverSkillFiles(source);
        const rawFiles: Array<[string, RawGitHubFileEntry]> = [];

        for (const entry of fileEntries) {
          const content = await this.githubAdapter.downloadFileContent(
            source.owner,
            source.repo,
            entry.path,
          );
          if (content !== null) {
            rawFiles.push([content, { path: entry.path, sha: entry.sha }]);
          } else {
            errored++;
          }
        }

        const normResult = this.normalizer.normalizeGitHubSkillFiles(
          rawFiles,
          { owner: source.owner, repo: source.repo, defaultPlatform: source.defaultPlatform },
          this.logger,
        );

        errored += normResult.invalidCount;

        const { newlyAdded, newlyUpdated, newlySkipped } = await this.processValidSkills(normResult.valid);
        
        added += newlyAdded;
        updated += newlyUpdated;
        skipped += newlySkipped + normResult.duplicateCount;

      } catch (error) {
        this.logger.error(`Failed to process source ${source.owner}/${source.repo}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      sourceIndex++;
      const progress = Math.floor((sourceIndex / sources.length) * 80);
      await this.reportProgress(onProgress, progress, 'upserting');
    }

    await this.reportProgress(onProgress, 90, 'cache-invalidation');

    try {
      await this.cache.deleteByPattern('aegis:skills:*');
      this.logger.info('Cache invalidated');
    } catch (error) {
      this.logger.warn('Cache invalidation failed (non-fatal)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const durationMs = Date.now() - startMs;

    const result: IndexResult = {
      added,
      updated,
      skipped,
      errored,
      durationMs,
    };

    this.logger.info('IndexSkillsUseCase completed', { result });
    await this.reportProgress(onProgress, 100, 'complete');

    return result;
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private async processValidSkills(skills: AISkillFile[]): Promise<{ newlyAdded: number; newlyUpdated: number; newlySkipped: number }> {
    let newlyAdded = 0;
    let newlyUpdated = 0;
    let newlySkipped = 0;

    const skillsToUpsert: AISkillFile[] = [];
    const skillsToScan: AISkillFile[] = [];

    for (const skill of skills) {
      const existing = await this.skillRepo.findById(skill.id);

      if (existing) {
        if (existing.contentHash === skill.contentHash) {
          newlySkipped++;
        } else {
          skillsToUpsert.push(skill);
          skillsToScan.push(skill);
          newlyUpdated++;
        }
      } else {
        skillsToUpsert.push(skill);
        skillsToScan.push(skill);
        newlyAdded++;
      }
    }

    if (skillsToUpsert.length > 0) {
      await this.skillRepo.saveBatch(skillsToUpsert);
      
      for (const skill of skillsToScan) {
        try {
          await enqueueSafetyScan(this.safetyScanQueue, skill.id, skill.contentHash);
        } catch (error) {
          this.logger.error(`Failed to enqueue safety scan for skill ${skill.id}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    return { newlyAdded, newlyUpdated, newlySkipped };
  }

  private async reportProgress(
    onProgress: IndexSkillsOptions['onProgress'],
    percent: number,
    stage: string,
  ): Promise<void> {
    if (onProgress === undefined) return;
    try {
      await onProgress(percent, stage);
    } catch (error) {
      this.logger.debug('Progress reporting failed (non-fatal)', {
        percent,
        stage,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
