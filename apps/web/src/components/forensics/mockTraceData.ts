import { TransactionTraceResult, CallTreeNode, CallType } from '@aegis/forensic-engine';

const createMockNode = (
  id: string,
  depth: number,
  type: CallType,
  from: string,
  to: string,
  value: bigint,
  gasUsed: bigint,
  signature: string,
  selector: string,
  name: string,
  error?: string,
  children: CallTreeNode[] = []
): CallTreeNode => ({
  id,
  depth,
  type,
  from,
  to,
  value,
  gasUsed,
  input: `0x${selector}000000000000000000000000${to.replace('0x', '')}`,
  output: '0x0000000000000000000000000000000000000000000000000000000000000001',
  decodedCall: {
    signature,
    selector,
    name,
    args: [
      { name: 'target', type: 'address', value: to },
      { name: 'amount', type: 'uint256', value: value.toString() },
    ],
  },
  ...(error ? { error } : {}),
  children,
});

export const mockTraceData: TransactionTraceResult = {
  txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  chain: 'ethereum',
  callTree: createMockNode(
    '0-0', 0, 'CALL', '0xUserAddress', '0xRouterContract', BigInt(0), BigInt(150000),
    'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
    '0x38ed1739', 'swapExactTokensForTokens', undefined,
    [
      createMockNode(
        '1-0', 1, 'CALL', '0xRouterContract', '0xTokenA', BigInt(0), BigInt(21000),
        'transferFrom(address,address,uint256)', '0x23b872dd', 'transferFrom'
      ),
      createMockNode(
        '1-1', 1, 'CALL', '0xRouterContract', '0xPairContract', BigInt(0), BigInt(105000),
        'swap(uint256,uint256,address,bytes)', '0x022c0d9f', 'swap', undefined,
        [
          createMockNode(
            '2-0', 2, 'CALL', '0xPairContract', '0xTokenB', BigInt(0), BigInt(35000),
            'transfer(address,uint256)', '0xa9059cbb', 'transfer'
          ),
          createMockNode(
            '2-1', 2, 'CALL', '0xPairContract', '0xOracleContract', BigInt(0), BigInt(25000),
            'updatePrice()', '0x8f283970', 'updatePrice', undefined,
            [
              createMockNode(
                '3-0', 3, 'STATICCALL', '0xOracleContract', '0xTokenB', BigInt(0), BigInt(5000),
                'balanceOf(address)', '0x70a08231', 'balanceOf'
              ),
              createMockNode(
                '3-1', 3, 'DELEGATECALL', '0xOracleContract', '0xMathLib', BigInt(0), BigInt(8000),
                'calculate(uint256)', '0x43a0d085', 'calculate'
              )
            ]
          ),
          createMockNode(
            '2-2', 2, 'CALL', '0xPairContract', '0xCallbackTarget', BigInt(0), BigInt(12000),
            'onSwap(uint256,uint256)', '0x78a50b71', 'onSwap', 'Execution reverted: Insufficient liquidity'
          )
        ]
      )
    ]
  ),
  events: [],
  gasBreakdown: {
    byContract: new Map([
      ['0xRouterContract', BigInt(24000)],
      ['0xTokenA', BigInt(21000)],
      ['0xPairContract', BigInt(33000)],
      ['0xTokenB', BigInt(40000)],
      ['0xOracleContract', BigInt(12000)],
      ['0xMathLib', BigInt(8000)],
      ['0xCallbackTarget', BigInt(12000)],
    ]),
    totalGas: BigInt(150000),
  },
  valueFlow: [
    { from: '0xPairContract', to: '0xTokenB', value: BigInt(0), callType: 'CALL', depth: 2 },
  ],
  summary: {
    totalCalls: 8,
    uniqueContracts: 7,
    maxDepth: 3,
    hasReentrancy: false,
    hasDelegateCalls: true,
    valueTransfers: 0,
    totalValueTransferred: BigInt(0),
    reentrancyMatches: [],
    delegateCallMatches: [
      { proxyAddress: '0xOracleContract', implementationAddress: '0xMathLib', nodeId: '3-1' }
    ],
    categorizedCalls: [
      { nodeId: '1-1', category: 'swap', functionName: 'swap' },
      { nodeId: '1-0', category: 'token_transfer', functionName: 'transferFrom' }
    ],
  },
};
