# Architecture — AltFlex AEGIS v3.0

> **Dual-Engine Web3 Security Intelligence Platform**
>
> _Engineering Blueprint & Academic Reference_

| Field                  | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| **Document Version**   | 1.0.0                                                       |
| **Architecture Style** | Hexagonal (Ports & Adapters) + Modular Monorepo             |
| **Target Audience**    | Engineers, Thesis Supervisors, Auditors                     |
| **Last Updated**       | 2026-04-03                                                  |
| **Author**             | Senior Blockchain Architect + Senior Technical Writer       |
| **Status**             | P1-ARCH-001 Deliverable                                     |
| **Academic Alignment** | Thesis 1 (AI Skill Safety) · Thesis 2 (Forensic Simulation) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Context — C4 Level 1](#2-system-context--c4-level-1)
3. [Container Overview — C4 Level 2](#3-container-overview--c4-level-2)
4. [Component Details — C4 Level 3](#4-component-details--c4-level-3)
   - 4.1 [Hacks Engine (α) — Hexagonal Architecture](#41-hacks-engine-α--hexagonal-architecture)
   - 4.2 [Skills Engine (β) — Hexagonal Architecture](#42-skills-engine-β--hexagonal-architecture)
   - 4.3 [Forensic Engine — Hexagonal Architecture](#43-forensic-engine--hexagonal-architecture)
5. [Data Flow Diagrams](#5-data-flow-diagrams)
   - 5.1 [ETL Data Flow — Hacks Engine](#51-etl-data-flow--hacks-engine)
   - 5.2 [Safety Scanner Pipeline — Skills Engine](#52-safety-scanner-pipeline--skills-engine)
6. [Sequence Diagrams](#6-sequence-diagrams)
   - 6.1 [Hack Search Flow](#61-hack-search-flow)
   - 6.2 [Skill Copy Flow](#62-skill-copy-flow)
   - 6.3 [Exploit Simulation Flow](#63-exploit-simulation-flow)
7. [Technology Stack Matrix](#7-technology-stack-matrix)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)
9. [Architecture Decision Records](#9-architecture-decision-records)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

AltFlex AEGIS (**A**I-**E**nhanced **G**overnance & **I**ntelligence for Web3 **S**ecurity) is a dual-engine security intelligence platform that aggregates, analyzes, and simulates DeFi exploit data alongside AI audit skill file safety classification.

The platform is organized around three domain engines:

| Engine                 | Codename | Domain                                              | Academic Thesis                       |
| ---------------------- | -------- | --------------------------------------------------- | ------------------------------------- |
| **Hacks Dashboard**    | Engine α | DeFi exploit incident aggregation and analytics     | Thesis 2 — Pattern Classification     |
| **AI Skills Explorer** | Engine β | AI audit skill file indexing and safety scanning    | Thesis 1 — Malicious Intent Detection |
| **Forensic Engine**    | Engine γ | Foundry-based exploit simulation and trace analysis | Thesis 2 — Forensic Simulation        |

### Architectural Principles

1. **Hexagonal Architecture (Ports & Adapters)**: Framework-agnostic domain core with injectable infrastructure
2. **Monorepo Modularity**: Turborepo-managed workspace with strict package boundaries
3. **Domain-Driven Design**: Entities, value objects, and ports defined in `@aegis/core`
4. **Type-Safe Validation**: Zod schemas at every API boundary — runtime validation generates TypeScript types
5. **Dependency Inversion**: Domain never depends on infrastructure — only abstract ports

---

## 2. System Context — C4 Level 1

The system context diagram positions AltFlex AEGIS within the broader Web3 security ecosystem, showing all external actors and systems it interacts with.

```mermaid
C4Context
    title AltFlex AEGIS v3.0 — System Context (C4 Level 1)

    Person(researcher, "Security Researcher", "Browses hacks, copies skill files, simulates exploits")
    Person(student, "Academic Supervisor", "Reviews research output, validates thesis data")

    System(aegis, "AltFlex AEGIS v3.0", "Dual-engine Web3 security intelligence platform — Hacks Dashboard + AI Skills Explorer + Forensic Engine")

    System_Ext(defillama, "DefiLlama API", "DeFi protocol TVL and hack incident data")
    System_Ext(defihacklabs, "DeFiHackLabs (GitHub)", "Foundry POC test files for historical exploits")
    System_Ext(github, "GitHub API", "AI audit skill file repositories")
    System_Ext(rpc, "EVM RPC Providers", "Ethereum, BSC, Polygon, Arbitrum, Base, etc.")
    System_Ext(foundry, "Foundry (Local)", "Smart contract compilation, testing, and fork simulation")

    Rel(researcher, aegis, "Searches hacks, copies skills, runs simulations", "HTTPS")
    Rel(student, aegis, "Reviews academic data and research artifacts", "HTTPS")
    Rel(aegis, defillama, "Fetches hack incident data", "REST API")
    Rel(aegis, defihacklabs, "Indexes Foundry POC test files", "Git/HTTPS")
    Rel(aegis, github, "Scrapes AI skill files from repos", "REST API")
    Rel(aegis, rpc, "Reads chain data, fetches tx traces", "JSON-RPC")
    Rel(aegis, foundry, "Executes exploit simulations on mainnet forks", "CLI / stdin")
```

### External System Contracts

| System        | Protocol      | Rate Limit        | Authentication    |
| ------------- | ------------- | ----------------- | ----------------- |
| DefiLlama API | REST (HTTPS)  | 300 req/5min      | None (public)     |
| GitHub API    | REST v3/v4    | 5,000 req/hr      | PAT or GitHub App |
| EVM RPC       | JSON-RPC 2.0  | Provider-specific | API Key           |
| Foundry CLI   | Local process | N/A               | N/A               |
| DeFiHackLabs  | Git clone     | N/A               | SSH/HTTPS         |

---

## 3. Container Overview — C4 Level 2

The container diagram shows all deployable units, their technology choices, and inter-container communication patterns.

```mermaid
C4Container
    title AltFlex AEGIS v3.0 — Container Diagram (C4 Level 2)

    Person(user, "Security Researcher")

    Container_Boundary(aegis, "AltFlex AEGIS v3.0") {

        Container(web, "Web Frontend", "Next.js 15 / React 19 / TypeScript", "Security intelligence dashboard with charts, tables, and interactive skill explorer")
        Container(gateway, "API Gateway", "Fastify 5 / TypeScript", "BFF gateway — routing, CORS, rate limiting, Swagger, Zod validation")

        Container(hacks_engine, "Hacks Engine", "TypeScript / BullMQ", "Engine α — Hack incident aggregation, filtering, statistics, ETL pipeline")
        Container(skills_engine, "Skills Engine", "TypeScript / Acorn AST", "Engine β — AI skill file indexing, safety scanning, engagement tracking")
        Container(forensic_engine, "Forensic Engine", "TypeScript / Viem / ethers.js", "Engine γ — Exploit simulation, tx trace analysis, POC management")
        Container(core, "Core Shared Kernel", "TypeScript / Zod", "Domain entities, value objects, ports, env schemas — shared across all packages")

        ContainerDb(postgres, "PostgreSQL 16", "Primary datastore — hack incidents, skill files, scan results, ETL logs")
        ContainerDb(redis, "Redis 7", "Cache layer + BullMQ job queue backend")
    }

    System_Ext(defillama, "DefiLlama API")
    System_Ext(github, "GitHub API")
    System_Ext(rpc, "EVM RPC Nodes")

    Rel(user, web, "Browses dashboard", "HTTPS :3000")
    Rel(web, gateway, "API calls", "REST :4000")
    Rel(gateway, hacks_engine, "In-process import", "TypeScript")
    Rel(gateway, skills_engine, "In-process import", "TypeScript")
    Rel(gateway, forensic_engine, "In-process import", "TypeScript")
    Rel(gateway, core, "Imports types & schemas", "TypeScript")
    Rel(hacks_engine, core, "Implements ports", "TypeScript")
    Rel(skills_engine, core, "Implements ports", "TypeScript")
    Rel(forensic_engine, core, "Implements ports", "TypeScript")
    Rel(hacks_engine, postgres, "Reads/writes", "pg :5432")
    Rel(hacks_engine, redis, "Cache + job queues", "ioredis :6379")
    Rel(skills_engine, postgres, "Reads/writes", "pg :5432")
    Rel(skills_engine, redis, "Cache + job queues", "ioredis :6379")
    Rel(hacks_engine, defillama, "ETL sync", "REST API")
    Rel(skills_engine, github, "Scrapes repos", "REST API")
    Rel(forensic_engine, rpc, "Fetches tx/traces", "JSON-RPC")
```

### Container Summary

| Container       | Package Name             | Port | Technology                                    | Purpose           |
| --------------- | ------------------------ | ---- | --------------------------------------------- | ----------------- |
| Web Frontend    | `@aegis/web`             | 3000 | Next.js 15, React 19, Recharts, Framer Motion | Dashboard UI      |
| API Gateway     | `@aegis/api-gateway`     | 4000 | Fastify 5, Zod, Swagger                       | BFF routing layer |
| Hacks Engine    | `@aegis/hacks-engine`    | —    | TypeScript, BullMQ, Axios, pg                 | Engine α          |
| Skills Engine   | `@aegis/skills-engine`   | —    | TypeScript, Acorn, gray-matter, pg            | Engine β          |
| Forensic Engine | `@aegis/forensic-engine` | —    | TypeScript, Viem, ethers.js                   | Engine γ          |
| Core Kernel     | `@aegis/core`            | —    | TypeScript, Zod, Winston, date-fns            | Shared domain     |
| PostgreSQL      | —                        | 5432 | PostgreSQL 16 Alpine                          | Primary datastore |
| Redis           | —                        | 6379 | Redis 7 Alpine                                | Cache + BullMQ    |

### Monorepo Dependency Graph

```mermaid
graph TD
    subgraph "Applications (apps/)"
        WEB["@aegis/web<br/>Next.js 15"]
        GW["@aegis/api-gateway<br/>Fastify 5"]
    end

    subgraph "Domain Engines (packages/)"
        HE["@aegis/hacks-engine<br/>Engine α"]
        SE["@aegis/skills-engine<br/>Engine β"]
        FE["@aegis/forensic-engine<br/>Engine γ"]
    end

    subgraph "Shared Kernel (packages/)"
        CORE["@aegis/core<br/>Entities · Ports · Schemas"]
    end

    GW --> HE
    GW --> SE
    GW --> FE
    GW --> CORE
    HE --> CORE
    SE --> CORE
    FE --> CORE
    WEB -.->|REST API| GW

    style CORE fill:#667eea,color:#fff,stroke:#5a67d8
    style GW fill:#f6ad55,color:#000,stroke:#dd6b20
    style WEB fill:#4fd1c5,color:#000,stroke:#38b2ac
    style HE fill:#fc8181,color:#000,stroke:#e53e3e
    style SE fill:#b794f4,color:#000,stroke:#805ad5
    style FE fill:#68d391,color:#000,stroke:#38a169
```

---

## 4. Component Details — C4 Level 3

### 4.1 Hacks Engine (α) — Hexagonal Architecture

Engine α aggregates DeFi exploit incident data from external sources, normalizes it into `HackIncident` domain entities, and provides filtered/paginated query and statistics APIs.

```mermaid
graph TB
    subgraph "Driving Adapters (Inbound)"
        HTTP_HACKS["HTTP Adapter<br/>(Fastify Route Handlers)"]
        BULL_HACKS["BullMQ Worker<br/>(ETL Job Consumer)"]
    end

    subgraph "Domain Core — Hacks Engine"
        direction TB
        UC_LIST["ListHacksUseCase"]
        UC_DETAIL["GetHackDetailUseCase"]
        UC_STATS["GetDashboardStatsUseCase"]
        UC_SYNC["SyncHacksUseCase<br/>(ETL Orchestrator)"]
        UC_SEARCH["SearchHacksUseCase"]

        ENT["Domain Entity<br/>HackIncident"]
        VO1["Value Object<br/>AttackVector (16 types)"]
        VO2["Value Object<br/>Chain (16 networks)"]
    end

    subgraph "Driven Adapters (Outbound)"
        PG_HACKS["PostgresHackDataAdapter<br/>(implements IHackDataPort)"]
        REDIS_HACKS["RedisCacheAdapter<br/>(implements ICachePort)"]
        DLLAMA["DefiLlamaAdapter<br/>(implements IExternalDataPort)"]
    end

    subgraph "Ports (Interfaces)"
        P_HACK["IHackDataPort"]
        P_CACHE["ICachePort"]
        P_EXT["IExternalDataPort"]
    end

    HTTP_HACKS --> UC_LIST
    HTTP_HACKS --> UC_DETAIL
    HTTP_HACKS --> UC_STATS
    HTTP_HACKS --> UC_SEARCH
    BULL_HACKS --> UC_SYNC

    UC_LIST --> P_HACK
    UC_LIST --> P_CACHE
    UC_DETAIL --> P_HACK
    UC_DETAIL --> P_CACHE
    UC_STATS --> P_HACK
    UC_STATS --> P_CACHE
    UC_SYNC --> P_HACK
    UC_SYNC --> P_EXT
    UC_SEARCH --> P_HACK

    P_HACK --> PG_HACKS
    P_CACHE --> REDIS_HACKS
    P_EXT --> DLLAMA

    style ENT fill:#fc8181,color:#000,stroke:#e53e3e
    style VO1 fill:#fed7d7,color:#000,stroke:#feb2b2
    style VO2 fill:#fed7d7,color:#000,stroke:#feb2b2
    style P_HACK fill:#fefcbf,color:#000,stroke:#f6e05e
    style P_CACHE fill:#fefcbf,color:#000,stroke:#f6e05e
    style P_EXT fill:#fefcbf,color:#000,stroke:#f6e05e
```

**Key Domain Objects:**

| Type         | Name            | Description                                                                            |
| ------------ | --------------- | -------------------------------------------------------------------------------------- |
| Entity       | `HackIncident`  | Primary aggregate — protocol, date, chain, attackVector, lossUsd, txHashes, dataSource |
| Value Object | `AttackVector`  | 16-member enum taxonomy (reentrancy, flash-loan, oracle-manipulation, etc.)            |
| Value Object | `Chain`         | 16-member enum (Ethereum, BSC, Polygon, Arbitrum, Base, Solana, etc.)                  |
| Port         | `IHackDataPort` | CRUD + filter + aggregate queries for hack incidents                                   |
| Port         | `ICachePort`    | get/set/delete with TTL for Redis caching                                              |

---

### 4.2 Skills Engine (β) — Hexagonal Architecture

Engine β indexes AI audit skill files from GitHub repositories, performs safety analysis using AST parsing and pattern matching, and provides a searchable/filterable skills catalog.

```mermaid
graph TB
    subgraph "Driving Adapters (Inbound)"
        HTTP_SKILLS["HTTP Adapter<br/>(Fastify Route Handlers)"]
        BULL_SKILLS["BullMQ Worker<br/>(Indexer + Safety Scanner)"]
    end

    subgraph "Domain Core — Skills Engine"
        direction TB
        UC_SLIST["ListSkillsUseCase"]
        UC_SDETAIL["GetSkillDetailUseCase"]
        UC_SCAN["ScanSkillFileUseCase"]
        UC_INDEX["IndexRepoUseCase"]
        UC_SSTATS["GetSkillsStatsUseCase"]
        UC_COPY["CopySkillFileUseCase"]

        ENT_SKILL["Domain Entity<br/>AISkillFile"]
        ENT_SCAN["Domain Entity<br/>SafetyScanResult"]
        VO_SAFETY["Value Object<br/>SafetyLabel (4 states)"]
        VO_PLATFORM["Sub-schema<br/>AIPlatform (7 types)"]
    end

    subgraph "Driven Adapters (Outbound)"
        PG_SKILLS["PostgresSkillDataAdapter<br/>(implements ISkillDataPort)"]
        GITHUB_ADAPTER["GitHubRepoAdapter<br/>(implements IRepoScraperPort)"]
        AST_SCANNER["AcornSafetyScanner<br/>(implements ISafetyScannerPort)"]
    end

    subgraph "Ports (Interfaces)"
        P_SKILL["ISkillDataPort"]
        P_SCRAPER["IRepoScraperPort"]
        P_SCANNER["ISafetyScannerPort"]
    end

    HTTP_SKILLS --> UC_SLIST
    HTTP_SKILLS --> UC_SDETAIL
    HTTP_SKILLS --> UC_COPY
    HTTP_SKILLS --> UC_SSTATS
    BULL_SKILLS --> UC_INDEX
    BULL_SKILLS --> UC_SCAN

    UC_SLIST --> P_SKILL
    UC_SDETAIL --> P_SKILL
    UC_COPY --> P_SKILL
    UC_SSTATS --> P_SKILL
    UC_INDEX --> P_SCRAPER
    UC_INDEX --> P_SKILL
    UC_SCAN --> P_SCANNER
    UC_SCAN --> P_SKILL

    P_SKILL --> PG_SKILLS
    P_SCRAPER --> GITHUB_ADAPTER
    P_SCANNER --> AST_SCANNER

    style ENT_SKILL fill:#b794f4,color:#000,stroke:#805ad5
    style ENT_SCAN fill:#d6bcfa,color:#000,stroke:#b794f4
    style VO_SAFETY fill:#e9d8fd,color:#000,stroke:#d6bcfa
    style VO_PLATFORM fill:#e9d8fd,color:#000,stroke:#d6bcfa
    style P_SKILL fill:#fefcbf,color:#000,stroke:#f6e05e
    style P_SCRAPER fill:#fefcbf,color:#000,stroke:#f6e05e
    style P_SCANNER fill:#fefcbf,color:#000,stroke:#f6e05e
```

**Key Domain Objects:**

| Type         | Name                    | Description                                                                  |
| ------------ | ----------------------- | ---------------------------------------------------------------------------- |
| Entity       | `AISkillFile`           | Skill metadata, content, safety label, engagement metrics                    |
| Entity       | `SafetyScanResult`      | Scan findings, severity counts, scanner version, manual review status        |
| Value Object | `SafetyLabel`           | 4-state lifecycle: `UNANALYZED → SAFE \| SUSPICIOUS \| MALICIOUS`            |
| Sub-schema   | `AIPlatform`            | Target AI platform (claude, cursor, gemini, copilot, mcp, windsurf, generic) |
| Sub-schema   | `SmartContractLanguage` | Target language (solidity, vyper, rust, move, cairo, multi)                  |
| Port         | `ISkillDataPort`        | CRUD + filter + engagement + statistics for skill files                      |
| Port         | `ISafetyScannerPort`    | Execute safety scan, configure rules, stream progress                        |

---

### 4.3 Forensic Engine — Hexagonal Architecture

Engine γ manages Foundry-based exploit POC references, executes simulations on mainnet forks, and provides transaction trace analysis for historical DeFi incidents.

```mermaid
graph TB
    subgraph "Driving Adapters (Inbound)"
        HTTP_FORENSIC["HTTP Adapter<br/>(Fastify Route Handlers)"]
    end

    subgraph "Domain Core — Forensic Engine"
        direction TB
        UC_SIM["SimulateExploitUseCase"]
        UC_TRACE["GetTxTraceUseCase"]
        UC_POC["ListExploitPOCsUseCase"]
        UC_EXEC["ExecutePOCUseCase"]

        ENT_POC["Domain Entity<br/>ExploitPOC"]
        SUB_FORK["Sub-schema<br/>ForkParameters"]
        SUB_TARGET["Sub-schema<br/>TargetContract"]
    end

    subgraph "Driven Adapters (Outbound)"
        RPC_ADAPTER["EvmRpcAdapter<br/>(implements IChainDataPort)"]
        FOUNDRY["FoundryRunner<br/>(implements ISimulationPort)"]
    end

    subgraph "Ports (Interfaces)"
        P_CHAIN["IChainDataPort"]
        P_SIM["ISimulationPort"]
    end

    HTTP_FORENSIC --> UC_SIM
    HTTP_FORENSIC --> UC_TRACE
    HTTP_FORENSIC --> UC_POC
    HTTP_FORENSIC --> UC_EXEC

    UC_SIM --> P_SIM
    UC_SIM --> P_CHAIN
    UC_TRACE --> P_CHAIN
    UC_POC --> P_CHAIN
    UC_EXEC --> P_SIM

    P_CHAIN --> RPC_ADAPTER
    P_SIM --> FOUNDRY

    style ENT_POC fill:#68d391,color:#000,stroke:#38a169
    style SUB_FORK fill:#c6f6d5,color:#000,stroke:#9ae6b4
    style SUB_TARGET fill:#c6f6d5,color:#000,stroke:#9ae6b4
    style P_CHAIN fill:#fefcbf,color:#000,stroke:#f6e05e
    style P_SIM fill:#fefcbf,color:#000,stroke:#f6e05e
```

**Key Domain Objects:**

| Type       | Name              | Description                                                                   |
| ---------- | ----------------- | ----------------------------------------------------------------------------- |
| Entity     | `ExploitPOC`      | Foundry test file reference, fork params, execution status, complexity rating |
| Sub-schema | `ForkParameters`  | RPC URL env var, fork block number, chain, gas limit                          |
| Sub-schema | `TargetContract`  | Address, name, chain, isPrimaryTarget, isVerified                             |
| Port       | `IChainDataPort`  | Get tx, trace, block, contract info, balance (chain-agnostic)                 |
| Port       | `ISimulationPort` | Execute Foundry test, stream output, parse results                            |

---

## 5. Data Flow Diagrams

### 5.1 ETL Data Flow — Hacks Engine

The Hacks Engine ETL pipeline periodically fetches exploit data from DefiLlama, normalizes it against the `HackIncident` schema, deduplicates against existing records, and stores the enriched data in PostgreSQL with Redis caching.

```mermaid
flowchart LR
    subgraph "External Sources"
        DL["🌐 DefiLlama<br/>Hacks API"]
        DHL["📂 DeFiHackLabs<br/>GitHub Repo"]
    end

    subgraph "ETL Pipeline (BullMQ Worker)"
        FETCH["1️⃣ Fetch<br/>HTTP GET /hacks"]
        NORMALIZE["2️⃣ Normalize<br/>Map to HackIncident<br/>Zod validation"]
        ENRICH["3️⃣ Enrich<br/>Cross-ref DeFiHackLabs<br/>for Foundry POC paths"]
        DEDUP["4️⃣ Deduplicate<br/>Match by protocol +<br/>date + chain"]
        VALIDATE["5️⃣ Validate<br/>Schema refinements<br/>fundsReturned ≤ lossUsd"]
    end

    subgraph "Persistence"
        PG["🐘 PostgreSQL<br/>hack_incidents"]
        REDIS["⚡ Redis<br/>aegis:hacks:*"]
        LOG["📋 ETL Sync Log<br/>etl_sync_log"]
    end

    DL -->|"JSON response"| FETCH
    DHL -->|"Git file listing"| ENRICH
    FETCH --> NORMALIZE
    NORMALIZE --> ENRICH
    ENRICH --> DEDUP
    DEDUP --> VALIDATE
    VALIDATE -->|"UPSERT"| PG
    VALIDATE -->|"Invalidate cache"| REDIS
    VALIDATE -->|"Log sync result"| LOG

    style DL fill:#667eea,color:#fff
    style DHL fill:#667eea,color:#fff
    style PG fill:#38a169,color:#fff
    style REDIS fill:#e53e3e,color:#fff
```

### 5.2 Safety Scanner Pipeline — Skills Engine

The Skills Engine safety scanner pipeline indexes AI skill files from GitHub, parses them using Acorn AST, runs a configurable rule engine against the parsed content, and classifies each file with a `SafetyLabel`.

```mermaid
flowchart LR
    subgraph "External Source"
        GH["🐙 GitHub API<br/>AI Skill Repos"]
    end

    subgraph "Indexing Pipeline (BullMQ Worker)"
        SCRAPE["1️⃣ Scrape<br/>Fetch SKILL.md files<br/>from target repos"]
        PARSE["2️⃣ Parse<br/>gray-matter YAML<br/>frontmatter extraction"]
        HASH["3️⃣ Hash<br/>SHA-256 content hash<br/>for deduplication"]
        STORE["4️⃣ Store<br/>UPSERT AISkillFile<br/>into PostgreSQL"]
    end

    subgraph "Safety Scanner Pipeline"
        AST["5️⃣ AST Parse<br/>Acorn JS/TS parser<br/>for embedded code"]
        RULES["6️⃣ Rule Engine<br/>Pattern matching:<br/>• Prompt injection<br/>• File system access<br/>• Network requests<br/>• Code exfiltration<br/>• Shell execution"]
        SCORE["7️⃣ Score<br/>Aggregate findings<br/>by severity"]
        LABEL["8️⃣ Label<br/>Assign SafetyLabel:<br/>SAFE | SUSPICIOUS<br/>| MALICIOUS"]
    end

    subgraph "Output"
        PG_SKILL["🐘 PostgreSQL<br/>ai_skill_files"]
        PG_SCAN["🐘 PostgreSQL<br/>safety_scan_results"]
    end

    GH --> SCRAPE
    SCRAPE --> PARSE
    PARSE --> HASH
    HASH --> STORE
    STORE --> AST
    AST --> RULES
    RULES --> SCORE
    SCORE --> LABEL
    LABEL --> PG_SKILL
    LABEL --> PG_SCAN

    style GH fill:#667eea,color:#fff
    style PG_SKILL fill:#805ad5,color:#fff
    style PG_SCAN fill:#805ad5,color:#fff
```

---

## 6. Sequence Diagrams

### 6.1 Hack Search Flow

The primary user journey: a researcher searches for DeFi exploits by attack vector, chain, and date range with paginated results.

```mermaid
sequenceDiagram
    actor User as Security Researcher
    participant Web as Web Frontend<br/>(Next.js)
    participant GW as API Gateway<br/>(Fastify)
    participant HE as Hacks Engine<br/>(ListHacksUseCase)
    participant Cache as Redis Cache
    participant DB as PostgreSQL

    User->>Web: Enter search filters<br/>(vector=reentrancy, chain=ethereum)
    Web->>GW: GET /api/v1/hacks?attackVector=reentrancy<br/>&chain=ethereum&page=1&pageSize=20
    GW->>GW: Zod validate query params
    GW->>HE: listHacks(filters)

    HE->>Cache: GET aegis:hacks:list:{filterHash}
    alt Cache HIT
        Cache-->>HE: Cached PaginatedResult
    else Cache MISS
        HE->>DB: SELECT * FROM hack_incidents<br/>WHERE attack_vector = 'reentrancy'<br/>AND chain = 'ethereum'<br/>ORDER BY date DESC<br/>LIMIT 20 OFFSET 0
        DB-->>HE: rows + total count
        HE->>Cache: SET aegis:hacks:list:{filterHash}<br/>TTL=60s
    end

    HE-->>GW: PaginatedResult<HackIncident>
    GW-->>Web: 200 OK { data, total, page, pageSize, totalPages }
    Web-->>User: Render hack incident cards<br/>with attack vector badges
```

### 6.2 Skill Copy Flow

A researcher finds a useful AI skill file and copies it for use in their own AI coding assistant.

```mermaid
sequenceDiagram
    actor User as Security Researcher
    participant Web as Web Frontend<br/>(Next.js)
    participant GW as API Gateway<br/>(Fastify)
    participant SE as Skills Engine<br/>(CopySkillFileUseCase)
    participant DB as PostgreSQL

    User->>Web: Click "Copy Skill" on<br/>Solidity Reentrancy Detector
    Web->>GW: POST /api/v1/skills/{id}/copy
    GW->>GW: Zod validate path params
    GW->>SE: copySkillFile(skillId)

    SE->>DB: SELECT * FROM ai_skill_files<br/>WHERE id = :skillId
    DB-->>SE: AISkillFile record

    alt Safety Check
        SE->>SE: Verify safetyLabel ≠ MALICIOUS
        Note over SE: Block copy if MALICIOUS<br/>Warn if SUSPICIOUS
    end

    SE->>DB: UPDATE ai_skill_files<br/>SET copy_count = copy_count + 1<br/>WHERE id = :skillId
    DB-->>SE: Updated record

    SE-->>GW: { content, metadata, safetyLabel }
    GW-->>Web: 200 OK { skill file content }
    Web-->>User: Copy to clipboard +<br/>show safety badge
```

### 6.3 Exploit Simulation Flow

A researcher selects a historical DeFi exploit and runs a Foundry-based simulation on a mainnet fork to reproduce the attack.

```mermaid
sequenceDiagram
    actor User as Security Researcher
    participant Web as Web Frontend<br/>(Next.js)
    participant GW as API Gateway<br/>(Fastify)
    participant FE as Forensic Engine<br/>(SimulateExploitUseCase)
    participant RPC as EVM RPC Provider
    participant Foundry as Foundry CLI<br/>(forge test)

    User->>Web: Click "Simulate" on<br/>Euler Finance Flash Loan exploit
    Web->>GW: POST /api/v1/forensic/simulate<br/>{ pocId, forkBlockNumber }
    GW->>GW: Zod validate request body
    GW->>FE: simulateExploit(pocId, params)

    FE->>FE: Load ExploitPOC record
    FE->>RPC: eth_getBlockByNumber<br/>(verify fork block exists)
    RPC-->>FE: Block data

    FE->>Foundry: forge test<br/>--match-path "src/test/2023-03/Euler_exp.t.sol"<br/>--match-test "testExploit"<br/>--fork-url $RPC_URL_MAINNET<br/>--fork-block-number 16817996<br/>-vvv

    Note over Foundry: Foundry compiles contracts,<br/>forks mainnet at block 16817996,<br/>executes exploit test

    Foundry-->>FE: Test output (pass/fail)<br/>+ gas report + trace logs

    FE->>FE: Parse trace output into<br/>TransactionTrace tree

    FE-->>GW: { status: "passing",<br/>executionTimeMs: 12340,<br/>trace: TransactionTrace,<br/>gasUsed: "1,234,567" }
    GW-->>Web: 200 OK { simulation result }
    Web-->>User: Render trace visualization<br/>+ call tree + gas breakdown
```

---

## 7. Technology Stack Matrix

| Layer                   | Technology     | Version | Justification                                                        |
| ----------------------- | -------------- | ------- | -------------------------------------------------------------------- |
| **Frontend Framework**  | Next.js        | 15.3    | App Router with RSC, streaming, built-in optimization                |
| **UI Library**          | React          | 19.0    | Concurrent features, Server Components                               |
| **Charts**              | Recharts       | 2.12    | React-native charting for loss trends and attack vector breakdowns   |
| **Animation**           | Framer Motion  | 11.0    | Production-grade animation library for micro-interactions            |
| **Icons**               | Lucide React   | 0.344   | Consistent icon set with tree-shaking                                |
| **Backend Framework**   | Fastify        | 5.7     | Fastest Node.js HTTP framework, native TypeScript, schema validation |
| **Validation**          | Zod            | 3.22    | TypeScript-first schema declaration with runtime validation          |
| **Database**            | PostgreSQL     | 16      | Advanced indexing (GIN, GiST, pg_trgm), JSONB, partitioning          |
| **Cache**               | Redis          | 7       | In-memory cache + BullMQ persistent job queue backend                |
| **Job Queue**           | BullMQ         | 5.1     | Redis-backed job queue with retries, priorities, and rate limiting   |
| **HTTP Client**         | Axios          | 1.13    | HTTP client for external API calls (DefiLlama, GitHub)               |
| **Blockchain (read)**   | Viem           | 2.8     | Modern TypeScript EVM library — type-safe, tree-shakeable            |
| **Blockchain (legacy)** | ethers.js      | 6.11    | Broad ecosystem support, ABI encoding, contract interaction          |
| **AST Parser**          | Acorn          | 8.11    | Lightweight JS parser for skill file safety analysis                 |
| **YAML Parser**         | gray-matter    | 4.0     | YAML frontmatter extraction from Markdown skill files                |
| **Logging**             | Winston        | 3.11    | Structured JSON logging with transports and log levels               |
| **Date Handling**       | date-fns       | 3.3     | Immutable, tree-shakeable date utilities                             |
| **Language**            | TypeScript     | 5.4+    | Strict mode, project references, composite builds                    |
| **Build System**        | Turborepo      | latest  | Incremental builds, task caching, topological ordering               |
| **Package Manager**     | pnpm           | latest  | Workspace support, strict mode, no phantom dependencies              |
| **Runtime**             | Node.js        | 20 LTS  | Latest LTS with native ESM, fetch, and performance improvements      |
| **Containerization**    | Docker         | latest  | Multi-stage builds, Alpine base images, health checks                |
| **Orchestration**       | Docker Compose | latest  | Local development stack with hot-reload volume mounts                |
| **Simulation**          | Foundry        | latest  | forge test + fork mode for exploit simulation                        |

---

## 8. Cross-Cutting Concerns

### 8.1 Structured Logging

```
┌─────────────────────────────────────────────────┐
│  Logger (Winston) — @aegis/core                 │
│                                                 │
│  Format: JSON structured logs                   │
│  Fields: timestamp, level, message,             │
│          correlationId, service, metadata        │
│                                                 │
│  Levels: error → warn → info → debug → trace    │
│  Transport: console (dev), JSON file (prod)     │
│  Correlation: AsyncLocalStorage per request      │
└─────────────────────────────────────────────────┘
```

| Concern         | Implementation                                | Location                         |
| --------------- | --------------------------------------------- | -------------------------------- |
| Log Format      | JSON structured with correlation ID           | `@aegis/core`                    |
| Request Tracing | `X-Correlation-ID` header → AsyncLocalStorage | API Gateway middleware           |
| Log Levels      | `error`, `warn`, `info`, `debug`, `trace`     | Environment variable `LOG_LEVEL` |
| Sensitive Data  | Never log passwords, tokens, or PII           | Logger sanitization middleware   |

### 8.2 Error Handling

```
AegisError (base)
├── ValidationError     → 400 Bad Request
├── NotFoundError       → 404 Not Found
├── ConflictError       → 409 Conflict
├── RateLimitError      → 429 Too Many Requests
├── ExternalServiceError → 502 Bad Gateway
└── InternalError       → 500 Internal Server Error

Response format (RFC 7807):
{
  "error": "VALIDATION_ERROR",
  "code": "AEGIS-400-001",
  "message": "Invalid query parameters",
  "details": [{ "field": "page", "message": "Must be ≥ 1" }],
  "timestamp": "2026-04-03T14:00:00Z"
}
```

### 8.3 Authentication & Authorization

| Aspect          | Strategy                        | Phase   |
| --------------- | ------------------------------- | ------- |
| Phase 1–2       | No auth — public read-only API  | Current |
| Phase 3+        | JWT bearer tokens (short-lived) | Future  |
| Admin endpoints | API key-based access            | Phase 3 |
| Rate limiting   | Per-IP: 100 req/min (anonymous) | Active  |

### 8.4 Caching Strategy

| Data Type          | Cache Key Pattern                | TTL  | Invalidation           |
| ------------------ | -------------------------------- | ---- | ---------------------- |
| Hack list queries  | `aegis:hacks:list:{filterHash}`  | 60s  | On ETL sync completion |
| Hack detail        | `aegis:hacks:detail:{id}`        | 300s | On record update       |
| Dashboard stats    | `aegis:hacks:stats`              | 300s | On ETL sync completion |
| Skill list queries | `aegis:skills:list:{filterHash}` | 60s  | On new index/scan      |
| Skill detail       | `aegis:skills:detail:{id}`       | 300s | On record update       |
| Skills stats       | `aegis:skills:stats`             | 300s | On new index/scan      |

### 8.5 Environment Configuration

All environment variables are validated at startup using Zod schemas defined in `@aegis/core`:

| Schema                    | Variables                                                 | Required By                 |
| ------------------------- | --------------------------------------------------------- | --------------------------- |
| `DatabaseEnvSchema`       | `DATABASE_URL`, `POSTGRES_HOST`, `POSTGRES_DB`, etc.      | All engines                 |
| `RedisEnvSchema`          | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`              | Hacks Engine, Skills Engine |
| `ApiGatewayEnvSchema`     | `API_PORT`, `API_HOST`, `CORS_ORIGIN`, `API_RATE_LIMIT_*` | API Gateway                 |
| `HacksEngineEnvSchema`    | `DEFILLAMA_API_URL`, `HACKS_SYNC_CRON`                    | Hacks Engine                |
| `SkillsEngineEnvSchema`   | `GITHUB_TOKEN`, `SKILLS_SYNC_CRON`                        | Skills Engine               |
| `ForensicEngineEnvSchema` | `RPC_URL_MAINNET`, `RPC_URL_BSC`, `FOUNDRY_PATH`          | Forensic Engine             |
| `FrontendEnvSchema`       | `NEXT_PUBLIC_API_URL`                                     | Web Frontend                |
| `FeatureFlagsEnvSchema`   | `ENABLE_FORENSIC_ENGINE`, `ENABLE_SAFETY_SCANNER`         | All                         |

---

## 9. Architecture Decision Records

| ADR     | Decision                                       | Rationale                                                                                                                                                                                                                            |
| ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ADR-001 | Hexagonal Architecture over Clean Architecture | Simpler port/adapter pattern; entities and ports in a shared kernel (`@aegis/core`) with adapters in each engine package. No separate "use case layer" package — use cases live inside each engine.                                  |
| ADR-002 | Turborepo monorepo over polyrepo               | Single repository for code sharing, atomic commits, unified CI/CD, and shared TypeScript project references. All engines share domain types from `@aegis/core`.                                                                      |
| ADR-003 | Zod over io-ts or class-validator              | Zod 3.x provides the best TypeScript inference, composability (`z.object`, `z.union`), and ecosystem integration (Fastify type provider, OpenAPI generation). Schemas serve as single source of truth for both validation and types. |
| ADR-004 | Fastify over Express or NestJS                 | Fastify 5 is the fastest Node.js HTTP framework with native schema validation, plugin encapsulation, and TypeScript support. NestJS rejected for unnecessary decorator complexity at current scale.                                  |
| ADR-005 | PostgreSQL over MongoDB                        | Relational data model (hack incidents with FK to scans, skills to scan results) benefits from ACID transactions, rich indexing (GIN for JSONB, pg_trgm for search), and SQL analytics.                                               |
| ADR-006 | BullMQ over Agenda or custom cron              | BullMQ provides persistent job queues with Redis backend, built-in retry/backoff, job priorities, and rate limiting — essential for ETL reliability.                                                                                 |
| ADR-007 | Viem + ethers.js over web3.js                  | Viem for modern type-safe chain interactions; ethers.js retained for ABI encoding compatibility and broader ecosystem contract tooling. web3.js rejected for larger bundle size and weaker types.                                    |
| ADR-008 | Domain entities as Zod schemas (not classes)   | Plain object entities with Zod schema validation over OOP classes. Enables serialization-free API responses, immutability, and framework independence. Factory functions provide computed properties.                                |
| ADR-009 | Acorn AST for Safety Scanning                  | Lightweight core parser (< 200KB) vs. full TypeScript compiler API. Sufficient for detecting code patterns (function calls, imports, network requests) in skill files without needing type information.                              |
| ADR-010 | Docker Compose for development                 | Docker Compose provides a single-command boot for the full stack (PostgreSQL, Redis, API, Web, Workers) with hot-reload volume mounts. Kubernetes reserved for staging/production.                                                   |

---

## 10. Appendices

### A. Directory Structure

```
altflex-aegis/
├── apps/
│   ├── api-gateway/           # @aegis/api-gateway — Fastify 5 BFF
│   │   └── src/
│   │       ├── config/        # Environment configuration
│   │       ├── middleware/     # CORS, rate limit, error handler
│   │       ├── routes/        # Route handlers by domain
│   │       └── server.ts      # Entry point
│   └── web/                   # @aegis/web — Next.js 15 frontend
│       └── src/
│           ├── app/           # App Router pages + layouts
│           ├── components/    # UI components
│           ├── hooks/         # Custom React hooks
│           ├── lib/           # Utilities and configurations
│           └── styles/        # Global styles and tokens
├── packages/
│   ├── core/                  # @aegis/core — Shared domain kernel
│   │   └── src/
│   │       ├── domain/
│   │       │   ├── entities/  # HackIncident, AISkillFile, ExploitPOC, SafetyScanResult
│   │       │   ├── ports/     # IHackDataPort, ISkillDataPort, IChainDataPort, etc.
│   │       │   └── value-objects/  # AttackVector, Chain, SafetyLabel
│   │       └── shared/
│   │           ├── constants/ # Application constants
│   │           ├── env/       # Zod env schemas + validators
│   │           ├── types/     # Shared TypeScript types
│   │           └── utils/     # Utility functions
│   ├── hacks-engine/          # @aegis/hacks-engine — Engine α
│   │   └── src/
│   │       ├── adapters/      # PostgreSQL, Redis, DefiLlama adapters
│   │       ├── application/   # Use cases (list, detail, stats, sync)
│   │       ├── domain/        # Engine-specific domain logic
│   │       └── infrastructure/# BullMQ worker, config
│   ├── skills-engine/         # @aegis/skills-engine — Engine β
│   │   └── src/
│   │       ├── adapters/      # PostgreSQL, GitHub, Acorn adapters
│   │       ├── application/   # Use cases (list, scan, index, copy)
│   │       ├── domain/        # Engine-specific domain logic
│   │       └── infrastructure/# BullMQ worker, scanner config
│   └── forensic-engine/       # @aegis/forensic-engine — Engine γ
│       └── src/
│           ├── adapters/      # EVM RPC, Foundry CLI adapters
│           ├── application/   # Use cases (simulate, trace, execute)
│           ├── domain/        # Engine-specific domain logic
│           └── infrastructure/# Foundry process management
├── infrastructure/
│   ├── ci/                    # CI/CD workflow definitions
│   ├── docker/                # Dockerfiles (multi-stage)
│   └── terraform/             # Infrastructure as Code
├── docs/                      # Documentation
├── docker-compose.dev.yml     # Development stack
├── turbo.json                 # Turborepo pipeline configuration
├── pnpm-workspace.yaml        # Workspace definition
├── tsconfig.json              # Root TypeScript config
└── ARCHITECTURE.md            # This document
```

### B. Port Interface Summary

| Port                 | Package       | Methods                                                                                                                                                    | Adapters                                           |
| -------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `IHackDataPort`      | `@aegis/core` | `findById`, `findAll`, `save`, `saveBatch`, `update`, `delete`, `count`, `getAttackVectorStats`, `getChainStats`, `getLossTimeSeries`, `getDashboardStats` | PostgresHackDataAdapter, InMemoryHackDataAdapter   |
| `ISkillDataPort`     | `@aegis/core` | `findById`, `findAll`, `save`, `update`, `delete`, `findByContentHash`, platform/language/safety stats                                                     | PostgresSkillDataAdapter, InMemorySkillDataAdapter |
| `ISafetyScannerPort` | `@aegis/core` | `scan`, `configure`, `getRules`, `getVersion`                                                                                                              | AcornSafetyScanner                                 |
| `IChainDataPort`     | `@aegis/core` | `getTransaction`, `getTransactionTrace`, `getBlock`, `getBlockByTimestamp`, `getContractInfo`, `isContract`, `getBalance`                                  | EvmRpcAdapter (per chain)                          |
| `ICachePort`         | `@aegis/core` | `get`, `set`, `delete`, `exists`, `ttl`                                                                                                                    | RedisCacheAdapter                                  |

### C. Docker Compose Service Map

| Service       | Container Name            | Image                | Port | Depends On      |
| ------------- | ------------------------- | -------------------- | ---- | --------------- |
| postgres      | `aegis-postgres-dev`      | `postgres:16-alpine` | 5432 | —               |
| redis         | `aegis-redis-dev`         | `redis:7-alpine`     | 6379 | —               |
| api-gateway   | `aegis-api-gateway-dev`   | Custom (Dockerfile)  | 4000 | postgres, redis |
| web           | `aegis-web-dev`           | Custom (Dockerfile)  | 3000 | api-gateway     |
| hacks-worker  | `aegis-hacks-worker-dev`  | Custom (Dockerfile)  | —    | postgres, redis |
| skills-worker | `aegis-skills-worker-dev` | Custom (Dockerfile)  | —    | postgres, redis |

### D. Academic Thesis Alignment

| Thesis       | Title                                                                                                     | AEGIS Components                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Thesis 1** | _Automated Detection of Malicious Intent in AI Audit Skill Files for Web3 Security_                       | Skills Engine (β), Safety Scanner, AISkillFile entity, SafetyScanResult entity, SafetyLabel value object |
| **Thesis 2** | _Programmatic Exploit Simulation and Forensic Trace Analysis Using Foundry for Historical DeFi Incidents_ | Hacks Engine (α), Forensic Engine (γ), HackIncident entity, ExploitPOC entity, AttackVector taxonomy     |

---

> _This document is a living artifact. It is updated with each phase of development to reflect the current system architecture. All diagrams are authored in Mermaid for version control and portability._
>
> **Document Version**: 1.0.0 — Phase 1 Deliverable (P1-ARCH-001)
> **Next Review**: Phase 1 Gate (upon completion of P1-ARCH-012)
