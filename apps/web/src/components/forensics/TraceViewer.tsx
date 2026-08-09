'use client';

import React, { useState } from 'react';
import { TransactionTraceResult, CallTreeNode } from '@aegis/forensic-engine';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';
import { CallTreeList } from './CallTreeList';
import { TraceDetailPanel } from './TraceDetailPanel';
import { GasFlameChart } from './GasFlameChart';
import styles from './TraceViewer.module.css';

interface TraceViewerProps {
  traceResult: TransactionTraceResult;
}

export const TraceViewer: React.FC<TraceViewerProps> = ({ traceResult }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandAll, setExpandAll] = useState(false);
  const [selectedNode, setSelectedNode] = useState<CallTreeNode | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const toggleExpandAll = () => {
    setExpandAll(prev => !prev);
  };

  const handleSelectNode = (node: CallTreeNode) => {
    setSelectedNode(node);
  };

  const handleCloseDetail = () => {
    setSelectedNode(null);
  };

  return (
    <div className={styles.container}>
      {/* Header Controls */}
      <div className={styles.header}>
        <div className={styles.title}>
          Transaction Trace
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginLeft: 12 }}>
            {traceResult.txHash.slice(0, 8)}...{traceResult.txHash.slice(-6)}
          </span>
        </div>
        <div className={styles.actions}>
          <div style={{ position: 'relative' }}>
            <Search 
              size={14} 
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} 
            />
            <input
              type="text"
              placeholder="Search address or function..."
              value={searchQuery}
              onChange={handleSearchChange}
              className={styles.search}
              style={{ paddingLeft: 32 }}
            />
          </div>
          <button className={styles.btn} onClick={toggleExpandAll} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {expandAll ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {expandAll ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Main Panel (Flame Chart + Tree) */}
        <div className={styles.mainPanel}>
          <GasFlameChart rootNode={traceResult.callTree} />
          <CallTreeList 
            rootNode={traceResult.callTree}
            searchQuery={searchQuery}
            expandAll={expandAll}
            onSelectNode={handleSelectNode}
            selectedNodeId={selectedNode?.id || null}
          />
        </div>

        {/* Side Detail Panel */}
        {selectedNode && (
          <TraceDetailPanel 
            node={selectedNode} 
            onClose={handleCloseDetail} 
          />
        )}
      </div>
    </div>
  );
};
