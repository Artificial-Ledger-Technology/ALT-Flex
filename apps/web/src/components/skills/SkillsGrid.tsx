'use client';

import React from 'react';
import { SearchX } from 'lucide-react';
import styles from './Skills.module.css';
import { SkillCard } from './SkillCard';
import { SkillCardSkeleton } from './SkillCardSkeleton';
import type { AISkillFile } from '@aegis/core';

interface SkillsGridProps {
  skills: AISkillFile[];
  isLoading: boolean;
}

export function SkillsGrid({ skills, isLoading }: SkillsGridProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkillCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className={styles.emptyState}>
        <SearchX size={48} className={styles.emptyIcon} />
        <h3 className={styles.emptyTitle}>No skills found</h3>
        <p>Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </div>
  );
}
