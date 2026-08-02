import React from 'react';
import { StorageDiff } from '@aegis/forensic-engine';
import { GlobalDiffSummary } from './mockStorageData';
import { StorageDiffSummaryCard } from './StorageDiffSummaryCard';
import { ContractDiffSection } from './ContractDiffSection';
import styles from './StorageDiffInspector.module.css';

interface StorageDiffInspectorProps {
  storageDiffs: StorageDiff[];
  globalSummary: GlobalDiffSummary;
}

export const StorageDiffInspector: React.FC<StorageDiffInspectorProps> = ({ 
  storageDiffs, 
  globalSummary 
}) => {
  return (
    <div className={`${styles.container} animate-fade-in`}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-xl)' }}>
        Storage Diff Inspector
      </h2>
      
      <StorageDiffSummaryCard summary={globalSummary} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        {storageDiffs.map((diff, idx) => (
          <div key={`${diff.contractAddress}-${idx}`} className="animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
            <ContractDiffSection diff={diff} />
          </div>
        ))}
      </div>
    </div>
  );
};
