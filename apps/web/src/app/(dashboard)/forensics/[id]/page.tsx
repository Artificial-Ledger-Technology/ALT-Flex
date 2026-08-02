import React from 'react';
import { PatternReport, type ForensicReportPayload } from '@/components/forensics/PatternReport';

// Define the Next.js page props interface
interface PageProps {
  params: {
    id: string;
  };
}

// In a real application, we would fetch the report from the API:
// async function getReport(id: string): Promise<ForensicReportPayload> { ... }

export default async function ForensicsReportPage({ params }: PageProps): Promise<React.ReactElement> {
  // We await params since Next.js 15 requires params to be asynchronous (if applicable, although synchronous destructuring still works in many contexts, we follow best practices)
  // Wait, Next.js 13/14 `params` is a synchronous object but in 15 there is a shift. We'll use synchronous destructuring for now to be safe with React Server Components unless strict dynamic APIs are enforced.
  const id = params.id;

  // Generate a robust mock payload that fully demonstrates the UI capabilities required by P5-EVM-010
  const mockReport: ForensicReportPayload = {
    id: id,
    hackIncidentId: 'EVM-INC-0842',
    analysisMode: 'trace',
    chain: 'ethereum',
    txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
    metadata: {
      analysisDuration: 15420,
      timestamp: new Date('2026-08-01T12:00:00Z'),
      engineVersion: '3.1.0-alpha',
    },
    narrativeSummary: 'The attacker used a flash loan from Aave to borrow 100K USDC, manipulated the oracle price on Uniswap V3, then liquidated positions on the target protocol, netting $2.4M profit.',
    attackStageDiagram: \`
sequenceDiagram
    participant Attacker
    participant Aave
    participant Uniswap
    participant TargetProtocol
    
    Attacker->>Aave: Flash Loan (100K USDC)
    Aave-->>Attacker: Transfer 100K USDC
    Attacker->>Uniswap: Swap USDC for TokenX (Skew Price)
    Attacker->>TargetProtocol: Trigger Liquidation
    TargetProtocol-->>Attacker: Disburse Collateral ($2.4M)
    Attacker->>Uniswap: Swap TokenX back to USDC
    Attacker->>Aave: Repay Loan + Fee
    Note right of Attacker: Profit Retained
    \`,
    patterns: {
      primaryPattern: 'FLASH_LOAN',
      confidence: 0.98,
      detected: [
        {
          patternId: 'FLASH_LOAN',
          patternName: 'Flash Loan Attack',
          confidence: 0.98,
          description: 'Identified a large, uncollateralized loan that was borrowed and repaid within the same transaction.',
          narrative: 'A flash loan of 100,000 USDC was initiated from Aave V3 Pool, providing the attacker with temporary capital to execute market manipulation.',
          evidence: {
            callNodeIds: ['node-4', 'node-42'],
            storageSlots: [],
            eventSignatures: ['FlashLoan(address,address,uint256,uint256,uint256,uint16)'],
          },
        },
        {
          patternId: 'ORACLE_MANIPULATION',
          patternName: 'Oracle Price Manipulation',
          confidence: 0.85,
          description: 'Significant price slippage detected on a decentralized exchange immediately preceding a liquidation call.',
          narrative: 'The attacker skewed the Uniswap V3 USDC/TokenX pool ratio, causing the TWAP oracle to report an artificially low price for TokenX.',
          evidence: {
            callNodeIds: ['node-12', 'node-18'],
            storageSlots: ['0x0000000000000000000000000000000000000000000000000000000000000004'],
            eventSignatures: ['Swap(address,address,int256,int256,uint160,uint128,int24)'],
          },
        },
        {
          patternId: 'REENTRANCY',
          patternName: 'Reentrancy',
          confidence: 0.32,
          description: 'A fallback function was triggered, but no state mutations occurred during the callback.',
          narrative: 'Minor reentrant call detected during ETH transfer, but state locks prevented exploit.',
          evidence: {
            callNodeIds: ['node-25'],
            storageSlots: [],
            eventSignatures: [],
          },
        }
      ]
    }
  };

  return (
    <main className="p-4 md:p-8 min-h-screen bg-slate-50 dark:bg-slate-900 print:bg-white print:p-0">
      <PatternReport report={mockReport} />
    </main>
  );
}
