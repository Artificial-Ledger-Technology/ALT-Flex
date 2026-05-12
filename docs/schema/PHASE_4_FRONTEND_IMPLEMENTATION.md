# 🎨 Phase 4 — Frontend Implementation

> **AltFlex AEGIS v3.0** · Adaptive Exploit & Governance Intelligence System
> Phase Goal: Build a production-grade Next.js 15 frontend with three polished views — Hacks Dashboard, AI Skills Explorer, and Safety Dashboard — featuring dark mode, dynamic filtering, interactive charts, micro-animations, and full mobile responsiveness.

---

## 📋 Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Design System](#design-system)
3. [App Shell & Layout](#app-shell--layout)
4. [Hacks Dashboard — Data Table](#hacks-dashboard--data-table)
5. [Hacks Dashboard — Filter Sidebar](#hacks-dashboard--filter-sidebar)
6. [Hacks Dashboard — Charts & Stats](#hacks-dashboard--charts--stats)
7. [AI Skills Explorer — Card Grid](#ai-skills-explorer--card-grid)
8. [AI Skills Explorer — Detail View](#ai-skills-explorer--detail-view)
9. [Safety Dashboard](#safety-dashboard)
10. [API Client Layer](#api-client-layer)
11. [Responsive Design](#responsive-design)
12. [Animations & Micro-Interactions](#animations--micro-interactions)
13. [Performance Optimization](#performance-optimization)
14. [Validation Checklist](#validation-checklist)

---

## Overview & Goals

The frontend is where data becomes intelligence. Users will spend most of their time interacting with the Hacks Dashboard and AI Skills Explorer — sorting, filtering, copying, and drilling into details. The UI must be:

- **Data-dense but not overwhelming** — Information hierarchy, progressive disclosure
- **Instantly filterable** — URL-synced filters that respond in < 200ms
- **Visually premium** — Dark mode, glassmorphism, smooth animations
- **Academically presentable** — Charts and stats suitable for thesis defense slides

### Architectural Decisions

| Decision               | Choice                      | Rationale                                                     |
| ---------------------- | --------------------------- | ------------------------------------------------------------- |
| Rendering              | RSC + Client Components     | Server Components for data fetching, client for interactivity |
| Styling                | CSS Modules + CSS Variables | Scoped styles, no runtime CSS-in-JS overhead                  |
| Charts                 | Recharts                    | React-native, composable, SSR-compatible                      |
| Animations             | Framer Motion               | Declarative, spring physics, gesture support                  |
| Data Fetching (client) | SWR                         | Lightweight, stale-while-revalidate caching                   |
| Icons                  | Lucide React                | Consistent, tree-shakable icon set                            |
| Syntax Highlighting    | Shiki                       | Code highlighting for skill file detail                       |

---

## Design System

### CSS Custom Properties

```css
/* apps/web/src/styles/tokens.css */
:root {
  /* ── Color System ─────────────────────── */
  /* Background layers (dark mode) */
  --bg-base: hsl(222, 47%, 6%);
  --bg-primary: hsl(222, 47%, 8%);
  --bg-secondary: hsl(222, 40%, 12%);
  --bg-tertiary: hsl(222, 35%, 16%);
  --bg-elevated: hsl(222, 30%, 20%);
  --bg-hover: hsl(222, 25%, 24%);
  /* Accent palette */
  --accent-cyan: hsl(186, 100%, 50%);
  --accent-cyan-10: hsla(186, 100%, 50%, 0.1);
  --accent-cyan-20: hsla(186, 100%, 50%, 0.2);
  --accent-emerald: hsl(160, 84%, 39%);
  --accent-amber: hsl(38, 92%, 50%);
  --accent-red: hsl(0, 84%, 60%);
  --accent-purple: hsl(270, 76%, 60%);
  --accent-blue: hsl(217, 91%, 60%);
  /* Text hierarchy */
  --text-primary: hsl(210, 40%, 96%);
  --text-secondary: hsl(215, 20%, 65%);
  --text-muted: hsl(215, 15%, 45%);
  --text-disabled: hsl(215, 10%, 35%);
  /* Borders & dividers */
  --border-subtle: hsl(222, 20%, 18%);
  --border-default: hsl(222, 20%, 25%);
  --border-strong: hsl(222, 20%, 32%);
  /* Semantic colors */
  --color-safe: var(--accent-emerald);
  --color-suspicious: var(--accent-amber);
  --color-malicious: var(--accent-red);
  --color-unanalyzed: var(--text-muted);
  /* ── Typography ───────────────────────── */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --text-xs: 0.75rem; /* 12px */
  --text-sm: 0.875rem; /* 14px */
  --text-base: 1rem; /* 16px */
  --text-lg: 1.125rem; /* 18px */
  --text-xl: 1.25rem; /* 20px */
  --text-2xl: 1.5rem; /* 24px */
  --text-3xl: 1.875rem; /* 30px */
  --text-4xl: 2.25rem; /* 36px */
  /* ── Spacing ──────────────────────────── */
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  /* ── Radii ────────────────────────────── */
  --radius-sm: 0.375rem; /* 6px */
  --radius-md: 0.5rem; /* 8px */
  --radius-lg: 0.75rem; /* 12px */
  --radius-xl: 1rem; /* 16px */
  --radius-full: 9999px;
  /* ── Shadows ──────────────────────────── */
  --shadow-sm: 0 1px 2px hsla(0, 0%, 0%, 0.3);
  --shadow-md: 0 4px 6px hsla(0, 0%, 0%, 0.3);
  --shadow-lg: 0 10px 15px hsla(0, 0%, 0%, 0.3);
  --shadow-glow-cyan: 0 0 20px hsla(186, 100%, 50%, 0.15);
  /* ── Transitions ──────────────────────── */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
  /* ── Layout ───────────────────────────── */
  --sidebar-width: 260px;
  --sidebar-collapsed: 72px;
  --header-height: 64px;
  --max-content-width: 1400px;
}
/* ── Breakpoints (media queries) ── */
/* sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px */
```

### Component Base Styles

```css
/* apps/web/src/styles/components.css */
/* ── Badge ─────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.badge-safe {
  background: hsla(160, 84%, 39%, 0.15);
  color: var(--color-safe);
}
.badge-suspicious {
  background: hsla(38, 92%, 50%, 0.15);
  color: var(--color-suspicious);
}
.badge-malicious {
  background: hsla(0, 84%, 60%, 0.15);
  color: var(--color-malicious);
}
.badge-unanalyzed {
  background: hsla(215, 15%, 45%, 0.15);
  color: var(--color-unanalyzed);
}
/* ── Card ──────────────────────────────── */
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}
.card:hover {
  border-color: var(--border-default);
  box-shadow: var(--shadow-glow-cyan);
}
/* ── Stat Card ─────────────────────────── */
.stat-card {
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}
.stat-card .stat-value {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
.stat-card .stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
/* ── Table ─────────────────────────────── */
.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}
.data-table th {
  position: sticky;
  top: 0;
  background: var(--bg-tertiary);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-secondary);
  text-align: left;
  border-bottom: 1px solid var(--border-default);
  cursor: pointer;
  user-select: none;
}
.data-table th:hover {
  color: var(--accent-cyan);
}
.data-table td {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
}
.data-table tr:hover td {
  background: var(--bg-hover);
}
/* ── Button ────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-primary {
  background: var(--accent-cyan);
  color: var(--bg-primary);
}
.btn-primary:hover {
  background: hsl(186, 100%, 60%);
  box-shadow: var(--shadow-glow-cyan);
}
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border-default);
}
.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
/* ── Skeleton loading ──────────────────── */
@keyframes shimmer {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-tertiary) 0px,
    var(--bg-elevated) 40px,
    var(--bg-tertiary) 80px
  );
  background-size: 200px 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}
```

---

## App Shell & Layout

### Root Layout

```tsx
// apps/web/src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/tokens.css';
import '@/styles/globals.css';
import '@/styles/components.css';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'AltFlex AEGIS — Web3 Security Intelligence',
  description:
    'Adaptive Exploit & Governance Intelligence System. Browse 1,000+ DeFi hacks, explore AI audit skills, and simulate exploits.',
  keywords: ['DeFi', 'hacks', 'security', 'AI', 'audit', 'Web3', 'blockchain'],
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
```

### Dashboard Layout

```tsx
// apps/web/src/app/dashboard/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import styles from './layout.module.css';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
```

```css
/* apps/web/src/app/dashboard/layout.module.css */
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--bg-base);
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: var(--sidebar-width);
  transition: margin-left var(--transition-normal);
}
.content {
  flex: 1;
  padding: var(--space-6);
  max-width: var(--max-content-width);
  width: 100%;
  margin: 0 auto;
}
@media (max-width: 1024px) {
  .main {
    margin-left: 0;
  }
}
```

### Sidebar Component

```tsx
// apps/web/src/components/layout/Sidebar.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  Sword,
  Brain,
  ScanSearch,
  Microscope,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import styles from './Sidebar.module.css';
const NAV_ITEMS = [
  { href: '/dashboard/hacks', label: 'Hacks Dashboard', icon: Sword },
  { href: '/dashboard/skills', label: 'AI Skills Explorer', icon: Brain },
  { href: '/dashboard/safety', label: 'Safety Scanner', icon: ScanSearch },
  { href: '/dashboard/forensics', label: 'Forensics', icon: Microscope, disabled: true },
];
export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.logo}>
        <Shield className={styles.logoIcon} />
        {!collapsed && <span className={styles.logoText}>AEGIS</span>}
      </div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ href, label, icon: Icon, disabled }) => (
          <Link
            key={href}
            href={disabled ? '#' : href}
            className={`${styles.navItem} ${pathname.startsWith(href) ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
            aria-disabled={disabled}
            aria-current={pathname.startsWith(href) ? 'page' : undefined}
          >
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
            {disabled && !collapsed && <span className={styles.comingSoon}>Soon</span>}
          </Link>
        ))}
      </nav>
      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
```

---

## Hacks Dashboard — Data Table

### Page Component (Server Component)

```tsx
// apps/web/src/app/dashboard/hacks/page.tsx
import { Suspense } from 'react';
import { HacksStatsBar } from '@/components/hacks/HacksStatsBar';
import { HacksCharts } from '@/components/hacks/HacksCharts';
import { HacksTable } from '@/components/hacks/HacksTable';
import { HacksFilterSidebar } from '@/components/hacks/HacksFilterSidebar';
import { StatsBarSkeleton, ChartsSkeleton, TableSkeleton } from '@/components/ui/Skeletons';
import styles from './page.module.css';
interface HacksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
export default async function HacksPage({ searchParams }: HacksPageProps) {
  const params = await searchParams;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Hacks Dashboard</h1>
        <p className={styles.subtitle}>
          Every DeFi hack in history — filterable, searchable, with Foundry POC links
        </p>
      </header>
      <Suspense fallback={<StatsBarSkeleton />}>
        <HacksStatsBar filters={params} />
      </Suspense>
      <Suspense fallback={<ChartsSkeleton />}>
        <HacksCharts filters={params} />
      </Suspense>
      <div className={styles.tableSection}>
        <HacksFilterSidebar />
        <Suspense fallback={<TableSkeleton rows={10} />}>
          <HacksTable filters={params} />
        </Suspense>
      </div>
    </div>
  );
}
```

### Table Component (Client Component)

```tsx
// apps/web/src/components/hacks/HacksTable.tsx
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle } from 'lucide-react';
import { formatUsd, formatDate } from '@/lib/formatters';
import { ChainBadge } from '@/components/ui/ChainBadge';
import { VectorBadge } from '@/components/ui/VectorBadge';
import { Pagination } from '@/components/ui/Pagination';
import styles from './HacksTable.module.css';
export function HacksTable({ initialData }: { initialData: PaginatedHacks }) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const currentSort = params.get('sortBy');
    const currentOrder = params.get('sortOrder') || 'desc';
    if (currentSort === column) {
      params.set('sortOrder', currentOrder === 'desc' ? 'asc' : 'desc');
    } else {
      params.set('sortBy', column);
      params.set('sortOrder', 'desc');
    }
    router.push(`/dashboard/hacks?${params.toString()}`);
  };
  return (
    <div className={styles.tableWrapper}>
      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('protocolName')}>
              Protocol <SortIcon column="protocolName" />
            </th>
            <th onClick={() => handleSort('date')}>
              Date <SortIcon column="date" />
            </th>
            <th>Chain</th>
            <th>Attack Vector</th>
            <th onClick={() => handleSort('lossUsd')}>
              Loss (USD) <SortIcon column="lossUsd" />
            </th>
            <th>POC</th>
            <th>Sources</th>
          </tr>
        </thead>
        <tbody>
          {initialData.data.map((hack) => (
            <>
              <tr
                key={hack.id}
                className={styles.row}
                onClick={() => setExpandedRow(expandedRow === hack.id ? null : hack.id)}
                role="button"
                tabIndex={0}
                aria-expanded={expandedRow === hack.id}
              >
                <td className={styles.protocol}>{hack.protocolName}</td>
                <td className={styles.date}>{formatDate(hack.date)}</td>
                <td>
                  <ChainBadge chain={hack.chain} />
                </td>
                <td>
                  <VectorBadge vector={hack.attackVector} />
                </td>
                <td className={styles.loss}>{formatUsd(hack.lossUsd)}</td>
                <td>
                  {hack.hasFoundryPoc ? (
                    <CheckCircle size={16} className={styles.pocYes} />
                  ) : (
                    <span className={styles.pocNo}>—</span>
                  )}
                </td>
                <td>
                  {hack.sources.length > 0 && (
                    <a
                      href={hack.sources[0]}
                      target="_blank"
                      rel="noopener"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </td>
              </tr>
              {expandedRow === hack.id && (
                <tr key={`${hack.id}-detail`} className={styles.expandedRow}>
                  <td colSpan={7}>
                    <div className={styles.detail}>
                      <p className={styles.description}>
                        {hack.description || 'No description available.'}
                      </p>
                      {hack.fundsReturned > 0 && (
                        <p className={styles.returned}>
                          💰 Funds returned: <strong>{formatUsd(hack.fundsReturned)}</strong>
                        </p>
                      )}
                      {hack.foundryTestPath && (
                        <p className={styles.pocPath}>
                          🔬 Foundry POC: <code>{hack.foundryTestPath}</code>
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
      <Pagination
        page={initialData.page}
        totalPages={initialData.totalPages}
        total={initialData.total}
        pageSize={initialData.pageSize}
      />
    </div>
  );
}
```

---

## AI Skills Explorer — Card Grid

### Skill Card Component

```tsx
// apps/web/src/components/skills/SkillCard.tsx
'use client';
import { useState } from 'react';
import { Copy, Check, Star, ExternalLink } from 'lucide-react';
import { SafetyBadge } from '@/components/ui/SafetyBadge';
import { PlatformBadge } from '@/components/ui/PlatformBadge';
import { LanguageBadge } from '@/components/ui/LanguageBadge';
import { copySkillContent, starSkill } from '@/lib/api/skills';
import styles from './SkillCard.module.css';
interface SkillCardProps {
  skill: SkillListItem;
}
export function SkillCard({ skill }: SkillCardProps) {
  const [copied, setCopied] = useState(false);
  const [starred, setStarred] = useState(false);
  const [copyCount, setCopyCount] = useState(skill.copyCount);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const content = await copySkillContent(skill.id);
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setCopyCount((prev) => prev + 1);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };
  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred(!starred);
    await starSkill(skill.id);
  };
  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.name}>{skill.name}</h3>
        <SafetyBadge label={skill.safetyLabel} />
      </div>
      <p className={styles.author}>by {skill.author}</p>
      <div className={styles.badges}>
        <PlatformBadge platform={skill.platform} />
        <LanguageBadge language={skill.language} />
        <span className={styles.format}>{skill.format.toUpperCase()}</span>
      </div>
      <p className={styles.preview}>{skill.contentPreview}</p>
      <div className={styles.actions}>
        <button
          className={`btn btn-primary ${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          className={`${styles.starBtn} ${starred ? styles.starred : ''}`}
          onClick={handleStar}
          aria-label={starred ? 'Unstar' : 'Star this skill'}
        >
          <Star size={14} fill={starred ? 'var(--accent-amber)' : 'none'} />
          {skill.starCount + (starred ? 1 : 0)}
        </button>
        <span className={styles.copyCount}>
          <Copy size={12} /> {copyCount}
        </span>
      </div>
    </article>
  );
}
```

### Safety Badge Component

```tsx
// apps/web/src/components/ui/SafetyBadge.tsx
import { Shield, AlertTriangle, XOctagon, HelpCircle } from 'lucide-react';
import { SafetyLabel } from '@aegis/core';
const BADGE_CONFIG: Record<SafetyLabel, { icon: typeof Shield; className: string; label: string }> =
  {
    [SafetyLabel.SAFE]: { icon: Shield, className: 'badge-safe', label: 'Safe' },
    [SafetyLabel.SUSPICIOUS]: {
      icon: AlertTriangle,
      className: 'badge-suspicious',
      label: 'Suspicious',
    },
    [SafetyLabel.MALICIOUS]: { icon: XOctagon, className: 'badge-malicious', label: 'Malicious' },
    [SafetyLabel.UNANALYZED]: {
      icon: HelpCircle,
      className: 'badge-unanalyzed',
      label: 'Unanalyzed',
    },
  };
export function SafetyBadge({ label }: { label: SafetyLabel }) {
  const { icon: Icon, className, label: text } = BADGE_CONFIG[label];
  return (
    <span className={`badge ${className}`} role="status" aria-label={`Safety: ${text}`}>
      <Icon size={12} />
      {text}
    </span>
  );
}
```

---

## Hacks Dashboard — Charts & Stats

### Stats Bar (Server Component)

```tsx
// apps/web/src/components/hacks/HacksStatsBar.tsx
import { TrendingDown, Shield, RefreshCw, Users } from 'lucide-react';
import { fetchHackStats } from '@/lib/api/hacks.server';
import { formatUsd, formatNumber } from '@/lib/formatters';
import styles from './HacksStatsBar.module.css';
export async function HacksStatsBar({ filters }: { filters: Record<string, unknown> }) {
  const stats = await fetchHackStats(filters);
  const cards = [
    {
      icon: Shield,
      label: 'Total Incidents',
      value: formatNumber(stats.totalIncidents),
      color: 'var(--accent-cyan)',
    },
    {
      icon: TrendingDown,
      label: 'Total Loss',
      value: formatUsd(stats.totalLossUsd),
      color: 'var(--accent-red)',
    },
    {
      icon: RefreshCw,
      label: 'Funds Returned',
      value: formatUsd(stats.totalFundsReturned),
      color: 'var(--accent-emerald)',
    },
    {
      icon: Users,
      label: 'Protocols Affected',
      value: formatNumber(stats.uniqueProtocols),
      color: 'var(--accent-purple)',
    },
  ];
  return (
    <div className={styles.grid}>
      {cards.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="stat-card">
          <div className={styles.iconWrap} style={{ color }}>
            <Icon size={20} />
          </div>
          <span className="stat-value">{value}</span>
          <span className="stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
```

### Charts (Client Component with Recharts)

```tsx
// apps/web/src/components/hacks/LossTimelineChart.tsx
'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatUsd } from '@/lib/formatters';
import styles from './Charts.module.css';
export function LossTimelineChart({ data }: { data: TimelineDataPoint[] }) {
  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>Loss Timeline</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-red)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent-red)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            stroke="var(--text-muted)"
            fontSize={12}
            tickFormatter={(d) =>
              new Date(d).toLocaleDateString('en', { month: 'short', year: '2-digit' })
            }
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={12}
            tickFormatter={(v) => formatUsd(v, true)}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
            }}
            formatter={(v: number) => [formatUsd(v), 'Loss']}
          />
          <Area
            type="monotone"
            dataKey="totalLossUsd"
            stroke="var(--accent-red)"
            fill="url(#lossGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## API Client Layer

### Server-Side Fetching

```typescript
// apps/web/src/lib/api/hacks.server.ts
const API_BASE = process.env.API_GATEWAY_URL || 'http://localhost:4000';
export async function fetchHacks(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const res = await fetch(`${API_BASE}/api/v1/hacks?${params}`, {
    next: { revalidate: 300 }, // 5-minute ISR cache
  });
  if (!res.ok) throw new Error(`Hacks API error: ${res.status}`);
  return res.json();
}
export async function fetchHackStats(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const res = await fetch(`${API_BASE}/api/v1/hacks/stats?${params}`, {
    next: { revalidate: 600 }, // 10-minute cache
  });
  if (!res.ok) throw new Error(`Stats API error: ${res.status}`);
  return res.json();
}
```

### Client-Side SWR Hooks

```typescript
// apps/web/src/hooks/useHacks.ts
'use client';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
const fetcher = (url: string) => fetch(url).then((r) => r.json());
export function useHacks() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  return useSWR(`/api/proxy/hacks?${queryString}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
}
export function useHackStats() {
  return useSWR('/api/proxy/hacks/stats', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 300_000, // Refresh every 5 min
  });
}
```

---

## Animations & Micro-Interactions

### Card Entrance Animation

```tsx
// apps/web/src/components/ui/AnimatedCard.tsx
'use client';
import { motion } from 'framer-motion';
interface AnimatedCardProps {
  children: React.ReactNode;
  index: number;
}
export function AnimatedCard({ children, index }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}
```

### Copy Button Success Animation

```tsx
// apps/web/src/components/ui/CopyButton.tsx
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
export function CopyButton({ onCopy }: { onCopy: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  const handleClick = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className="btn btn-primary" onClick={handleClick}>
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Check size={14} /> Copied!
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Copy size={14} /> Copy
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
```

---

## Performance Optimization

### Strategy

| Technique                             | Target        | Implementation                               |
| ------------------------------------- | ------------- | -------------------------------------------- |
| React Server Components               | First paint   | Data-heavy pages render on server            |
| ISR (Incremental Static Regeneration) | Repeat visits | `revalidate: 300` for hacks, `600` for stats |
| Dynamic imports                       | Bundle size   | Load Recharts + Framer Motion on demand      |
| Image optimization                    | LCP           | Next.js `<Image>` with chain logos           |
| Font optimization                     | CLS           | `next/font` with `display: swap`             |
| CSS Modules                           | CSS bundle    | Tree-shaken, scoped to components            |
| Pagination                            | DOM size      | Max 100 rows per page                        |
| Debounced search                      | API calls     | 300ms debounce on text input                 |

### Performance Targets

| Metric                   | Target  | Tool            |
| ------------------------ | ------- | --------------- |
| Lighthouse Performance   | ≥ 85    | Chrome DevTools |
| Lighthouse Accessibility | ≥ 90    | Chrome DevTools |
| First Contentful Paint   | < 1.5s  | WebVitals       |
| Largest Contentful Paint | < 2.5s  | WebVitals       |
| Cumulative Layout Shift  | < 0.1   | WebVitals       |
| Total Blocking Time      | < 200ms | WebVitals       |

---

## Validation Checklist

```bash
# 1. Build
pnpm --filter web run build
# ✅ 0 errors, 0 warnings
# 2. Type check
pnpm --filter web run typecheck
# ✅ 0 errors
# 3. Dev server
pnpm --filter web run dev
# ✅ Loads at http://localhost:3000
# 4. Hacks Dashboard
# ✅ Data table loads 100+ rows
# ✅ Sorting works on all columns
# ✅ Pagination works
# ✅ Row expansion shows details
# ✅ Filters update results
# ✅ Charts render with data
# ✅ Stats cards show correct values
# 5. AI Skills Explorer
# ✅ Card grid loads
# ✅ Copy button works (clipboard + count increment)
# ✅ Star button works
# ✅ Safety badges display correctly
# ✅ Platform/language badges render
# ✅ Filters work
# ✅ Detail view shows full content
# 6. Safety Dashboard
# ✅ Label distribution chart renders
# ✅ Rule performance table loads
# ✅ Scan timeline displays
# 7. Responsive
# ✅ 375px (iPhone SE) — no horizontal scroll
# ✅ 768px (iPad) — two-column layout
# ✅ 1280px (Desktop) — full sidebar + content
# ✅ 1920px (Wide) — max-width container
# 8. Lighthouse
npx lighthouse http://localhost:3000/dashboard/hacks --view
# ✅ Performance ≥ 85
# ✅ Accessibility ≥ 90
# 9. Dark mode
# ✅ All pages visually consistent in dark mode
# ✅ No contrast issues
```

---

## What's Next: Phase 5

Once Phase 4 validation is complete, Phase 5 (Deep EVM Integration — **Thesis 2 Focus**) will implement:

- 🔬 **Foundry Integration** — Programmatic `forge test` execution for POC simulation
- 🔬 **Transaction Tracing** — EVM call tree visualization and storage diff analysis
- 🔬 **Forensic Dashboard** — Interactive trace viewer in the frontend
- 🔬 **Multi-Chain RPC** — Alchemy/Infura integration for historical state forking
  > **⚠️ Phase 5 is gated on Phase 4 completion. Forensic features require the frontend visualization layer.**

---

_Document Version: 3.4.0_
_Author: AltFlex AEGIS Engineering_
_Last Updated: March 2026_
