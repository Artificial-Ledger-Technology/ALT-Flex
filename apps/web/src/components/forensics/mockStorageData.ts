import { StorageDiff } from '@aegis/forensic-engine';

export const mockStorageDiffs: StorageDiff[] = [
  {
    contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
    contractName: 'VulnerableVault',
    summary: 'Protocol Vault suffered a net loss of tokens',
    changes: [
      {
        slot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        label: 'balanceOf[0xAttacker]',
        valueBefore: '0x0000000000000000000000000000000000000000000000000000000000000000',
        valueAfter: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
        decodedBefore: '0 WETH',
        decodedAfter: '1,000 WETH',
        interpretation: 'Balance increased by 1,000 WETH',
      },
      {
        slot: '0x0000000000000000000000000000000000000000000000000000000000000001',
        label: 'totalDeposits',
        valueBefore: '0x0000000000000000000000000000000000000000000000004563918244f40000',
        valueAfter: '0x0000000000000000000000000000000000000000000000003782dbce9d900000',
        decodedBefore: '5,000 WETH',
        decodedAfter: '4,000 WETH',
        interpretation: 'Decreased by 1,000 WETH',
      },
      {
        slot: '0x0000000000000000000000000000000000000000000000000000000000000002',
        valueBefore: '0x0000000000000000000000000000000000000000000000000000000000000001',
        valueAfter: '0x0000000000000000000000000000000000000000000000000000000000000002',
        interpretation: 'Changed from 1 to 2',
      }
    ],
  },
  {
    contractAddress: '0xAttackerAddress000000000000000000000000',
    contractName: 'AttackerContract',
    summary: 'Attacker contract gained tokens',
    changes: [
      {
        slot: '0x0000000000000000000000000000000000000000000000000000000000000003',
        label: 'owner',
        valueBefore: '0x0000000000000000000000000000000000000000000000000000000000000000',
        valueAfter: '0x0000000000000000000000009999999999999999999999999999999999999999',
        interpretation: 'Ownership transferred to 0x9999...9999',
      }
    ],
  }
];

export interface GlobalDiffSummary {
  attackerGainedUsd: number;
  protocolLostUsd: number;
  tokenSummaries: Array<{ symbol: string; attackerDiff: string; protocolDiff: string }>;
}

export const mockGlobalDiffSummary: GlobalDiffSummary = {
  attackerGainedUsd: 1850000,
  protocolLostUsd: 1850000,
  tokenSummaries: [
    { symbol: 'WETH', attackerDiff: '+1,000', protocolDiff: '-1,000' }
  ]
};
