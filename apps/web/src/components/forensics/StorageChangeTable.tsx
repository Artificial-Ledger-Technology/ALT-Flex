import React from 'react';
import { StorageChange } from '@aegis/forensic-engine';
import { Copy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import styles from './StorageDiffInspector.module.css';

interface StorageChangeTableProps {
  changes: readonly StorageChange[];
}

export const StorageChangeTable: React.FC<StorageChangeTableProps> = ({ changes }) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getInterpretationColor = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('increase') || lower.includes('gain')) return styles.colorIncrease;
    if (lower.includes('decrease') || lower.includes('loss')) return styles.colorDecrease;
    return styles.colorChange;
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} style={{ width: '25%' }}>Slot / Label</th>
            <th className={styles.th} style={{ width: '25%' }}>Before</th>
            <th className={styles.th} style={{ width: '25%' }}>After</th>
            <th className={styles.th} style={{ width: '25%' }}>Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change, idx) => (
            <tr key={`${change.slot}-${idx}`} className={styles.tr}>
              {/* Slot & Label */}
              <td className={styles.td}>
                <div className={styles.slotCell}>
                  {change.label ? (
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{change.label}</span>
                  ) : (
                    <span className={styles.unknownWarning} title="Unknown layout">
                      <AlertTriangle size={14} /> Unknown Slot
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div className={styles.hexValue} title={change.slot}>
                    {change.slot.slice(0, 10)}...{change.slot.slice(-8)}
                  </div>
                  <button 
                    className={styles.copyBtn} 
                    onClick={() => handleCopy(change.slot, `slot-${idx}`)}
                  >
                    {copiedKey === `slot-${idx}` ? <CheckCircle2 size={12} color="#34d399" /> : <Copy size={12} />}
                  </button>
                </div>
              </td>

              {/* Before */}
              <td className={styles.td}>
                {change.decodedBefore && (
                  <div className={styles.decodedValue}>{change.decodedBefore}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div className={styles.hexValue} title={change.valueBefore}>
                    {change.valueBefore.slice(0, 10)}...{change.valueBefore.slice(-8)}
                  </div>
                  <button 
                    className={styles.copyBtn} 
                    onClick={() => handleCopy(change.valueBefore, `before-${idx}`)}
                  >
                    {copiedKey === `before-${idx}` ? <CheckCircle2 size={12} color="#34d399" /> : <Copy size={12} />}
                  </button>
                </div>
              </td>

              {/* After */}
              <td className={styles.td}>
                {change.decodedAfter && (
                  <div className={styles.decodedValue}>{change.decodedAfter}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div className={styles.hexValue} title={change.valueAfter}>
                    {change.valueAfter.slice(0, 10)}...{change.valueAfter.slice(-8)}
                  </div>
                  <button 
                    className={styles.copyBtn} 
                    onClick={() => handleCopy(change.valueAfter, `after-${idx}`)}
                  >
                    {copiedKey === `after-${idx}` ? <CheckCircle2 size={12} color="#34d399" /> : <Copy size={12} />}
                  </button>
                </div>
              </td>

              {/* Interpretation */}
              <td className={styles.td}>
                <span className={getInterpretationColor(change.interpretation)}>
                  {change.interpretation}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
