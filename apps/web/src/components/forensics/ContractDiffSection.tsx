'use client';

import React, { useState } from 'react';
import { StorageDiff } from '@aegis/forensic-engine';
import { ChevronDown, ChevronRight, Database } from 'lucide-react';
import { StorageChangeTable } from './StorageChangeTable';
import styles from './StorageDiffInspector.module.css';

interface ContractDiffSectionProps {
  diff: StorageDiff;
}

export const ContractDiffSection: React.FC<ContractDiffSectionProps> = ({ diff }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={styles.contractSection}>
      <div 
        className={styles.contractHeader} 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.contractInfo}>
          <Database size={16} color="var(--color-primary)" />
          {diff.contractName && (
            <span className={styles.contractName}>{diff.contractName}</span>
          )}
          <span className={styles.contractAddress}>{diff.contractAddress}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
            {diff.changes.length} changes
          </span>
          <div className={styles.expandIcon}>
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <StorageChangeTable changes={diff.changes} />
      )}
    </div>
  );
};
