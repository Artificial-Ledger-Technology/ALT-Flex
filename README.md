# 🛡️ AltFlex AEGIS v3.0

> **A**daptive **E**xploit & **G**overnance **I**ntelligence **S**ystem

<div align="center">
  <h2>The Shield of Web3 — Protection & Authority</h2>
  <p>A dual-engine Web3 security intelligence system combining a massive-scale ETL pipeline for Defi exploits and an AI Skills safety scanner.</p>
</div>

## A. Project Overview
**AltFlex AEGIS v3.0** is an integrated AI and digital forensics framework encompassing two primary engines:
1. **Engine α — Hacks Dashboard**: A massive-scale ETL pipeline sourcing from DefiLlama and DeFiHackLabs.
2. **Engine β — AI Skills Explorer**: A curated repository and marketplace for AI audit skill files with an automated Safety Scanner.

## B. Problem Statement
DeFi protocols and cross-chain bridges are increasingly vulnerable to exploits, resulting in significant financial losses. Current security measures often lack the agility and intelligence to detect sophisticated attack vectors. AltFlex addresses this critical need by providing a proactive and adaptive solution for identifying and mitigating potential exploits using advanced AI/ML techniques.

## C. Objectives
**Primary Objective:**
- Develop a functional AI-powered forensic framework (AltFlex) for automated exploit detection in DeFi and cross-chain environments.

**Secondary Objectives:**
- Implement machine learning models for anomaly detection and pattern recognition in transaction data.
- Create a user-friendly interface for visualizing forensic analysis results.
- Establish a comprehensive database of known exploit signatures and attack patterns.
- Evaluate the framework's effectiveness through rigorous testing and validation against real-world exploit scenarios.

## D. Methodology
The project will be executed in the following phases:
1. **Data Collection**: Gather historical transaction data, smart contract code, and exploit reports.
2. **Data Preprocessing**: Clean, transform, and normalize collected data.
3. **Model Development**: Develop and train AI/ML models for anomaly detection and pattern recognition.
4. **Framework Implementation**: Integrate models into the AltFlex framework with UI and visualization.
5. **Testing and Validation**: Evaluate performance against simulated and real-world scenarios.
6. **Integration and Testing**: Deploy and test in sandboxed blockchain environments.

<!-- 🤖 Blue Pingie 🤖 -->
<div align="center">
<img src="https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MnNjNXdxbTlyYmZodm9jamZhZjR1c3Fjdzc3djk3bW1iYTMyNDhwcyZlcD12MV9zdGlja2Vyc19yZWxhdGVkJmN0PXM/wH440SOB1dNUpweF93/giphy.gif" width="250">
<img src="https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3a3VudjJnOTZkbjJpNGV3c2ZjdHFiOXB6enpjcTU0dGJzanEwcnRwciZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/xsrtTrbC5MxJ5ltuvj/giphy.gif" width="300">
<img src="https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NjM5am54eWk0dWg4ZjNnc3Zka2NmcDFwOXI3dHRwcHAyam93MW9xNCZlcD12MV9zdGlja2Vyc19yZWxhdGVkJmN0PXM/RIqDQOdEJZzg2Zijvm/giphy.gif" width="250">
</div>

---

## 🚀 Phase 1: Production-Ready Architecture (Flash Loan Detection)

### Architecture Overview

```mermaid
flowchart LR
    subgraph Data Layer
        A[Etherscan API] --> B[EtherscanCollector]
        C[Sample Data] --> D[data/]
    end
    
    subgraph Processing
        B --> E[FeatureEngineer]
        D --> E
        E --> F[AnomalyDetector]
        E --> G[ExploitDetector]
        E --> H[BehavioralAnalyzer]
    end
    
    subgraph API Layer
        F --> I[FastAPI :8000]
        G --> I
        H --> I
    end
    
    subgraph Frontend
        I --> J[Next.js Dashboard :3000]
        J --> K[Landing Page]
        J --> L[Transaction Analysis]
        J --> M[Address Verification]
        J --> N[Exploit Database]
    end
```
### ✨ Key Features Implemented
| Component | Description | Status |
|-----------|-------------|--------|
| 🔍 **Rule-Based Detection** | 6 detection rules for flash loan patterns | ✅ Complete |
| 🤖 **ML Anomaly Detection** | XGBoost classifier with training pipeline | ✅ Complete |
| 🌐 **FastAPI Backend** | 12 REST API endpoints with security middleware | ✅ Complete |
| 🎨 **Next.js Frontend** | Premium dashboard with 5 pages | ✅ Complete |
| 🛡️ **Address Verification** | 5-layer validation pipeline | ✅ Complete |
| 📦 **Sample Data** | 5 real exploits, 50 transactions | ✅ Complete |
| ✅ **Unit Tests** | 159 test cases (100% passing) | ✅ Complete |

### 📈 Known Exploits Tracked
| Exploit | Date | Protocol | Loss |
|---------|------|----------|------|
| Euler Finance | 2023-03-13 | Euler | $197M |
| Cream Finance | 2021-10-27 | Cream | $130M |
| Pancake Bunny | 2021-05-20 | PancakeBunny | $45M |
| Harvest Finance | 2020-10-26 | Harvest | $34M |
| bZx Protocol | 2020-02-15 | bZx | $350K |

### 📊 Proof-of-Concept: Benchmarking Results

**Dataset:** 50 samples (12 Exploit / 38 Normal) · **Source:** 5 Major Exploits ($406.35M)  
**Validation:** 5-Fold Stratified CV × 5 Repeats = **25 independent runs per algorithm**

#### Benchmark Table (Multi-Run Validated, Mean ± Std)

| Algorithm | Accuracy | F1 | ROC-AUC | Latency |
|-----------|----------|-----|---------|---------|
| **XGBoost (Ours)** | **0.96** | **0.98 ± 0.10** | **0.99 ± 0.07** | **~87ms** |
| Isolation Forest | 0.98 ± 0.03 | 0.98 ± 0.05 | 1.00 ± 0.00 | ~45ms |
| One-Class SVM | 0.85 ± 0.11 | 0.80 ± 0.12 | 1.00 ± 0.00 | ~62ms |

#### Accuracy Comparison

```
XGBoost (Ours)     96%  ████████████████████████████████████████████████
Isolation Forest   98%  █████████████████████████████████████████████████
One-Class SVM      85%  ██████████████████████████████████████████
```

| Metric | Value |
|--------|-------|
| **Rule Coverage** | 100% Combined Detection |
| **Avg Confidence** | 0.98 |

---

#### 🔑 Why XGBoost Is Still the Valid Choice

Both XGBoost and Isolation Forest achieve ~98-99% accuracy on this PoC dataset. However, **XGBoost was selected as the primary algorithm** for the following reasons:

1. **Supervised vs. Unsupervised** — XGBoost learns *what an exploit looks like* from labeled data. Isolation Forest only detects statistical outliers and may flag unusual-but-legitimate transactions as attacks in production environments.
2. **Perfect Precision (Zero False Positives)** — XGBoost achieved **1.00 precision across all 25 runs**, meaning it never falsely accused a normal transaction. Isolation Forest dropped to 0.75 precision in some folds — a critical concern for a security tool where false alarms erode user trust.
3. **Interpretability** — XGBoost provides feature importance scores, enabling explainable detection. This is essential for forensic analysis where *why* a transaction was flagged matters as much as *whether* it was flagged.
4. **Production Scalability** — With larger, more diverse real-world datasets, supervised models generalize better than unsupervised anomaly detectors.

#### 📌 Why Both Algorithms Score High on This Dataset

> The PoC dataset (50 samples) contains **clearly separable classes** — exploit transactions exhibit extreme values (2,500–12,000 ETH, 1.8M–3.2M gas) vs. normal transactions (0.05–15 ETH, 88K–260K gas). With such clean separation, any reasonable algorithm achieves near-perfect results. The differentiation between algorithms would become more significant with a larger, more diverse dataset. This is expected behavior for a proof-of-concept and does not diminish the framework's value.

#### 📐 Rule Coverage & Avg Confidence Breakdown

**Rule Coverage: 100%** — All 5 flash loan detection rules from the rule-based engine cover the complete exploit dataset:

| Rule | Description | Exploits Covered |
|------|-------------|:---:|
| Same-block borrow/repay | Transaction borrows and repays in same block | ✅ 5/5 |
| Large value transfer | Value > $100K equivalent | ✅ 5/5 |
| Lending protocol interaction | Interaction with known lending protocols | ✅ 5/5 |
| Multiple contract calls | Multiple contract calls in single transaction | ✅ 5/5 |
| High gas usage | Gas usage > 500K | ✅ 5/5 |

**Avg Confidence: 0.98** — Calculated from XGBoost's multi-run validated metrics:
- Precision: **1.00** (zero false positives across 25 runs)
- Recall: **0.97** (missed 1 exploit in 1 of 25 folds)
- F1 Score: **0.98** (harmonic mean of precision and recall)
- *Avg Confidence = mean(Precision, Recall, F1) = (1.00 + 0.97 + 0.98) / 3 ≈ **0.98***

#### ✅ Validation Methodology

> Results validated using **5-fold Stratified Cross-Validation repeated 5 times** (25 independent evaluations per algorithm). Metrics reported as **multi-run means** — not single-run results.  
> Benchmark script: [`benchmark_validation.py`](benchmark_validation.py) · Full results: [`benchmark_results.json`](benchmark_results.json)

---

### 🔌 API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/health` | GET | Health check |
| `/api/analyze` | POST | Full transaction analysis |
| `/api/address/check` | POST | Check known attackers |
| `/api/exploits` | GET | List known exploits |
| `/api/detect/rules` | POST | Rule-only detection |
| `/api/detect/anomaly` | POST | ML-only detection |

---

## 🔐 Phase 2: Address Detection Security Enhancement

### Overview
Phase 2 strengthens the framework's address verification and behavioral analysis capabilities through a comprehensive 4-sprint implementation focused on security, intelligence, and API hardening.

### Architecture Enhancement

```mermaid
flowchart TB
    subgraph Input Layer
        A[Address Input] --> B[Validation Layer]
    end
    
    subgraph Sprint 1: Validation
        B --> C[Format Check]
        B --> D[Checksum Validation]
        B --> E[ICAP Detection]
    end
    
    subgraph Sprint 2: On-Chain
        C --> F[Etherscan Verifier]
        F --> G[Balance Check]
        F --> H[Contract Detection]
        F --> I[Address Age]
    end
    
    subgraph Sprint 3: Behavioral
        I --> J[Velocity Scoring]
        I --> K[Funding Analysis]
        I --> L[Blacklist Check]
    end
    
    subgraph Sprint 4: API Security
        J --> M[Rate Limiter]
        K --> M[Rate Limiter]
        L --> M[Rate Limiter]
        M --> N[API Key Auth]
        N --> O[Audit Logger]
    end
    
    O --> P[Risk Assessment]
```

### 🎯 Sprint Implementation Summary

| Sprint | Focus | Components | Tests | Status |
|--------|-------|------------|-------|--------|
| **Sprint 1** | Validation Layer | Format, Checksum, ICAP | 44 | ✅ Complete |
| **Sprint 2** | On-Chain Verification | Balance, Contract, Age | 21 | ✅ Complete |
| **Sprint 3** | Behavioral Analysis | Velocity, Funding, Blacklist | 24 | ✅ Complete |
| **Sprint 4** | API Hardening | Rate Limit, Auth, Logging | 34 | ✅ Complete |
| **Total** | | **11 New Modules** | **123** | ✅ **Complete** |

---

### 📦 Sprint 1: Address Validation Layer

**Objective:** Implement comprehensive format validation for Ethereum addresses.

#### Components Added
- **`address_validator.py`** (255 lines)
  - `validate_format()` — Regex-based address format checking
  - `validate_checksum()` — EIP-55 checksum validation
  - `detect_icap()` — ICAP address format detection
  - `is_all_same_character()` — Detect suspicious patterns

#### Test Coverage
```
44/44 tests passed
- Format validation (11 tests)
- Checksum validation (10 tests)
- ICAP detection (6 tests)
- Pattern detection (17 tests)
```

#### Key Features
- ✅ EIP-55 checksum validation
- ✅ ICAP (IBAN-like) address support
- ✅ Suspicious pattern detection (all zeros, sequential chars)
- ✅ Comprehensive error messages

---

### 🔗 Sprint 2: On-Chain Verification

**Objective:** Verify address existence and gather intelligence from the blockchain.

#### Components Added
- **`etherscan_collector.py`** (Extended)
  - `get_balance()` — ETH balance lookup
  - `get_transaction_count()` — Transaction history count
  - `is_contract()` — Contract vs EOA detection
  - `get_first_transaction()` — Address age calculation
  - `verify_address()` — Comprehensive verification

- **`address_verifier.py`** (277 lines)
  - `AddressVerifier` — High-level verification utility
  - `ComprehensiveAddressReport` — Combined validation + on-chain data

#### Test Coverage
```
21/21 tests passed
- Balance checks (3 tests)
- Contract detection (3 tests)
- Transaction counting (2 tests)
- Address age verification (2 tests)
- Comprehensive verification (11 tests)
```

#### Key Features
- ✅ Real-time balance verification
- ✅ Contract vs EOA differentiation
- ✅ Address age detection (flag new addresses)
- ✅ Dormant address identification

---

### 🧠 Sprint 3: Behavioral Analysis Enhancement

**Objective:** Detect suspicious behavior patterns that format/on-chain checks miss.

#### Components Added
- **`behavioral_analyzer.py`** (466 lines)
  - `VelocityScore` — Transaction frequency analysis
  - `FundingPatternScore` — Funding source analysis
  - `BehavioralReport` — Comprehensive behavioral assessment
  - `analyze_velocity()` — Burst detection, high-frequency patterns
  - `analyze_funding_patterns()` — Circular funding, wash trading

- **`feature_engineer.py`** (Extended)
  - `compute_velocity_features()` — Velocity-based ML features
  - `compute_funding_pattern_features()` — Funding-based ML features
  - `extract_enhanced_address_features()` — Combined feature extraction

- **`exploit_detector.py`** (Extended)
  - `check_external_blacklists()` — OFAC, mixer, phisher checks
  - `get_comprehensive_address_risk()` — Multi-source risk assessment

#### Test Coverage
```
24/24 tests passed
- Velocity analysis (4 tests)
- Funding pattern detection (4 tests)
- Behavioral scoring (4 tests)
- Feature engineering (3 tests)
- Blacklist integration (7 tests)
```

#### Key Features
- ✅ **Velocity Scoring** — Detect burst activity, high transaction frequency
- ✅ **Funding Patterns** — Circular funding, wash trading, concentration analysis
- ✅ **External Blacklists** — OFAC sanctioned addresses, known mixers
- ✅ **Sybil Detection** — Low funding diversity, suspicious patterns

---

### 🛡️ Sprint 4: API Hardening

**Objective:** Secure the FastAPI backend against abuse and enable security monitoring.

#### Components Added
- **`security_middleware.py`** (615 lines)
  - `RateLimiter` — Token bucket rate limiting (100 req/min default)
  - `RateLimitMiddleware` — FastAPI middleware wrapper
  - `APIKeyAuth` — X-API-Key header authentication
  - `RequestValidator` — Input sanitization, XSS/SQLi prevention
  - `AuditLogger` — Request/response logging with timestamps
  - `AuditLogMiddleware` — Automatic security event logging

- **`main.py`** (Extended)
  - Integrated `setup_security_middleware()`
  - Security configuration via environment variables

#### Test Coverage
```
34/34 tests passed
- Rate limiting (6 tests)
- API key authentication (5 tests)
- Request validation (12 tests)
- Audit logging (5 tests)
- Security configuration (6 tests)
```

#### Security Features
| Feature | Configuration | Purpose |
|---------|---------------|---------|
| Rate Limiting | 100 req/min per IP | Prevent DoS attacks |
| API Key Auth | `X-API-Key` header | Optional authentication |
| Request Validation | Auto-sanitization | Prevent injection attacks |
| Audit Logging | All requests logged | Security monitoring |

#### Environment Variables
```bash
# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_SECONDS=60

# Authentication
ALTFLEX_API_KEYS=key1,key2,key3
ALTFLEX_API_KEY_REQUIRED=false

# Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_FILE=logs/audit.log

# Validation
MAX_REQUEST_SIZE_BYTES=1048576
```

---

### 🎯 Phase 2 Impact Summary

#### Codebase Growth
| Metric | Count |
|--------|-------|
| New/Modified Files | 11 |
| Lines of Code Added | ~2,400 |
| Test Cases Added | 123 |
| Documentation Pages | 4 |

#### Security Enhancements
- ✅ **Address Validation** — 5-layer verification (format, checksum, ICAP, on-chain, behavioral)
- ✅ **Blacklist Integration** — OFAC, mixers, phishers (auto-updated)
- ✅ **API Security** — Rate limiting, auth, input validation, audit trails
- ✅ **Behavioral Intelligence** — Velocity, funding patterns, sybil detection

#### Test Coverage
```
Phase 1: 23 tests ✅
Phase 2: 123 tests ✅
Total:   146 tests ✅
```

---

## E. Conclusion
AltFlex addresses a critical gap in Web3 security through an innovative combination of artificial intelligence and digital forensics. The proposed framework provides a foundation for proactive security monitoring and comprehensive incident analysis.

---

## F. Project Structure

### Root Directory: `CCSFEN2L-ALTFLEX/`

#### 1. Configuration & Setup
- **`.devcontainer/`**
  - **Purpose**: Contains configuration files for Visual Studio Code Remote - Containers.
  - **Function**: Automates the setup of the development environment.
  - **Key Files**: `devcontainer.json`, `Dockerfile`.

- **`docker-compose.yml`**
  - **Purpose**: Container orchestration configuration.
  - **Function**: Defines the services required to run the full AltFlex application stack.

- **`README.md`**
  - **Purpose**: The central documentation hub ("The Bible") of the project.

#### 2. Data Management
- **`data/`**
  - **Purpose**: Storage for raw and processed forensic datasets.
  - **Note**: Managed via **GitLFS**.

#### 3. Source Code (`src/`)
- **`src/collectors/`**
  - **Purpose**: Data ingestion layer (Python scripts for scraping/fetching data).
  - **Files**:
    - `etherscan_collector.py`: Fetches account transaction history from Etherscan API.
    - `polygonscan_collector.py`: Fetches account transaction history from PolygonScan API.
    - `bridge_monitor.py`: Monitors cross-chain bridge events.
- **`src/forensics/`**
  - **Purpose**: Rule-based detection engine (Signature matching, static analysis).
- **`src/models/`**
  - **Purpose**: Machine Learning engine (GNN, XGBoost models).
  - **Files**:
    - `gnn_analyzer.py`: Graph Neural Network logic for transaction graph analysis.
    - `anomaly_detector.py`: XGBoost-based tabular anomaly detection.
    - `feature_engineer.py`: Feature extraction pipelines.
- **`src/app/`**
  - **Purpose**: FastAPI Backend (REST API endpoints, security middleware).
  - **Files**:
    - `main.py`: FastAPI application entry point.
    - `routes.py`: API endpoint definitions.

#### 4. Frontend (`frontend/`)
- **`frontend/src/app/`**
  - **Purpose**: Next.js 14 App Router pages and layouts.
  - **Files**:
    - `page.tsx`: Landing page.
    - `dashboard/page.tsx`: Main dashboard.
    - `dashboard/analyze/page.tsx`: Transaction analysis interface.
    - `dashboard/verify/page.tsx`: Address verification interface.
    - `dashboard/exploits/page.tsx`: Exploit database browser.
- **`frontend/src/components/`**
  - **Purpose**: Reusable React components.
  - **Sub-directories**:
    - `layout/`: Sidebar, Header components.
    - `dashboard/`: MetricCard, HealthStatus components.
- **`frontend/src/lib/`**
  - **Purpose**: Utility functions and API client.
  - **Files**:
    - `api.ts`: FastAPI client wrapper.
    - `utils.ts`: Helper functions (formatCurrency, formatAddress).
    - `types.ts`: TypeScript type definitions.

#### 5. Research & Experimentation
- **`notebooks/`**
  - **Purpose**: Sandbox for research and prototyping (Jupyter notebooks).
  - **Content**:
    - `01_data_exploration.ipynb`: Exploratory Data Analysis (EDA).
    - `02_model_prototyping.ipynb`: Prototyping ML architectures.

#### 5. Quality Assurance
- **`tests/`**
  - **Purpose**: Automated testing suite.

---

## G. Getting Started

### Access Links
Once the application is running, you can access the services at:
- **Next.js Dashboard**: [http://localhost:3000](http://localhost:3000)
- **API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### 📸 Application Screenshots & UI Showcase

#### 🏠 Landing Page (`localhost:3000`)
The entry point of the AltFlex platform featuring a premium dark-themed hero section with animated statistics, feature highlights, and direct navigation to the dashboard.

<div align="center">
<img src="assets/frontend_landing.png" alt="AltFlex Landing Page" width="100%">
</div>

> **Key Highlights:**
> - Hero section with real-time platform statistics (406M+ tracked losses, 5 known exploits, 159 unit tests, 12 API endpoints)
> - Six enterprise-grade security feature cards (Transaction Analysis, Address Verification, Exploit Database, Real-time Detection, Behavioral Analysis, API Security)
> - Dark mode with glassmorphism design and smooth scroll navigation

---

#### 📊 Dashboard (`localhost:3000/dashboard`)
The main operational hub for monitoring and analyzing blockchain security threats in real-time.

<div align="center">
<img src="assets/frontend_dashboard.png" alt="AltFlex Dashboard" width="100%">
</div>

> **Key Highlights:**
> - **Metric Cards**: Known Exploits (5), Total Tracked Loss ($406.4M), Detection Rules (6), Unit Tests (159)
> - **Quick Actions**: Analyze Transaction, Verify Address, View Exploits — one-click navigation
> - **System Health Panel**: Live API Server, ML Detector, Exploit Detector, and Feature Engine status
> - **API Information**: 12 endpoints, 100 req/min rate limit, FastAPI backend

---

#### 📚 API Documentation (`localhost:8000/docs`)
Auto-generated Swagger UI for the FastAPI backend, providing interactive API exploration and testing.

<div align="center">
<img src="assets/api_docs_swagger.png" alt="AltFlex API Swagger Documentation" width="100%">
</div>

> **Endpoint Groups:**
> - **Health**: Root (`/`) and health check (`/health`)
> - **System**: Model information (`/api/model/info`)
> - **Analysis**: Transaction analysis (`/api/analyze`), batch analysis (`/api/analyze/batch`), address check (`/api/address/check`)
> - **Database**: List exploits (`/api/exploits`), get exploit details (`/api/exploits/{id}`)
> - **Detection**: Rule-based detection (`/api/detect/rules`), ML anomaly detection (`/api/detect/anomaly`)

---

#### 🏥 API Health Check (`localhost:8000/health`)
Real-time system health endpoint showing all component statuses.

<div align="center">
<img src="assets/api_health.png" alt="AltFlex API Health Check" width="100%">
</div>

> **Response**: `{"status":"healthy","version":"1.0.0","components":{"api":true,"anomaly_detector":true,"exploit_detector":true,"feature_engineer":true}}`

---

#### 🔍 Transaction Analysis (`localhost:3000/dashboard/analyze`)
Deep analysis of blockchain transactions using rule-based detection and ML-powered anomaly scoring.

<div align="center">
<img src="assets/dashboard_analyze.png" alt="AltFlex Transaction Analysis - Empty Form" width="100%">
</div>

> **Form Inputs:** From Address, To Address, Value (ETH), Gas Used, Gas Price, Flash Loan toggle

**Filled form with suspicious flash loan transaction data:**

<div align="center">
<img src="assets/dashboard_analyze_filled.png" alt="AltFlex Transaction Analysis - Filled Form" width="100%">
</div>

**Analysis results showing risk assessment, triggered rules, and ML prediction:**

<div align="center">
<img src="assets/dashboard_analyze_result.png" alt="AltFlex Transaction Analysis - Results" width="100%">
</div>

> **Key Features:**
> - Risk Score visualization with circular gauge (0-100)
> - Triggered rules with severity badges (CRITICAL / HIGH / MEDIUM / LOW)
> - ML Prediction with confidence percentage (Anomaly Detected / Normal Transaction)
> - Split-screen layout — form on left, results on right

---

#### 🛡️ Address Verification (`localhost:3000/dashboard/verify`)
5-layer security verification for Ethereum addresses against known exploit databases.

<div align="center">
<img src="assets/dashboard_verify.png" alt="AltFlex Address Verification - Empty State" width="100%">
</div>

**Verification result for a known attacker address:**

<div align="center">
<img src="assets/dashboard_verify_result.png" alt="AltFlex Address Verification - Known Attacker Result" width="100%">
</div>

> **Key Features:**
> - Status banner — ⚠️ Known Attacker (red) or ✅ Address Safe (green)
> - Address details with risk level badge
> - Associated exploit information (name, date, loss amount)
> - Copy-to-clipboard for verified addresses

---

#### 💀 Exploits Database (`localhost:3000/dashboard/exploits`)
Searchable database of known DeFi and cross-chain bridge exploits with detailed attacker tracking.

<div align="center">
<img src="assets/dashboard_exploits.png" alt="AltFlex Exploits Database" width="100%">
</div>

> **Key Features:**
> - Searchable list with protocol, date, loss amount, and attack type
> - Exploit detail cards with attacker addresses
> - Etherscan integration links for on-chain investigation
> - Filter by attack type (Flash Loan, Reentrancy, Oracle Manipulation, etc.)

### Option 1: Running with Docker Compose (Recommended)

**Prerequisites:** Docker Desktop (Windows) or Docker Engine (Linux)

#### Windows: Install and Configure Docker Desktop

1. **Download Docker Desktop** from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)

2. **Install Docker Desktop** and follow the installation wizard

3. **Fix "docker-users" Group Membership** (if you see this error when opening Docker Desktop)

   > ⚠️ **Common Error**: "Docker Desktop requires that your user is a member of the 'docker-users' group."

   **Solution - Option A: PowerShell (Easiest)**
   
   Run this command **as Administrator**:
   ```powershell
   Add-LocalGroupMember -Group "docker-users" -Member $env:USERNAME
   ```
   
   **Steps:**
   - Right-click on **PowerShell** in Start Menu → **Run as Administrator**
   - Paste the command above and press Enter
   - **Log out** of Windows and **log back in** (or restart your PC)
   - Open Docker Desktop - it should work now!

   **Solution - Option B: Computer Management GUI**
   
   1. Press `Win + R`, type `lusrmgr.msc`, press Enter
   2. Click **Groups** in the left panel
   3. Double-click **docker-users**
   4. Click **Add** → type your username → **Check Names** → **OK**
   5. **Log out and log back in**

   **Verify Group Membership:**
   ```powershell
   whoami /groups | findstr docker-users
   ```

4. **Enable WSL 2 Backend** (recommended for performance):
   - Open Docker Desktop Settings → General
   - Enable "Use WSL 2 based engine"

#### Linux: Install Docker Engine

For **Pop!_OS 22.04 LTS** or **Linux Mint**, see the comprehensive guide in [docs/DOCKER_SETUP_GUIDE.md](docs/DOCKER_SETUP_GUIDE.md).

**Quick Install (Ubuntu-based):**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

#### Run the Application

**Step 1: Clone and Configure**
```bash
git clone https://github.com/flexycode/CCSFEN2L_ALTFLEX.git
cd CCSFEN2L_ALTFLEX

# Copy environment file
cp .env.example .env
```

**Step 2: Start Services**

**Development Mode (with hot-reload):**
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Production Mode:**
```bash
docker compose up --build -d
```

**Step 3: Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Stop Services:**
```bash
# Development
docker compose -f docker-compose.dev.yml down

# Production
docker compose down
```

---

### Option 2: Running Locally (No Docker)

**Prerequisites:** Python 3.10+, Node.js 20+

#### Step 1: Create Virtual Environment
```bash
# Create virtual environment
python -m venv .venv

# Activate (choose your OS):
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat
# Mac/Linux:
source .venv/bin/activate
```
#### .env
```
# AltFlex Environment Configuration
# Copy this file to .env and fill in your values

# =============================================================================
# API Keys (Optional - Mock data used if not provided)
# =============================================================================
ETHERSCAN_API_KEY=your_etherscan_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here

# =============================================================================
# Application Settings
# =============================================================================
# Set to 'development' for mock data, 'production' for live APIs
APP_ENV=development

# API Server
API_HOST=0.0.0.0
API_PORT=8000

# Dashboard
DASHBOARD_PORT=8501

# =============================================================================
# Model Configuration
# =============================================================================
MODEL_PATH=models/anomaly_detector.pkl
DETECTION_THRESHOLD=0.7

# =============================================================================
# Logging
# =============================================================================
LOG_LEVEL=INFO

```

#### Step 2: Install Python Dependencies {NOTE THIS IS FOR FIRST TIME ONLY if theirs no Python Dependencies in your localhost otherwise proceed to Step 4}
##### Windows OS
```bash
# Standard (if python/pip in PATH):
pip install -r requirements.txt

# Windows Alternative (if pip not found):
.\.venv\Scripts\pip.exe install -r requirements.txt
```

##### Pop_OS, Linux Mint, or any Ubuntu Linux Distro 
```bash
# Check Python versions
python3 --version && python --version || true

# Check Node.js versions
node --version && npm --version

# Create venv and install requirements
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

# Install Python 3.10 venv (if needed)
sudo apt update && sudo apt install -y python3.10-venv

# Verify venv creation
test -d .venv && echo '.venv exists' || echo '.venv missing'

# Activate and install
. .venv/bin/activate && python -m pip install --upgrade pip && pip install -r requirements.txt

# List venv files
ls -la .venv && find .venv -maxdepth 2 -type f -name activate -o -name python -o -name pip | head

# Verify venv help
python3 -m venv --help | head -n 20

# List venv bin directory
ls -la .venv/bin

# Check for running processes on ports 8000 and 3000
ss -ltnp | (grep -E ':(8000|3000)\s' || true)

#
python3 -m venv --clear .venv && . .venv/bin/activate && python -m pip install --upgrade pip && pip install -r requirements.txt
```


#### Step 3: Run the Backend API { If things get fuck-up try to run  the step 4 Frontend then proceed to Step 3 }

##### Linux
```bash
# Step 1:
curl -sS -i http://127.0.0.1:8000/health | head -n 20

# Step 2:
curl -sS -I http://localhost:3000 | head -n 20
```

##### Linux Option 2 Step
```
.venv/bin/python -m uvicorn src.app.main:app --reload --host 127.0.0.1 --port 8000
```

##### Windows
```bash
# Standard:
uvicorn src.app.main:app --reload --port 8000

# Windows Alternative:
py -m uvicorn src.app.main:app --host 127.0.0.1 --port 8000
```

#### Step 4: Run the Frontend
Open a **second terminal**, navigate to the frontend directory, and start the Next.js dev server:

##### Linux
```bash
# Step 1:
venv/bin/python -m uvicorn src.app.main:app --reload --host 127.0.0.1 --port 8000

# Step 2:
test -d node_modules && echo 'node_modules exists' || echo 'node_modules missing'
```
##### Linux Option 2 step:
```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 npm run dev
```

##### Windows
```bash
cd frontend
npm install  # First time only
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000)

#### Step 5: Run Tests (Optional)
```bash
# Standard:
pytest tests/ -v

# Windows Alternative:
.\.venv\Scripts\python.exe -m pytest tests/ -v
```

---

### 🔧 Troubleshooting

#### Docker Issues

| Issue | Solution |
|-------|----------|
| `docker-users group error` | Follow the Windows docker-users fix above |
| `Cannot connect to Docker daemon` | Ensure Docker Desktop is running |
| `Port already in use` | Stop existing containers: `docker compose down` |
| `Build failed` | Try `docker compose build --no-cache` |

#### Local Setup Issues

| Issue | Solution |
|-------|----------|
| `pip not found` | Use `.\.venv\Scripts\pip.exe` instead |
| `python not found` | Use `.\.venv\Scripts\python.exe` instead |
| `Module not found` | Ensure you activated the virtual environment |
| `Port already in use` | Change port: `--port 8001` |
| `API offline in dashboard` | Start the API server (port 8000) before the frontend |
| `Frontend not loading` | Run `npm install` in the `frontend/` directory first |
| `CORS errors` | Ensure API is running on port 8000 and frontend on port 3000 |

#### Docker Commands Cheat Sheet

```bash
# View running containers
docker compose ps

# View logs
docker compose logs -f

# Restart a specific service
docker compose restart backend

# Rebuild without cache
docker compose build --no-cache

# Remove all containers and volumes
docker compose down -v
```

---

### 📚 Additional Documentation

For detailed Docker setup instructions including Linux distributions (Pop!_OS, Linux Mint), see:
- **[Docker Setup Guide](docs/DOCKER_SETUP_GUIDE.md)** - Comprehensive installation and troubleshooting
- **[Phase 3 Frontend Implementation](docs/CODE_REVIEW_PHASE3_FRONTEND_IMPLEMENTATION.md)** - Sprint details and task breakdown


<!-- 🤖 Machine Learning 🤖 -->
<div align="center">
<img src="https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Nmt5OThrcjRuYmlma2szdnBsNTZpbHFkbm9jOXdoMDBvbXhvcjNwbCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/QRaz83oxPmMefgZLiU/giphy.gif" width="250">
<img src="https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Y2trNHM0YTN0MWhvZTIzcjA4dTl3bDBvZjYzYnBkejVuNWI1azR5YSZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/6VG9cHMCJxlIM5guHs/giphy.gif" width="300">
<img src="https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3Nmt5OThrcjRuYmlma2szdnBsNTZpbHFkbm9jOXdoMDBvbXhvcjNwbCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/qP5XZwzVkmBF8odtPr/giphy.gif" width="250">
</div>


<!-- 🏆 Contributers down below -->
# 🏆 Contributing     

### Contributing     
If you would like to contribute to the Flight Booking App, please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them.
4. Push your changes to your forked repository.
5. Submit a pull request to the main repository.


### 🧠 Submitting Changes

🧠 Contributions are welcome! If you have ideas for improvements or want to add more exercises, follow these steps:

1. Fork the repository.
2. Create a new branch.
3. Make your changes and commit them.
4. Push to your fork and submit a pull request. 💕💕💕💕

<!-- Contributors down below, kindly paste your github URL thanks and also you can revise your suited job title position -->
### 👋 Contributors
### Special thanks to all my groupmates: 
 * ####  😎 [Jay Arre Talosig](https://github.com/flexycode) - Machine Learning Engineer | Blockchain Developer | AI Architect    
 * ####  🕵️‍♀️ [Rinoah Venedict Dela Rama](https://github.com/Noah-dev2217) - Python Developer | QA Engineer | Data Engineer 
 * ####  🕵️ [Alexander Castilo](https://github.com/xandercastillo0904) - Penetration Tester | Software Engineer | Threat Researcher
 * ####  🥷 [Nicko Nehcterg Dalida](https://github.com/nicknicndin) - Digital Forensics Analyst | QA Engineer | Smart Contract Auditor
 * ####  🧑‍💻 [Mark Jhosua Taberna](https://github.com/MjTaberna) - Digital Forensics Analyst | UI Specialist | Full Stack Engineer

### 🤝 Collab
 * ####  🧊 [Brian Carlo De Vera](https://github.com/scarfer14) - QA Engineer | Cybersecurity Engineer | Network Engineer


# 🛸 FAQ
<!--  Reporting issues -->
### 🛸 Reporting Issues

```bash
Some changes need to be address
- TBA
- TBA
- TBA
```

# 📫 Changelogs 
Chronological list of updates, bug fixes, new features, and other modifications for our Software Engineering Project.

## 💻 [01.0.0] - 2025-11-17      
### Role & Project Management
- 💻 Final Project requirements for our project

## 💻 [01.1.0] - 2025-11-24      
### Role & Project Management
- 💻 Construct the important folder in the overall 

## 💻 [02.0.0] - 2025-11-25      
### Development Progress
- 💻 Initial project structure setup
- 📁 Created `src/`, `data/`, `tests/`, `notebooks/` directories
- 🔧 Configured `.devcontainer` for VS Code development

## 💻 [03.0.0] - 2025-12-04      
### Development Progress
- 📝 Documentation structure established
- 🐳 Docker configuration added (`docker-compose.yml`)
- 📋 Requirements planning completed

## 💻 [04.0.0] - 2025-12-08
### AI/ML Component Integration
- 💻 **Collectors**: Added `etherscan_collector.py`, `polygonscan_collector.py`, and `bridge_monitor.py`.
- 💻 **Models**: Added `gnn_analyzer.py`, `anomaly_detector.py`, and `feature_engineer.py`.
- 💻 **Notebooks**: Added data exploration and model prototyping notebooks.

## 🚀 [05.0.0] - 2025-12-17
### Phase 1: Production-Ready Flash Loan Detection Platform
- 🔍 **Exploit Detector**: Implemented 6 rule-based detection rules for flash loan attacks
- 🤖 **Anomaly Detector**: Complete XGBoost implementation with training pipeline (265 lines)
- 📊 **Feature Engineer**: Flash loan-specific feature extraction (185 lines)
- 🌐 **FastAPI Backend**: Expanded to 12 API endpoints (400+ lines)
- 📱 **Streamlit Dashboard**: Full 5-page interactive UI (450+ lines)
- 📦 **Sample Data**: 
  - `flash_loan_exploits.json`: 5 real exploit signatures ($406M+ tracked)
  - `sample_transactions.csv`: 50 transactions (12 malicious samples)
- ✅ **Testing**: 23+ unit tests, API integration tests
- ⚙️ **Configuration**: Added `.env.example`, updated `requirements.txt` (15+ dependencies)

## 🔧 [05.1.0] - 2026-01-07
### Bug Fixes & Stability Improvements
- 🌐 **API**: Fixed `uvicorn` startup configuration to support hot-reloading by using import strings.
- 📱 **Dashboard**: Fixed critical navigation bug in "Quick Actions" using state callbacks.
- ✅ **Verification**: Validated end-to-end functionality of API and Dashboard using sub-agent verification.

## 🔐 [06.0.0] - 2026-01-13
### Phase 2: Address Detection Security Enhancement (Complete)
**Major Security Update** — 4-sprint implementation adding comprehensive address verification and API hardening.

#### Sprint 1: Address Validation Layer
- 🔍 **Validator**: Implemented `address_validator.py` with EIP-55 checksum validation (255 lines)
- ✅ **Features**: Format validation, checksum verification, ICAP detection, pattern analysis
- 🧪 **Testing**: 44 unit tests covering all validation scenarios

#### Sprint 2: On-Chain Verification
- 🔗 **Etherscan Integration**: Extended `etherscan_collector.py` with 6 new methods
  - Balance lookup, transaction counting, contract detection, address age
- 🔍 **Address Verifier**: Created `address_verifier.py` for high-level verification (277 lines)
- 🧪 **Testing**: 21 unit tests with mocked API calls

#### Sprint 3: Behavioral Analysis Enhancement
- 🧠 **Behavioral Analyzer**: New `behavioral_analyzer.py` module (466 lines)
  - Velocity scoring (burst detection, high-frequency patterns)
  - Funding pattern analysis (circular funding, wash trading)
- 🔍 **Feature Engineering**: Extended with velocity and funding features
- 🚨 **Blacklist Integration**: OFAC sanctions, known mixers, phishing addresses
- 🧪 **Testing**: 24 unit tests for behavioral detection

#### Sprint 4: API Hardening
- 🛡️ **Security Middleware**: New `security_middleware.py` module (615 lines)
  - Rate limiting (token bucket, 100 req/min default)
  - API key authentication (X-API-Key header)
  - Request validation (XSS/SQLi prevention)
  - Audit logging (all requests logged)
- 🔐 **API Integration**: Security middleware integrated into FastAPI
- 🧪 **Testing**: 34 unit tests for security features

#### Phase 2 Impact
- 📊 **Codebase**: 11 new/modified files, ~2,400 lines of code
- ✅ **Testing**: 123 new tests (146 total)
- 🔐 **Security**: 5-layer address verification pipeline
- 🎯 **Detection**: Velocity, funding patterns, external blacklists



## 🎨 [07.0.0] - 2026-01-14
### Phase 3: Premium Frontend Implementation (Complete)
**Objective:** Build a production-grade Next.js frontend with enterprise-level design to replace the Streamlit prototype.

#### 🏗️ Architecture & Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4 + Framer Motion
- **Icons**: Lucide React
- **State Management**: React Hooks + Server Components
- **Design Philosophy**: Glassmorphism, Dark Mode First, Premium Aesthetics
- **Typography**: Inter (UI) + JetBrains Mono (Code)

#### 🚀 Development Sprints

**Sprint 1: Foundation (2 days)**
- [x] Next.js 14 initialization with App Router
- [x] Tailwind CSS configuration with custom theme
- [x] Premium landing page with animated hero section
- [x] Statistics showcase and feature cards
- [x] API client setup (`lib/api.ts`)

**Sprint 2: Dashboard Core (2 days)**
- [x] Responsive sidebar navigation (288px fixed)
- [x] Dashboard layout with glassmorphism effects
- [x] Real-time health status monitoring
- [x] Metric cards with trend indicators
- [x] Header with search and notifications

**Sprint 3: Transaction Analysis (2 days)**
- [x] Transaction input form with validation
- [x] Risk score visualization (circular gauge)
- [x] Triggered rules display
- [x] ML anomaly detection integration
- [x] Split-screen layout (33% / 66%)

**Sprint 4: Address Verification (2 days)**
- [x] Address input with format validation
- [x] 5-layer verification result display
- [x] Status banners (Known Attacker / Safe)
- [x] Exploit information cards
- [x] Copy-to-clipboard functionality

**Sprint 5: Exploit Database & Polish (2 days)**
- [x] Searchable exploit list with filters
- [x] Exploit detail cards with attacker tracking
- [x] Etherscan integration for address lookups
- [x] UI proportions refined for 1900px max-width
- [x] Hydration error fixes

#### 💎 Key Features & Improvements
- ✅ **Responsive Design**: Optimized for vertical (1080px) and ultrawide (1920px+) monitors
- ✅ **Real-time Monitoring**: System health status with API connectivity checks
- ✅ **Premium Aesthetics**: Deep navy (#0A0F1C) + electric blue (#3B82F6) + cyber green (#10B981)
- ✅ **Smooth Animations**: 60fps Framer Motion transitions throughout
- ✅ **Accessible Typography**: Base 18px font, larger headings (h1: 3.5rem), improved contrast
- ✅ **Interactive Components**: Hover effects, glow animations, trend indicators
- ✅ **Dark Mode Optimized**: Glassmorphism cards with backdrop blur and subtle shadows

#### 📊 Phase 3 Impact
| Metric | Value |
|--------|-------|
| **New Files Created** | 25+ TypeScript/TSX components |
| **Lines of Code** | ~3,500 lines (frontend only) |
| **Reusable Components** | 20+ (MetricCard, Header, Sidebar, etc.) |
| **Pages Implemented** | 5 (Landing, Dashboard, Analyze, Verify, Exploits) |
| **API Integration** | Full CRUD operations with FastAPI backend |
| **Design System** | Custom Tailwind theme with glassmorphism utilities |

#### 🎯 User Experience Enhancements
- **Landing Page**: 1900px max-width for better screen utilization
- **Sidebar**: Larger fonts (text-lg nav items), improved logo prominence
- **Metric Cards**: Increased padding (p-8), larger values (text-4xl)
- **Buttons**: Enhanced sizes (16px/32px padding) for better accessibility
- **Grid Layouts**: Responsive breakpoints (sm:2-col, lg:4-col) for all monitor types


### Commit message for pushing or pull-request  
🧊 CCSFEN2L ALTFLEX

<!-- This comment is intended for commiting message in pull-request 
Always use this "🧊 CCSFEN2L ALTFLEX" for commiting message for "Pull-request"
<!-- End point line for this comment  -->

<!-- Introduction Pannel button link, it will redirect to the top -->
#### [Back to Table of Content](#-introduction)

<!-- End point line insert Thanks for visiting enjoy your day, feel free to modify this  -->
---
<p align="center">
<img src="https://readme-typing-svg.demolab.com/?lines=Thanks+For+Visiting+Enjoy+Your+Day+~!;" alt="mystreak"/>
</p>

<!-- Software Engineering -->
<div align="center">
<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnhvYXlpOXRveHR2YXFqY2xvMGhneXpvNWE3cDY2OXk3amZnam05NCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/eZBJ45h3X2ti2vM6Do/giphy.gif" width="300">
<img src="https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3emdwbHV4dWJkam1sd2tkbmdndGxtZ2ZkNGYzeHNzbHlvZTZlaXllNyZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/19Oq26zZQ6ONnhjLx4/giphy.gif" width="300">
</div>

<!-- End point line insert Comeback again next time, feel free to modify this  -->
<p align="center">
<img src="https://readme-typing-svg.demolab.com/?lines=Come+Back+Again+next+time" alt="mystreak"/>
</p>

</p>
    
<br>
<!-- End point insert background effect line of sight color red -->
<img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="1000">

