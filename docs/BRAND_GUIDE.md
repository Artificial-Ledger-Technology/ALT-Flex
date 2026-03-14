# AltFlex AEGIS v3.0 — Brand Guide

## Core Identity

- **Project Name**: AltFlex AEGIS v3.0
- **Acronym**: **A**daptive **E**xploit & **G**overnance **I**ntelligence **S**ystem
- **Meaning**: AEGIS (Greek: αἰγίς) — the shield of Zeus. Signifying both protection (exploit detection, safety scanning) and authority (governance over AI skill integrity).
- **Tagline**: *"The Shield for Web3. Fortifying DeFi and Governing AI Audit Intelligence."*

## Color Palette

The AEGIS color palette is designed to evoke trust, security, and cutting-edge technology. It leverages dark modes by default to align with the "hacker/security" aesthetic, while maintaining high contrast for data visualization.

### Primary Colors
- **AEGIS Blue (Primary)**: `#1E3A8A` (Tailwind `blue-900`) — Represents trust, intelligence, and depth.
- **Electric Cyan (Accent 1)**: `#22D3EE` (Tailwind `cyan-400`) — For active elements, highlights, and glowing effects.
- **Neon Purple (Accent 2)**: `#A855F7` (Tailwind `purple-500`) — Represents AI intelligence and the "skills engine" aspect.

### Status Colors
- **Safe (Success)**: `#22C55E` (Tailwind `green-500`) — Scanned skills and safe operations.
- **Warning (Suspicious)**: `#F59E0B` (Tailwind `amber-500`) — Suspicious AI skills or medium-risk anomalies.
- **Critical (Hacked/Malicious)**: `#EF4444` (Tailwind `red-500`) — Exploit vectors, massive TVL losses, malicious patterns.

### Neutral / Surface Colors (Dark Theme)
- **Background**: `#09090B` (Tailwind `zinc-950`)
- **Surface**: `#18181B` (Tailwind `zinc-900`)
- **Border**: `#27272A` (Tailwind `zinc-800`)
- **Text Primary**: `#FAFAFA` (Tailwind `zinc-50`)
- **Text Secondary**: `#A1A1AA` (Tailwind `zinc-400`)

## Typography

- **Headings**: **Inter** (Google Fonts) — Clean, readable, geometric for dense data.
- **Body Text**: **Roboto** (Google Fonts) — Familiar, legible at small sizes for dashboards.
- **Monospace/Code**: **JetBrains Mono** — Essential for AI skill prompts, trace viewers, and code blocks.

## Design Tokens (CSS Variables)

```css
:root {
  /* Brand */
  --color-aegis-blue: #1E3A8A;
  --color-electric-cyan: #22D3EE;
  --color-neon-purple: #A855F7;
  
  /* Status */
  --color-safe: #22C55E;
  --color-warning: #F59E0B;
  --color-critical: #EF4444;

  /* Surfaces (Dark Mode Default) */
  --color-bg-base: #09090B;
  --color-bg-surface: #18181B;
  --color-border: #27272A;
  
  /* Typography */
  --color-text-primary: #FAFAFA;
  --color-text-secondary: #A1A1AA;
  
  --font-sans: 'Inter', sans-serif;
  --font-body: 'Roboto', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

## Logo Usage
- Primary logo: AEGIS Shield icon with Electric Cyan and Neon Purple gradient, followed by the text "AltFlex AEGIS".
- Only display on dark backgrounds to maintain the glowing aesthetic.
