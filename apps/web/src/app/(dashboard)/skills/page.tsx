'use client';

import React from 'react';
import { SkillsGrid } from '../../../components/skills/SkillsGrid';
import { useSkills } from '../../../hooks/useSkills';
import styles from '../../../components/skills/Skills.module.css';

export default function SkillsExplorerPage(): React.ReactElement {
  const { skills, isLoading, total } = useSkills();

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>AI Skills Explorer</h1>
        <p className={styles.pageSubtitle}>
          Discover and evaluate AI audit skill files, prompts, and configurations for smart contract
          security.
        </p>
        {!isLoading && (
          <div
            style={{
              marginTop: 'var(--space-4)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-muted)',
            }}
          >
            Showing {skills.length} of {total} skills
          </div>
        )}
      </div>

      <div style={{ flexGrow: 1 }}>
        <SkillsGrid skills={skills} isLoading={isLoading} />
      </div>
    </div>
  );
}
