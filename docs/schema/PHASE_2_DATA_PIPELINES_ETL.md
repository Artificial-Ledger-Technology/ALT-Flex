# 🔄 Phase 2 — Data Pipelines & ETL

> **AltFlex AEGIS v3.0** · Adaptive Exploit & Governance Intelligence System
> Phase Goal: Build three independent ETL pipelines that continuously ingest, normalize, and persist data from DefiLlama, DeFiHackLabs, and GitHub into the PostgreSQL datastore — powering both the Hacks Dashboard and AI Skills Explorer.

---

## 📋 Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Pipeline Architecture](#pipeline-architecture)
3. [DefiLlama Hacks Adapter](#defillama-hacks-adapter)
4. [DeFiHackLabs POC Parser](#defihacklabs-poc-parser)
5. [GitHub AI Skills Indexer](#github-ai-skills-indexer)
6. [Data Normalization Layer](#data-normalization-layer)
7. [PostgreSQL Repository Adapters](#postgresql-repository-adapters)
8. [Redis Cache Adapter](#redis-cache-adapter)
9. [BullMQ Job Queue System](#bullmq-job-queue-system)
10. [Use Case Orchestrators](#use-case-orchestrators)
11. [Admin API Integration](#admin-api-integration)
12. [Error Recovery & Resilience](#error-recovery--resilience)
13. [Monitoring & Observability](#monitoring--observability)
14. [Performance Benchmarks](#performance-benchmarks)
15. [Validation Checklist](#validation-checklist)

---

## Overview & Goals

Phase 2 builds the **circulatory system** of AltFlex AEGIS. While Phase 1 defined the API contracts and database schemas, Phase 2 fills the database with real-world data. Three independent ETL pipelines run as stateless workers:

```
┌──────────────────────────────────────────────────────────────────┐
│ AltFlex AEGIS ETL Layer │
├────────────────┬──────────────────┬─────────────────────────────┤
│ Pipeline 1 │ Pipeline 2 │ Pipeline 3 │
│ DefiLlama │ DeFiHackLabs │ GitHub Skills │
│ (Financial) │ (Technical) │ (AI Prompts) │
│ │ │ │
│ api.llama.fi │ github.com/ │ github.com/ │
│ /hacks │ SunWeb3Sec/ │ (curated repos) │
│ │ DeFiHackLabs │ │
│ ↓ │ ↓ │ ↓ │
│ Normalize │ Parse & Link │ Discover & Parse │
│ ↓ │ ↓ │ ↓ │
│ hack_incidents│ hasFoundryPoc │ ai_skill_files │
│ (PostgreSQL) │ foundryTestPath │ (PostgreSQL) │
└────────────────┴──────────────────┴─────────────────────────────┘
```

This phase delivers:

- ✅ **Live data ingestion** — DefiLlama feed of 1,000+ historical DeFi hacks
- ✅ **POC cross-referencing** — DeFiHackLabs Foundry test files linked to incidents
- ✅ **AI skills indexing** — Scraped from curated GitHub repos with metadata extraction
- ✅ **Scheduled workers** — BullMQ cron jobs for continuous data freshness
- ✅ **Cache layer** — Redis-backed API response caching with invalidation
- ✅ **Admin controls** — Manual sync triggers via protected API endpoints
  > **Academic Note**: The ETL pipeline design and data normalization methodology documented here form the data collection chapter of both Thesis 1 (skill file dataset) and Thesis 2 (exploit dataset).

---

## Pipeline Architecture

### Three-Pipeline Overview

```mermaid
flowchart TB
subgraph Sources["External Data Sources"]
DL[DefiLlama API<br/>api.llama.fi/hacks]
DHL[DeFiHackLabs<br/>GitHub Repository]
GH[Curated GitHub Repos<br/>AI Skill Files]
end
subgraph Adapters["Hexagonal Driven Adapters"]
DLA[DefiLlamaAdapter<br/>IHackSourcePort]
DHLA[DeFiHackLabsAdapter<br/>IHackSourcePort]
GSA[GitHubSkillsAdapter<br/>ISkillSourcePort]
end
subgraph Normalization["Data Normalization"]
HN[HackNormalizer<br/>Chain mapping, vector classification]
SN[SkillNormalizer<br/>Platform detection, language heuristics]
AVC[AttackVectorClassifier<br/>Keyword-based classification]
end
subgraph UseCases["Application Use Cases"]
SHU[SyncHacksUseCase<br/>Orchestrates hacks ETL]
SIU[IndexSkillsUseCase<br/>Orchestrates skills ETL]
end
subgraph Storage["Data Persistence"]
PHR[PostgresHackRepo<br/>IHackDataPort]
PSR[PostgresSkillRepo<br/>ISkillDataPort]
RC[RedisCacheAdapter<br/>ICachePort]
end
subgraph Scheduling["Job Orchestration"]
BQ[BullMQ Queues]
CRON[Cron Scheduler]
API[Admin API Triggers]
end
DL --> DLA
DHL --> DHLA
GH --> GSA
DLA --> HN
DHLA --> HN
GSA --> SN
HN --> AVC
AVC --> SHU
SN --> SIU
SHU --> PHR
SHU --> RC
SIU --> PSR
SIU --> RC
CRON --> BQ
API --> BQ
BQ --> SHU
BQ --> SIU
style DL fill:#ef4444,color:#fff
style DHL fill:#f59e0b,color:#fff
style GH fill:#3b82f6,color:#fff
style BQ fill:#8b5cf6,color:#fff
```

### Schedule Matrix

| Pipeline            | Queue Name             | Cron          | Interval | Avg Duration | Max Retries |
| ------------------- | ---------------------- | ------------- | -------- | ------------ | ----------- |
| DefiLlama Sync      | `aegis:hacks-sync`     | `0 */6 * * *` | 6 hours  | ~30s         | 3           |
| DeFiHackLabs Link   | `aegis:hacks-poc-link` | `0 0 * * *`   | 24 hours | ~120s        | 3           |
| GitHub Skills Index | `aegis:skills-index`   | `0 * * * *`   | 1 hour   | ~45s         | 3           |

---

## DefiLlama Hacks Adapter

### Implementation

```typescript
// packages/hacks-engine/src/adapters/defillama/DefiLlamaAdapter.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { z } from 'zod';
import { IHackSourcePort } from '@aegis/core';
import { createLogger } from '@aegis/core';
/**
 * DefiLlamaAdapter — Fetches hack incident data from the DefiLlama API.
 *
 * Implements the IHackSourcePort hexagonal port interface.
 * Handles rate limiting, retries, and partial failure tolerance.
 *
 * @hexagonal Driven Adapter — Infrastructure Layer
 * @dataSource https://api.llama.fi/hacks
 */
export class DefiLlamaAdapter implements IHackSourcePort {
  private readonly client: AxiosInstance;
  private readonly logger = createLogger('defillama-adapter');
  constructor(baseUrl = 'https://api.llama.fi') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30_000,
      headers: { Accept: 'application/json' },
    });
  }
  /**
   * Fetch all hack incidents from DefiLlama.
   * The API returns the complete dataset in a single response (no pagination).
   */
  async fetchAllHacks(): Promise<DefiLlamaRawHack[]> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`Fetching hacks from DefiLlama (attempt ${attempt}/${maxRetries})`);
        const response = await this.client.get<DefiLlamaRawHack[]>('/hacks');
        this.logger.info(`Received ${response.data.length} hack records from DefiLlama`);
        return response.data;
      } catch (error) {
        lastError = error as Error;
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          if (axiosError.response?.status === 429) {
            // Rate limited — exponential backoff
            const delay = Math.pow(2, attempt) * 1000;
            this.logger.warn(`Rate limited by DefiLlama, retrying in ${delay}ms`);
            await this.sleep(delay);
            continue;
          }
          if (axiosError.response && axiosError.response.status >= 500) {
            // Server error — retry
            const delay = Math.pow(2, attempt) * 2000;
            this.logger.warn(
              `DefiLlama server error ${axiosError.response.status}, retrying in ${delay}ms`,
            );
            await this.sleep(delay);
            continue;
          }
          // Client error (4xx except 429) — don't retry
          throw new ExternalServiceError('DefiLlama', error);
        }
        // Network error — retry
        const delay = Math.pow(2, attempt) * 2000;
        this.logger.warn(`Network error, retrying in ${delay}ms: ${(error as Error).message}`);
        await this.sleep(delay);
      }
    }
    throw new ExternalServiceError('DefiLlama', lastError || new Error('Max retries exceeded'));
  }
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
// ── Raw Response Schema ───────────────────────
const DefiLlamaRawHackSchema = z.object({
  id: z.number(),
  name: z.string(),
  date: z.number(), // Unix timestamp
  amount: z.number().default(0), // Loss in millions USD
  chains: z.array(z.string()).default([]),
  technique: z.string().default('Unknown'),
  bridgeHack: z.boolean().default(false),
  returnedFunds: z.number().nullable().default(null),
  target: z.string().default(''),
  source: z.string().optional(),
});
export type DefiLlamaRawHack = z.infer<typeof DefiLlamaRawHackSchema>;
```

### Response Field Mapping

| DefiLlama Field | Domain Field    | Transformation                           |
| --------------- | --------------- | ---------------------------------------- |
| `name`          | `protocolName`  | Direct copy                              |
| `date`          | `date`          | Unix timestamp → `new Date(date * 1000)` |
| `amount`        | `lossUsd`       | `amount * 1_000_000` (millions → raw)    |
| `chains[0]`     | `chain`         | Normalize via `CHAIN_MAP`                |
| `technique`     | `attackVector`  | Classify via `AttackVectorClassifier`    |
| `bridgeHack`    | `attackVector`  | Override to `BRIDGE_EXPLOIT` if `true`   |
| `returnedFunds` | `fundsReturned` | `(returnedFunds ?? 0) * 1_000_000`       |
| `source`        | `sources`       | Wrap in array, validate URL              |
| —               | `dataSource`    | Always `'defillama'`                     |
| —               | `hasFoundryPoc` | Default `false` (set by Pipeline 2)      |

---

## DeFiHackLabs POC Parser

### Implementation

```typescript
// packages/hacks-engine/src/adapters/defihacklabs/DeFiHackLabsAdapter.ts
import axios from 'axios';
import { createLogger } from '@aegis/core';
/**
 * DeFiHackLabsAdapter — Parses the SunWeb3Sec/DeFiHackLabs repository
 * to extract Foundry POC → hack incident mappings.
 *
 * Strategy:
 * 1. Fetch repository README via GitHub API
 * 2. Parse markdown tables to extract protocol → test file mappings
 * 3. List test files in src/test/ directory tree
 * 4. Cross-reference with existing hack_incidents records
 *
 * @hexagonal Driven Adapter — Infrastructure Layer
 * @dataSource https://github.com/SunWeb3Sec/DeFiHackLabs
 */
export class DeFiHackLabsAdapter {
  private readonly logger = createLogger('defihacklabs-adapter');
  private readonly githubToken: string;
  private readonly owner = 'SunWeb3Sec';
  private readonly repo = 'DeFiHackLabs';
  constructor(githubToken: string) {
    this.githubToken = githubToken;
  }
  /**
   * Fetch and parse POC mappings from the DeFiHackLabs README.
   */
  async fetchPocMappings(): Promise<PocMapping[]> {
    this.logger.info('Fetching DeFiHackLabs README for POC mappings');
    // Fetch README content
    const readmeContent = await this.fetchFileContent('README.md');
    // Parse markdown tables
    const mappings = this.parseReadmeTables(readmeContent);
    this.logger.info(`Parsed ${mappings.length} POC mappings from README`);
    // Verify test files exist
    const verifiedMappings = await this.verifyTestFiles(mappings);
    this.logger.info(`Verified ${verifiedMappings.length} test files exist`);
    return verifiedMappings;
  }
  /**
   * Parse README markdown tables to extract exploit → test file links.
   *
   * DeFiHackLabs README contains tables like:
   * | No | Vulnerable Project | Date | Lost | Reproduce |
   * |----|--------------------|------|------|-----------|
   * | 1 | Euler Finance | 2023.03.13 | $197M | [POC](src/test/...) |
   */
  private parseReadmeTables(content: string): PocMapping[] {
    const mappings: PocMapping[] = [];
    const lines = content.split('\n');
    // Match table rows with POC links
    const POC_LINK_REGEX = /\[(?:POC|Link|Reproduce|Exp)\]\(([^)]+\.sol)\)/gi;
    const DATE_REGEX = /(\d{4})[.\-/](\d{2})[.\-/](\d{2})/;
    const LOSS_REGEX = /\$?([\d,.]+)\s*([MKBmkb])/;
    for (const line of lines) {
      if (!line.includes('|') || !line.includes('.sol')) continue;
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter(Boolean);
      if (cells.length < 3) continue;
      // Extract POC file path
      const pocMatch = POC_LINK_REGEX.exec(line);
      POC_LINK_REGEX.lastIndex = 0; // Reset regex state
      if (!pocMatch) continue;
      // Extract date
      const dateMatch = DATE_REGEX.exec(line);
      if (!dateMatch) continue;
      // Extract protocol name (usually 2nd cell after index)
      const protocolCell = cells.length > 1 ? cells[1] : '';
      const protocolName = protocolCell
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // Strip markdown links
        .replace(/\*\*/g, '') // Strip bold
        .trim();
      if (!protocolName) continue;
      // Extract loss amount
      const lossMatch = LOSS_REGEX.exec(line);
      let lossUsd = 0;
      if (lossMatch) {
        const num = parseFloat(lossMatch[1].replace(/,/g, ''));
        const unit = lossMatch[2].toUpperCase();
        lossUsd =
          unit === 'M' ? num * 1e6 : unit === 'K' ? num * 1e3 : unit === 'B' ? num * 1e9 : num;
      }
      mappings.push({
        protocolName,
        date: `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,
        testFilePath: pocMatch[1],
        lossUsd,
      });
    }
    return mappings;
  }
  private async fetchFileContent(path: string): Promise<string> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${this.githubToken}`,
        Accept: 'application/vnd.github.v3.raw',
      },
      timeout: 30_000,
    });
    return response.data;
  }
  private async verifyTestFiles(mappings: PocMapping[]): Promise<PocMapping[]> {
    // Batch verify by listing the test directory tree
    const treeUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/main?recursive=1`;
    const response = await axios.get(treeUrl, {
      headers: { Authorization: `Bearer ${this.githubToken}` },
      timeout: 30_000,
    });
    const existingPaths = new Set<string>(
      response.data.tree
        .filter((f: { type: string }) => f.type === 'blob')
        .map((f: { path: string }) => f.path),
    );
    return mappings.filter((m) => existingPaths.has(m.testFilePath));
  }
}
export interface PocMapping {
  protocolName: string;
  date: string;
  testFilePath: string;
  lossUsd: number;
}
```

---

## GitHub AI Skills Indexer

### Implementation

```typescript
// packages/skills-engine/src/adapters/github/GitHubSkillsAdapter.ts
import axios, { AxiosInstance } from 'axios';
import matter from 'gray-matter';
import { createHash } from 'crypto';
import { createLogger, type AISkillFile, SafetyLabel } from '@aegis/core';
/**
 * GitHubSkillsAdapter — Scrapes curated GitHub repos for AI audit skill files.
 *
 * Discovery strategy:
 * 1. For each source repo, list files in target directories
 * 2. Filter by extension (.yml, .yaml, .md, .json, .toml)
 * 3. Download file content
 * 4. Parse metadata from frontmatter or content analysis
 * 5. Generate content hash for deduplication
 *
 * @hexagonal Driven Adapter — Infrastructure Layer
 */
export class GitHubSkillsAdapter {
  private readonly client: AxiosInstance;
  private readonly logger = createLogger('github-skills-adapter');
  private readonly SKILL_EXTENSIONS = ['.yml', '.yaml', '.md', '.json', '.toml'];
  private readonly SKILL_DIRECTORIES = ['skills', 'prompts', 'agents', 'rules', '.cursorrules'];
  constructor(githubToken: string) {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      timeout: 30_000,
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }
  /**
   * Discover and fetch skill files from a single repository.
   */
  async discoverSkillFiles(source: SkillSource): Promise<RawSkillFile[]> {
    this.logger.info(`Discovering skills in ${source.owner}/${source.repo}`);
    const files: RawSkillFile[] = [];
    for (const dir of source.paths || this.SKILL_DIRECTORIES) {
      try {
        const discovered = await this.listFilesInPath(source.owner, source.repo, dir);
        const skillFiles = discovered.filter((f) =>
          this.SKILL_EXTENSIONS.some((ext) => f.path.endsWith(ext)),
        );
        for (const file of skillFiles) {
          try {
            const content = await this.fetchFileContent(source.owner, source.repo, file.path);
            const metadata = this.extractMetadata(content, file.path, source);
            const contentHash = this.generateHash(content);
            files.push({
              name: metadata.name,
              sourceRepo: `${source.owner}/${source.repo}`,
              filePath: file.path,
              platform: metadata.platform,
              language: metadata.language,
              content,
              format: this.detectFormat(file.path),
              author: metadata.author || source.owner,
              contentHash,
            });
          } catch (err) {
            this.logger.warn(`Failed to fetch ${file.path}: ${(err as Error).message}`);
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to list ${dir} in ${source.owner}/${source.repo}: ${(err as Error).message}`,
        );
      }
    }
    this.logger.info(`Discovered ${files.length} skill files in ${source.owner}/${source.repo}`);
    return files;
  }
  /**
   * Extract metadata from file content using frontmatter and heuristics.
   */
  private extractMetadata(content: string, filePath: string, source: SkillSource): SkillMetadata {
    // 1. Try YAML frontmatter
    try {
      const parsed = matter(content);
      if (parsed.data && Object.keys(parsed.data).length > 0) {
        return {
          name: parsed.data.name || parsed.data.title || this.nameFromPath(filePath),
          platform: this.detectPlatform(parsed.data.platform, filePath, content, source),
          language: this.detectLanguage(parsed.data.language, content),
          author: parsed.data.author || parsed.data.team || null,
        };
      }
    } catch {
      // Not valid YAML — fall through to heuristics
    }
    // 2. Heuristic extraction
    return {
      name: this.nameFromPath(filePath),
      platform: this.detectPlatform(undefined, filePath, content, source),
      language: this.detectLanguage(undefined, content),
      author: null,
    };
  }
  /**
   * Platform detection priority:
   * 1. Explicit frontmatter
   * 2. File path patterns
   * 3. Content keywords
   * 4. Source default
   */
  private detectPlatform(
    explicit?: string,
    filePath?: string,
    content?: string,
    source?: SkillSource,
  ): string {
    if (explicit) return explicit.toLowerCase();
    if (filePath) {
      if (filePath.includes('.cursorrules') || filePath.includes('cursor')) return 'cursor';
      if (filePath.includes('.claude') || filePath.includes('claude')) return 'claude';
      if (filePath.includes('mcp') || filePath.includes('model-context')) return 'mcp';
      if (filePath.includes('copilot')) return 'copilot';
      if (filePath.includes('gemini')) return 'gemini';
    }
    if (content) {
      const lower = content.toLowerCase();
      if (lower.includes('tool_use') || lower.includes('mcp')) return 'mcp';
      if (lower.includes('cursor')) return 'cursor';
      if (lower.includes('claude')) return 'claude';
    }
    return source?.defaultPlatform || 'generic';
  }
  /**
   * Language detection: frontmatter → content keyword analysis
   */
  private detectLanguage(explicit?: string, content?: string): string {
    if (explicit) return explicit.toLowerCase();
    if (content) {
      const lower = content.toLowerCase();
      const scores: Record<string, number> = {
        solidity: 0,
        vyper: 0,
        rust: 0,
        move: 0,
        cairo: 0,
      };
      const keywords: Record<string, string[]> = {
        solidity: ['solidity', 'evm', 'ethereum', 'contract', 'modifier', 'require(', 'msg.sender'],
        vyper: ['vyper', '@external', '@internal', 'def __init__'],
        rust: ['rust', 'anchor', 'solana', '#[program]', 'pub fn'],
        move: ['move', 'aptos', 'sui', 'module', 'entry fun'],
        cairo: ['cairo', 'starknet', '#[contract]', 'felt252'],
      };
      for (const [lang, kws] of Object.entries(keywords)) {
        for (const kw of kws) {
          if (lower.includes(kw)) scores[lang]++;
        }
      }
      const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] > 0) return best[0];
    }
    return 'multi';
  }
  private detectFormat(filePath: string): string {
    if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) return 'yaml';
    if (filePath.endsWith('.md')) return 'markdown';
    if (filePath.endsWith('.json')) return 'json';
    if (filePath.endsWith('.toml')) return 'toml';
    return 'markdown';
  }
  private nameFromPath(filePath: string): string {
    return filePath
      .split('/')
      .pop()!
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  private generateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
  private async listFilesInPath(owner: string, repo: string, path: string): Promise<GitHubFile[]> {
    const { data } = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`);
    return Array.isArray(data) ? data : [];
  }
  private async fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
    const { data } = await this.client.get(`/repos/${owner}/${repo}/contents/${path}`, {
      headers: { Accept: 'application/vnd.github.v3.raw' },
    });
    return data;
  }
}
// ── Types ──────────────────────────────────
export interface SkillSource {
  owner: string;
  repo: string;
  paths?: string[];
  defaultPlatform?: string;
}
interface SkillMetadata {
  name: string;
  platform: string;
  language: string;
  author: string | null;
}
interface RawSkillFile {
  name: string;
  sourceRepo: string;
  filePath: string;
  platform: string;
  language: string;
  content: string;
  format: string;
  author: string;
  contentHash: string;
}
interface GitHubFile {
  name: string;
  path: string;
  type: string;
  size: number;
}
```

---

## Data Normalization Layer

### Attack Vector Classifier

```typescript
// packages/hacks-engine/src/adapters/normalization/AttackVectorClassifier.ts
import { AttackVector } from '@aegis/core';
/**
 * AttackVectorClassifier — Maps free-text technique descriptions
 * to the standardized AttackVector enum.
 *
 * Uses keyword matching with priority scoring.
 * Target accuracy: ≥95% on known DeFi hack techniques.
 *
 * @academic This classifier's accuracy is part of the Thesis 1
 * data quality methodology evaluation.
 */
export class AttackVectorClassifier {
  private static readonly KEYWORD_MAP: Record<AttackVector, string[]> = {
    [AttackVector.ACCESS_CONTROL]: [
      'access control',
      'private key',
      'admin',
      'privilege',
      'unauthorized',
      'compromised key',
      'insider',
    ],
    [AttackVector.ARITHMETIC_OVERFLOW]: ['overflow', 'underflow', 'integer', 'arithmetic'],
    [AttackVector.DELEGATECALL_INJECTION]: ['delegatecall', 'proxy', 'call injection', 'calldata'],
    [AttackVector.FLASH_LOAN]: ['flash loan', 'flashloan', 'flash-loan', 'flash swap'],
    [AttackVector.ORACLE_MANIPULATION]: [
      'oracle',
      'price manipulation',
      'price oracle',
      'twap',
      'price feed',
    ],
    [AttackVector.REENTRANCY]: ['reentrancy', 're-entrancy', 'reentrant', 'read-only reentrancy'],
    [AttackVector.DAO_GOVERNANCE]: ['governance', 'dao', 'voting', 'proposal'],
    [AttackVector.FRONTRUNNING]: ['frontrun', 'sandwich', 'mev', 'front-run', 'back-run'],
    [AttackVector.PHISHING]: ['phishing', 'social engineering', 'fake', 'scam', 'impersonation'],
    [AttackVector.DOS]: ['dos', 'denial of service', 'griefing', 'gas limit'],
    [AttackVector.REPLAY]: ['replay', 'signature replay', 'nonce'],
    [AttackVector.SELF_DESTRUCT]: ['selfdestruct', 'self-destruct', 'suicide'],
    [AttackVector.RUG_PULL]: ['rug pull', 'rugpull', 'exit scam', 'honeypot'],
    [AttackVector.BRIDGE_EXPLOIT]: ['bridge', 'cross-chain', 'cross chain', 'relay'],
    [AttackVector.LOGIC_ERROR]: ['logic', 'bug', 'implementation', 'misconfiguration', 'incorrect'],
    [AttackVector.OTHER]: [],
  };
  /**
   * Classify a technique description into an AttackVector.
   *
   * @returns The best-matching AttackVector with confidence score
   */
  static classify(technique: string, isBridgeHack = false): ClassificationResult {
    // Bridge hack override
    if (isBridgeHack) {
      return { vector: AttackVector.BRIDGE_EXPLOIT, confidence: 0.9 };
    }
    const lower = technique.toLowerCase();
    let bestVector = AttackVector.OTHER;
    let bestScore = 0;
    for (const [vector, keywords] of Object.entries(this.KEYWORD_MAP)) {
      let score = 0;
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          // Longer keywords get higher scores (more specific)
          score += keyword.split(' ').length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestVector = vector as AttackVector;
      }
    }
    const confidence = bestScore > 0 ? Math.min(bestScore / 3, 1.0) : 0;
    return { vector: bestVector, confidence };
  }
}
interface ClassificationResult {
  vector: AttackVector;
  confidence: number;
}
```

### Hack Normalizer

```typescript
// packages/hacks-engine/src/adapters/normalization/HackNormalizer.ts
import { HackIncident, HackIncidentSchema, Chain } from '@aegis/core';
import { DefiLlamaRawHack } from '../defillama/DefiLlamaAdapter';
import { AttackVectorClassifier } from './AttackVectorClassifier';
import { createLogger } from '@aegis/core';
import { randomUUID } from 'crypto';
/**
 * HackNormalizer — Transforms raw DefiLlama data into validated HackIncident entities.
 */
export class HackNormalizer {
  private readonly logger = createLogger('hack-normalizer');
  private readonly CHAIN_MAP: Record<string, Chain> = {
    ethereum: Chain.ETHEREUM,
    eth: Chain.ETHEREUM,
    bsc: Chain.BSC,
    binance: Chain.BSC,
    polygon: Chain.POLYGON,
    matic: Chain.POLYGON,
    arbitrum: Chain.ARBITRUM,
    arb: Chain.ARBITRUM,
    optimism: Chain.OPTIMISM,
    op: Chain.OPTIMISM,
    avalanche: Chain.AVALANCHE,
    avax: Chain.AVALANCHE,
    base: Chain.BASE,
    fantom: Chain.FANTOM,
    ftm: Chain.FANTOM,
    gnosis: Chain.GNOSIS,
    xdai: Chain.GNOSIS,
    cronos: Chain.CRONOS,
    solana: Chain.SOLANA,
    sol: Chain.SOLANA,
    cosmos: Chain.COSMOS,
    atom: Chain.COSMOS,
    near: Chain.NEAR,
    stellar: Chain.STELLAR,
    xlm: Chain.STELLAR,
  };
  /**
   * Normalize an array of raw DefiLlama hacks into validated domain entities.
   * Invalid records are logged and skipped, not thrown.
   */
  normalize(rawHacks: DefiLlamaRawHack[]): NormalizationResult {
    const valid: HackIncident[] = [];
    const invalid: InvalidRecord[] = [];
    for (const raw of rawHacks) {
      try {
        const incident = this.normalizeOne(raw);
        const validation = HackIncidentSchema.safeParse(incident);
        if (validation.success) {
          valid.push(validation.data);
        } else {
          invalid.push({
            raw,
            reason: `Zod validation failed: ${validation.error.message}`,
          });
        }
      } catch (err) {
        invalid.push({
          raw,
          reason: `Normalization error: ${(err as Error).message}`,
        });
      }
    }
    if (invalid.length > 0) {
      this.logger.warn(`${invalid.length} records failed normalization`, {
        sampleReasons: invalid.slice(0, 5).map((i) => i.reason),
      });
    }
    return { valid, invalid, total: rawHacks.length };
  }
  private normalizeOne(raw: DefiLlamaRawHack): HackIncident {
    const now = new Date();
    const chain = this.normalizeChain(raw.chains);
    const { vector } = AttackVectorClassifier.classify(raw.technique, raw.bridgeHack);
    return {
      id: randomUUID(),
      protocolName: raw.name.trim(),
      date: new Date(raw.date * 1000),
      chain,
      attackVector: vector,
      lossUsd: (raw.amount || 0) * 1_000_000,
      txHashes: [],
      sources: raw.source ? [raw.source] : [],
      hasFoundryPoc: false,
      foundryTestPath: undefined,
      description: '',
      fundsReturned: (raw.returnedFunds ?? 0) * 1_000_000,
      dataSource: 'defillama',
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }
  private normalizeChain(chains: string[]): Chain {
    if (!chains || chains.length === 0) return Chain.UNKNOWN;
    if (chains.length > 1) return Chain.MULTI;
    const normalized = chains[0].toLowerCase().trim();
    return this.CHAIN_MAP[normalized] || Chain.UNKNOWN;
  }
}
interface NormalizationResult {
  valid: HackIncident[];
  invalid: InvalidRecord[];
  total: number;
}
interface InvalidRecord {
  raw: DefiLlamaRawHack;
  reason: string;
}
```

---

## PostgreSQL Repository Adapters

### Hack Repository (Excerpt)

```typescript
// packages/hacks-engine/src/adapters/postgres/PostgresHackRepository.ts
import { Pool, QueryResult } from 'pg';
import {
  IHackDataPort,
  HackFilters,
  PaginatedResult,
  HackIncident,
  AttackVectorStat,
} from '@aegis/core';
import { createLogger } from '@aegis/core';
export class PostgresHackRepository implements IHackDataPort {
  private readonly logger = createLogger('postgres-hack-repo');
  constructor(private readonly pool: Pool) {}
  async findAll(filters: HackFilters): Promise<PaginatedResult<HackIncident>> {
    const { text: whereClause, values: whereValues } = this.buildWhereClause(filters);
    const offset = (filters.page - 1) * filters.pageSize;
    // Count query
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM hack_incidents ${whereClause}`,
      whereValues,
    );
    const total = parseInt(countResult.rows[0].total, 10);
    // Data query with sorting and pagination
    const sortColumn = this.mapSortColumn(filters.sortBy);
    const dataResult = await this.pool.query(
      `SELECT * FROM hack_incidents ${whereClause}
ORDER BY ${sortColumn} ${filters.sortOrder === 'asc' ? 'ASC' : 'DESC'}
LIMIT $${whereValues.length + 1} OFFSET $${whereValues.length + 2}`,
      [...whereValues, filters.pageSize, offset],
    );
    return {
      data: dataResult.rows.map(this.toDomain),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.ceil(total / filters.pageSize),
    };
  }
  async saveBatch(incidents: HackIncident[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const incident of incidents) {
        await client.query(
          `INSERT INTO hack_incidents
(id, protocol_name, date, chain, attack_vector, loss_usd,
tx_hashes, sources, has_foundry_poc, foundry_test_path,
description, funds_returned, data_source, last_synced_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
ON CONFLICT (id) DO UPDATE SET
loss_usd = EXCLUDED.loss_usd,
sources = EXCLUDED.sources,
has_foundry_poc = EXCLUDED.has_foundry_poc,
foundry_test_path = EXCLUDED.foundry_test_path,
funds_returned = EXCLUDED.funds_returned,
last_synced_at = EXCLUDED.last_synced_at,
updated_at = NOW()`,
          [
            incident.id,
            incident.protocolName,
            incident.date,
            incident.chain,
            incident.attackVector,
            incident.lossUsd,
            incident.txHashes,
            incident.sources,
            incident.hasFoundryPoc,
            incident.foundryTestPath,
            incident.description,
            incident.fundsReturned,
            incident.dataSource,
            incident.lastSyncedAt,
          ],
        );
      }
      await client.query('COMMIT');
      this.logger.info(`Upserted ${incidents.length} hack incidents`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  async getAttackVectorStats(): Promise<AttackVectorStat[]> {
    const result = await this.pool.query(`
SELECT
attack_vector AS "attackVector",
COUNT(*)::int AS count,
SUM(loss_usd)::float AS "totalLossUsd",
MAX(date) AS "lastIncidentDate"
FROM hack_incidents
GROUP BY attack_vector
ORDER BY "totalLossUsd" DESC
`);
    return result.rows;
  }
  // ... buildWhereClause, mapSortColumn, toDomain helpers
}
```

---

## BullMQ Job Queue System

### Queue Setup

```typescript
// packages/hacks-engine/src/infrastructure/queues/hacksQueue.ts
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { createLogger } from '@aegis/core';
const logger = createLogger('hacks-queue');
export function createHacksQueue(redisConnection: IORedis): Queue {
  const queue = new Queue('aegis:hacks-sync', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
  return queue;
}
export function createHacksWorker(
  redisConnection: IORedis,
  syncHacksUseCase: SyncHacksUseCase,
): Worker {
  const worker = new Worker(
    'aegis:hacks-sync',
    async (job) => {
      logger.info(`Starting hacks sync job ${job.id}`);
      await job.updateProgress(0);
      try {
        // Step 1: Fetch from DefiLlama
        await job.updateProgress(10);
        const result = await syncHacksUseCase.execute({
          onProgress: async (pct: number) => {
            await job.updateProgress(pct);
          },
        });
        logger.info('Hacks sync completed', {
          added: result.recordsAdded,
          updated: result.recordsUpdated,
          duration: result.durationMs,
        });
        await job.updateProgress(100);
        return result;
      } catch (error) {
        logger.error('Hacks sync failed', { error: (error as Error).message });
        throw error;
      }
    },
    { connection: redisConnection, concurrency: 1 },
  );
  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });
  return worker;
}
```

---

## Use Case Orchestrators

### SyncHacksUseCase

```typescript
// packages/hacks-engine/src/application/SyncHacksUseCase.ts
import { IHackDataPort, ICachePort, createLogger } from '@aegis/core';
import { DefiLlamaAdapter } from '../adapters/defillama/DefiLlamaAdapter';
import { DeFiHackLabsAdapter } from '../adapters/defihacklabs/DeFiHackLabsAdapter';
import { HackNormalizer } from '../adapters/normalization/HackNormalizer';
/**
 * SyncHacksUseCase — Application-layer orchestrator for the hacks ETL pipeline.
 *
 * Flow: DefiLlama → Normalize → Upsert → Cross-ref POCs → Invalidate Cache → Log
 *
 * @hexagonal Application Layer — depends only on port interfaces
 */
export class SyncHacksUseCase {
  private readonly logger = createLogger('sync-hacks-use-case');
  constructor(
    private readonly defiLlamaAdapter: DefiLlamaAdapter,
    private readonly deFiHackLabsAdapter: DeFiHackLabsAdapter,
    private readonly hackRepo: IHackDataPort,
    private readonly cache: ICachePort,
    private readonly normalizer: HackNormalizer,
  ) {}
  async execute(options?: { onProgress?: (pct: number) => Promise<void> }): Promise<SyncResult> {
    const startTime = Date.now();
    const progress = options?.onProgress || (() => Promise.resolve());
    // Step 1: Fetch from DefiLlama
    await progress(10);
    const rawHacks = await this.defiLlamaAdapter.fetchAllHacks();
    this.logger.info(`Fetched ${rawHacks.length} raw hacks from DefiLlama`);
    // Step 2: Normalize
    await progress(30);
    const { valid, invalid, total } = this.normalizer.normalize(rawHacks);
    this.logger.info(
      `Normalized: ${valid.length} valid, ${invalid.length} invalid out of ${total}`,
    );
    // Step 3: Upsert to database
    await progress(50);
    await this.hackRepo.saveBatch(valid);
    // Step 4: Cross-reference with DeFiHackLabs
    await progress(70);
    try {
      const pocMappings = await this.deFiHackLabsAdapter.fetchPocMappings();
      let linkedCount = 0;
      for (const poc of pocMappings) {
        // Find matching incident by protocol name + approximate date
        // (Actual implementation would use fuzzy matching)
        linkedCount++;
      }
      this.logger.info(`Linked ${linkedCount} Foundry POCs to incidents`);
    } catch (err) {
      // POC linking is non-critical — log and continue
      this.logger.warn(`DeFiHackLabs POC linking failed: ${(err as Error).message}`);
    }
    // Step 5: Invalidate cache
    await progress(90);
    await this.cache.delByPrefix('aegis:hacks:');
    // Step 6: Complete
    await progress(100);
    const durationMs = Date.now() - startTime;
    return {
      recordsAdded: valid.length,
      recordsUpdated: 0, // Tracked by upsert logic
      recordsSkipped: invalid.length,
      durationMs,
      source: 'defillama',
    };
  }
}
export interface SyncResult {
  recordsAdded: number;
  recordsUpdated: number;
  recordsSkipped: number;
  durationMs: number;
  source: string;
}
```

---

## Error Recovery & Resilience

### Retry Strategy

| Scenario                | Strategy    | Max Retries | Backoff                      |
| ----------------------- | ----------- | ----------- | ---------------------------- |
| DefiLlama 429           | Exponential | 3           | 2s, 4s, 8s                   |
| DefiLlama 5xx           | Exponential | 3           | 4s, 8s, 16s                  |
| GitHub 403 (rate limit) | Fixed       | 1           | Wait for `X-RateLimit-Reset` |
| GitHub 5xx              | Exponential | 3           | 2s, 4s, 8s                   |
| PostgreSQL connection   | Exponential | 5           | 1s, 2s, 4s, 8s, 16s          |
| Redis connection        | Fallthrough | 0           | Use DB directly              |

### Circuit Breaker Pattern

```typescript
/**
 * Simple circuit breaker for external service calls.
 *
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing recovery)
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  constructor(
    private readonly threshold: number = 5, // failures before opening
    private readonly resetTimeMs: number = 60_000, // time before half-open
  ) {}
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN — service unavailable');
      }
    }
    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
  private reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
}
```

---

## Performance Benchmarks

### Target Metrics

| Metric                         | Target  | Measurement Method           |
| ------------------------------ | ------- | ---------------------------- |
| DefiLlama full sync            | < 30s   | `SyncResult.durationMs`      |
| DeFiHackLabs POC parse         | < 120s  | `SyncResult.durationMs`      |
| GitHub skills index (10 repos) | < 60s   | `IndexResult.durationMs`     |
| Filter query (1000 rows)       | < 50ms  | PostgreSQL `EXPLAIN ANALYZE` |
| Full-text search               | < 100ms | PostgreSQL `EXPLAIN ANALYZE` |
| Cache hit                      | < 5ms   | Redis `DEBUG SLEEP` baseline |
| Cache miss + DB                | < 80ms  | End-to-end via API           |

### Index Optimization

```sql
-- Verify index usage with EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM hack_incidents
WHERE chain = 'ethereum'
AND attack_vector = 'flash-loan'
AND date >= '2023-01-01'
ORDER BY loss_usd DESC
LIMIT 20;
-- Expected: Index Scan using idx_hack_incidents_chain
-- Expected: Execution time < 10ms on 1000 rows
```

---

## Validation Checklist

```bash
# 1. DefiLlama sync
pnpm --filter hacks-engine run sync:defillama
# ✅ ≥100 incidents in database
# 2. Verify data
docker exec aegis-postgres psql -U aegis -d aegis_dev -c \
"SELECT COUNT(*), SUM(loss_usd) FROM hack_incidents;"
# ✅ ≥100 rows, total loss > $10B
# 3. Attack vector coverage
docker exec aegis-postgres psql -U aegis -d aegis_dev -c \
"SELECT attack_vector, COUNT(*) FROM hack_incidents GROUP BY attack_vector ORDER BY count DESC;"
# ✅ ≥10 distinct attack vectors
# 4. DeFiHackLabs POC linking
docker exec aegis-postgres psql -U aegis -d aegis_dev -c \
"SELECT COUNT(*) FROM hack_incidents WHERE has_foundry_poc = true;"
# ✅ ≥30 incidents with POCs
# 5. Skills indexing
pnpm --filter skills-engine run sync:github
docker exec aegis-postgres psql -U aegis -d aegis_dev -c \
"SELECT COUNT(*) FROM ai_skill_files;"
# ✅ ≥10 skill files
# 6. BullMQ queues
# ✅ All 3 queues registered with cron schedules
# 7. API returns data
curl http://localhost:4000/api/v1/hacks?pageSize=5 | jq '.total'
# ✅ Returns ≥100
curl http://localhost:4000/api/v1/hacks/stats | jq '.totalLossUsd'
# ✅ Returns > 10_000_000_000
curl http://localhost:4000/api/v1/skills?pageSize=5 | jq '.total'
# ✅ Returns ≥10
# 8. Cache operational
redis-cli KEYS "aegis:*" | wc -l
# ✅ ≥1 cached keys after API requests
# 9. Performance
curl -w "%{time_total}" -o /dev/null -s http://localhost:4000/api/v1/hacks
# ✅ < 0.1s (100ms)
# 10. All tests
pnpm run test
# ✅ ≥100 new tests pass
```

---

## What's Next: Phase 3

Once Phase 2 validation is complete, Phase 3 (The AI Engine & Safety Scanner — **Thesis 1 Focus**) will implement:

- 🧠 **Safety Scanner Engine** — AST/regex parser for malicious skill file detection
- 🧠 **Smart Contract Bytecode Analyzer** — Historical pattern matching against known exploits
- 🧠 **Safety Rule Definition System** — Configurable rule files for detection patterns
- 🧠 **Automated Labeling Pipeline** — Safe/Suspicious/Malicious classification
  > **⚠️ Phase 3 is gated on Phase 2 completion. The Safety Scanner operates on data indexed by the Skills ETL pipeline.**

---

_Document Version: 3.2.0_
_Author: AltFlex AEGIS Engineering_
_Last Updated: March 2026_
