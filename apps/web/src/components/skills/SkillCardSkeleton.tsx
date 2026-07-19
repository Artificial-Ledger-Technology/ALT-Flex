'use client';

import React from 'react';
import styles from './Skills.module.css';

export function SkillCardSkeleton(): React.ReactElement {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} style={{ width: '100%' }}>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonSubtitle}></div>
        </div>
      </div>

      <div className={styles.badges}>
        <div
          className={styles.badge}
          style={{ width: '60px', height: '18px', backgroundColor: 'var(--bg-tertiary)' }}
        ></div>
        <div
          className={styles.badge}
          style={{ width: '70px', height: '18px', backgroundColor: 'var(--bg-tertiary)' }}
        ></div>
      </div>

      <div className={styles.skeletonPreview}></div>

      <div className={styles.cardFooter}>
        <div className={styles.stats}>
          <div
            className={styles.stat}
            style={{ width: '40px', height: '16px', backgroundColor: 'var(--bg-tertiary)' }}
          ></div>
          <div
            className={styles.stat}
            style={{ width: '40px', height: '16px', backgroundColor: 'var(--bg-tertiary)' }}
          ></div>
        </div>
        <div className={styles.actions}>
          <div
            className={styles.iconButton}
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '4px',
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
