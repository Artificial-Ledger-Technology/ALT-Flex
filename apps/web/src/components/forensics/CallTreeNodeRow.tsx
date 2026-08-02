import React from 'react';
import { CallTreeNode } from '@aegis/forensic-engine';
import { ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import styles from './TraceViewer.module.css';

interface CallTreeNodeRowProps {
  node: CallTreeNode;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onClick: () => void;
  isLastChildList: boolean[]; // Array representing if this node's ancestors (and itself) are the last child in their respective parents
}

export const CallTreeNodeRow: React.FC<CallTreeNodeRowProps> = ({
  node,
  isExpanded,
  isSelected,
  onToggle,
  onClick,
  isLastChildList,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getBadgeClass = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CALL': return styles.call;
      case 'DELEGATECALL': return styles.delegatecall;
      case 'STATICCALL': return styles.staticcall;
      case 'CREATE':
      case 'CREATE2': return styles.create;
      default: return '';
    }
  };

  return (
    <div 
      className={`${styles.nodeRow} ${isSelected ? styles.selected : ''} ${node.error ? styles.error : ''}`}
      onClick={onClick}
    >
      <div className={styles.nodeIndent}>
        {/* Draw tree lines based on depth */}
        {Array.from({ length: node.depth }).map((_, i) => (
          <div 
            key={i} 
            className={`${styles.treeLine} ${isLastChildList[i] ? '' : styles.hasChild} ${i === node.depth - 1 && isLastChildList[i] ? styles.isLastChild : ''}`} 
          />
        ))}
      </div>

      {hasChildren ? (
        <button className={styles.expandBtn} onClick={onToggle}>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : (
        <div style={{ width: 20, height: 20 }} /> /* Spacer for alignment */
      )}

      <div className={styles.nodeContent}>
        <span className={`${styles.badge} ${getBadgeClass(node.type)}`}>
          {node.type}
        </span>
        
        <div className={styles.addresses}>
          <span className={styles.address} title={node.from}>{formatAddress(node.from)}</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.address} title={node.to}>{formatAddress(node.to)}</span>
        </div>

        <div className={styles.signature} title={node.decodedCall?.signature || node.input}>
          {node.decodedCall ? (
            <>
              <strong>{node.decodedCall.name}</strong>(
              {node.decodedCall.args.map((a: { name: string; type: string; value: string }, i: number) => (
                <span key={i} title={a.value}>
                  {a.name || a.type}{i < node.decodedCall!.args.length - 1 ? ', ' : ''}
                </span>
              ))})
            </>
          ) : (
            `${node.input.slice(0, 10)}...`
          )}
        </div>

        {node.error && (
          <div className={styles.errorText} title={node.error}>
            <AlertCircle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {node.error}
          </div>
        )}

        <div className={styles.value} title={`${node.value.toString()} wei`}>
          {node.value > BigInt(0) ? `${(Number(node.value) / 1e18).toFixed(4)} ETH` : ''}
        </div>
        
        <div className={styles.gas} title={`${node.gasUsed.toString()} gas`}>
          {node.gasUsed.toString()} gas
        </div>
      </div>
    </div>
  );
};
