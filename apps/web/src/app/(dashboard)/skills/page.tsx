'use client';

import React, { Suspense } from 'react';
import { SkillsGrid } from '../../../components/skills/SkillsGrid';
import { SkillsFilterSidebar } from '../../../components/skills/SkillsFilterSidebar';
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

      <div style={{ display: 'flex', gap: 'var(--space-6)', flexGrow: 1, position: 'relative' }}>
        <aside style={{ width: '300px', flexShrink: 0 }}>
          <Suspense
            fallback={
              <div
                style={{
                  width: 300,
                  height: 500,
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                }}
              />
            }
          >
            <SkillsFilterSidebar />
          </Suspense>
        </aside>

        <section style={{ flexGrow: 1, minWidth: 0 }}>
          <SkillsGrid skills={skills} isLoading={isLoading} />
        </section>
      </div>
    </div>
  );
}
