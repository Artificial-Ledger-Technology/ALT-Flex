import React from 'react';
import { CallTreeNode } from '@aegis/forensic-engine';
import { X, Copy, CheckCircle2 } from 'lucide-react';
import styles from './TraceViewer.module.css';

interface TraceDetailPanelProps {
  node: CallTreeNode;
  onClose: () => void;
}

export const TraceDetailPanel: React.FC<TraceDetailPanelProps> = ({ node, onClose }) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div className={styles.detailTitle}>Call Details</div>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className={styles.detailContent}>
        {/* Basic Info */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>Addresses</div>
          <div className={styles.argList}>
            <div className={styles.argItem}>
              <div className={styles.argNameType}>From</div>
              <div className={styles.argValue}>{node.from}</div>
            </div>
            <div className={styles.argItem}>
              <div className={styles.argNameType}>To</div>
              <div className={styles.argValue}>{node.to}</div>
            </div>
          </div>
        </div>

        {/* Error Info */}
        {node.error && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>Revert Reason</div>
            <div className={styles.errorBox}>{node.error}</div>
          </div>
        )}

        {/* Decoded Arguments */}
        {node.decodedCall && (
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>Decoded Arguments</div>
            <div className={styles.argList}>
              {node.decodedCall.args.map((arg: { name: string; type: string; value: string }, idx: number) => (
                <div key={idx} className={styles.argItem}>
                  <div className={styles.argNameType}>
                    <span>{arg.name || `arg${idx}`}</span>
                    <span>{arg.type}</span>
                  </div>
                  <div className={styles.argValue}>{arg.value}</div>
                </div>
              ))}
              {node.decodedCall.args.length === 0 && (
                <div className={styles.argItem}>
                  <div className={styles.argValue} style={{ color: 'var(--text-tertiary)' }}>
                    No arguments
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Raw Input Data */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>Raw Calldata (Input)</div>
          <div className={styles.hexBlock}>
            {node.input}
            <button 
              className={styles.copyBtn} 
              onClick={() => handleCopy(node.input, 'input')}
              title="Copy Calldata"
            >
              {copiedKey === 'input' ? <CheckCircle2 size={14} color="#34d399" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Raw Output Data */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>Return Data (Output)</div>
          <div className={styles.hexBlock}>
            {node.output || '0x'}
            <button 
              className={styles.copyBtn} 
              onClick={() => handleCopy(node.output || '0x', 'output')}
              title="Copy Output"
            >
              {copiedKey === 'output' ? <CheckCircle2 size={14} color="#34d399" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Value & Gas */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>Execution Metrics</div>
          <div className={styles.argList}>
            <div className={styles.argItem}>
              <div className={styles.argNameType}>Gas Used</div>
              <div className={styles.argValue}>{node.gasUsed.toString()}</div>
            </div>
            <div className={styles.argItem}>
              <div className={styles.argNameType}>Value (Wei)</div>
              <div className={styles.argValue}>{node.value.toString()}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
