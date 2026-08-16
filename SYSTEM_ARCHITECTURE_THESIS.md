# System Architecture — AltFlex Web3 Intelligence Platform

> **Web3 Exploit Intelligence & ML Classification Platform**
>
> _Academic Reference Document for Thesis 2_

| Field                  | Value                                                     |
| ---------------------- | --------------------------------------------------------- |
| **Document Version**   | 1.0.0 (Thesis Edition)                                    |
| **Architecture Style** | Hexagonal (Ports & Adapters) + Modular Monorepo           |
| **Primary Scope**      | Exploit Analytics, Forensic Simulation, ML Classification |
| **Academic Alignment** | Thesis 2 (Forensic Simulation & Pattern Classification)   |

---

## 1. Executive Summary

AltFlex is a real-time Web3 security intelligence platform that aggregates, analyzes, and simulates DeFi exploit data alongside a Machine Learning Exploit Pattern Recognizer.

The platform is organized around three core pillars tailored for forensic analysis:

| Component                 | Domain                                              | Technology           |
| ------------------------- | --------------------------------------------------- | -------------------- |
| **Exploit Analytics**     | DeFi exploit incident aggregation and dashboard     | TypeScript / Node.js |
| **Forensic Simulation**   | Foundry-based exploit simulation and trace analysis | TypeScript / Viem    |
| **ML Pattern Recognizer** | Transaction trace pattern classification            | Python / XGBoost     |

### Architectural Principles

1. **Hexagonal Architecture (Ports & Adapters)**: Framework-agnostic domain core with injectable infrastructure.
2. **Monorepo Modularity**: Turborepo-managed workspace with strict package boundaries.
3. **ML Pipeline Integration**: Python-based ML models integrated asynchronously via data pipelines.
4. **Domain-Driven Design**: Core entities (`HackIncident`, `ExploitPOC`) shared across modules.

---

## 2. System Context — C4 Level 1

The system context diagram positions the AltFlex platform within the broader Web3 security ecosystem.

```mermaid
C4Context
    title AltFlex System Context (C4 Level 1)

    Person(researcher, "Security Researcher", "Browses hacks, simulates exploits, views ML classifications")

    System(altflex, "AltFlex Platform", "Web3 security intelligence platform (Dashboard + Forensics + ML)")

    System_Ext(defillama, "DefiLlama API", "DeFi protocol TVL and hack incident data")
    System_Ext(defihacklabs, "DeFiHackLabs (GitHub)", "Foundry POC test files for historical exploits")
    System_Ext(rpc, "EVM RPC Providers", "Ethereum, BSC, Polygon, Arbitrum, Base")
    System_Ext(foundry, "Foundry (Local)", "Smart contract compilation, testing, and fork simulation")

    Rel(researcher, altflex, "Searches hacks, runs simulations", "HTTPS")
    Rel(altflex, defillama, "Fetches hack incident data", "REST API")
    Rel(altflex, defihacklabs, "Indexes Foundry POC test files", "Git/HTTPS")
    Rel(altflex, rpc, "Reads chain data, fetches tx traces", "JSON-RPC")
    Rel(altflex, foundry, "Executes exploit simulations on mainnet forks", "CLI / stdin")
```

---

## 3. Container Overview — C4 Level 2

The container diagram shows all deployable units and the introduction of the Machine Learning pipeline.

```mermaid
C4Container
    title AltFlex Container Diagram (C4 Level 2)

    Person(user, "Security Researcher")

    Container_Boundary(altflex, "AltFlex Platform") {

        Container(web, "Web Frontend", "Next.js 15", "Security dashboard with charts and forensic trace viewer")
        Container(gateway, "API Gateway", "Fastify 5", "BFF gateway — routing, rate limiting, Zod validation")

        Container(hacks_engine, "Exploit Analytics Engine", "TypeScript / BullMQ", "Hack incident aggregation, filtering, ETL pipeline")
        Container(forensic_engine, "Forensic Simulation Engine", "TypeScript / Viem", "Exploit simulation, tx trace analysis, EVM state decoding")
        Container(ml_engine, "ML Pattern Recognizer", "Python 3.13 / XGBoost", "Multi-label classification of exploit traces into 10 categories")
        Container(core, "Core Shared Kernel", "TypeScript / Zod", "Domain entities, value objects, ports")

        ContainerDb(postgres, "PostgreSQL 16", "Primary datastore — hack incidents, ML reports, simulation logs")
        ContainerDb(redis, "Redis 7", "Cache layer + BullMQ job queue backend")
    }

    System_Ext(defillama, "External APIs", "DefiLlama, GitHub")
    System_Ext(rpc, "Blockchain Nodes", "EVM RPCs")

    Rel(user, web, "Browses dashboard", "HTTPS")
    Rel(web, gateway, "API calls", "REST")
    Rel(gateway, hacks_engine, "In-process import", "TypeScript")
    Rel(gateway, forensic_engine, "In-process import", "TypeScript")
    Rel(hacks_engine, core, "Implements ports", "TypeScript")
    Rel(forensic_engine, core, "Implements ports", "TypeScript")

    Rel(forensic_engine, ml_engine, "Passes trace features for classification", "JSON/CSV Pipeline")
    Rel(ml_engine, postgres, "Writes classifications", "SQL")

    Rel(hacks_engine, postgres, "Reads/writes", "pg :5432")
    Rel(forensic_engine, postgres, "Reads/writes", "pg :5432")

    Rel(hacks_engine, defillama, "ETL sync", "REST API")
    Rel(forensic_engine, rpc, "Fetches tx/traces", "JSON-RPC")
```

---

## 4. Component Details — C4 Level 3

### 4.1 Exploit Analytics (Hacks Engine)

Aggregates DeFi exploit incident data from external sources, normalizes it into `HackIncident` domain entities, and provides filtered/paginated query APIs.

### 4.2 Forensic Simulation Engine

Manages Foundry-based exploit POC references, executes simulations on mainnet forks, and extracts deep transaction traces.

### 4.3 Machine Learning Integration

The ML Pattern Recognizer is a standalone Python 3.13 component that acts upon the data generated by the Forensic Engine.

- **Pipeline:** Extracts 28 execution features from raw EVM traces (depth, distinct contracts, gas usage, recursive patterns).
- **Model:** An XGBoost One-vs-Rest (OvR) Multi-Label Classifier.
- **Integration:** Once the Forensic Engine extracts a trace, it triggers the ML pipeline, which classifies the trace into one or more of 10 attack vectors (for instance, Reentrancy, Flash Loan, Oracle Manipulation). The result is saved to PostgreSQL and surfaced in the Next.js UI.

---

## 5. Sequence Diagram: Exploit Simulation to ML Classification

This flow illustrates how the ML model is embedded directly into the forensic simulation process.

```mermaid
sequenceDiagram
    actor User as Researcher
    participant Web as Web Frontend
    participant GW as API Gateway
    participant FE as Forensic Engine
    participant Foundry as Foundry CLI
    participant ML as ML Pattern Recognizer (Python)
    participant DB as PostgreSQL

    User->>Web: Click "Simulate Exploit"
    Web->>GW: POST /api/v1/forensic/simulate
    GW->>FE: simulateExploit(pocId)

    FE->>Foundry: forge test --fork-url $RPC_URL
    Foundry-->>FE: Test output + Raw EVM Trace

    FE->>FE: Extract 28 structural features from Trace
    FE->>ML: Pass Feature Vector (CSV/JSON payload)

    Note over ML: XGBoost (OvR) evaluates features<br/>against 10 attack vector classes

    ML-->>FE: Classification Result (Vectors + Probabilities)
    FE->>DB: Save Simulation & Classification Data

    FE-->>GW: { trace, ml_classifications, executionTimeMs }
    GW-->>Web: 200 OK
    Web-->>User: Render Trace Tree & Pattern Report
```
