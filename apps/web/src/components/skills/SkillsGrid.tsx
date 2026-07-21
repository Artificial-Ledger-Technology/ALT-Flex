/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/explicit-function-return-type */
'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SearchX } from 'lucide-react';
import styles from './Skills.module.css';
import { SkillCard } from './SkillCard';
import { SkillCardSkeleton } from './SkillCardSkeleton';
import { SkillDetailModal } from './SkillDetailModal';
import type { AISkillFile } from '@aegis/core';

const MotionDiv = motion.div as any;

interface SkillsGridProps {
  skills: AISkillFile[];
  isLoading: boolean;
}

export function SkillsGrid({ skills, isLoading }: SkillsGridProps): React.ReactElement {
  const [selectedSkill, setSelectedSkill] = useState<AISkillFile | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    show: { opacity: 1, y: 0 },
  };

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
      <MotionDiv className={styles.emptyState} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <SearchX size={48} className={styles.emptyIcon} />
        <h3 className={styles.emptyTitle}>No skills found</h3>
        <p>Try adjusting your filters or search query.</p>
      </MotionDiv>
    );
  }

  return (
    <>
      <MotionDiv
        className={styles.grid}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {skills.map((skill) => (
          <MotionDiv
            key={skill.id}
            variants={itemVariants}
            onClick={() => setSelectedSkill(skill)}
            style={{ cursor: 'pointer' }}
          >
            <SkillCard skill={skill} />
          </MotionDiv>
        ))}
      </MotionDiv>

      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          isOpen={true}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </>
  );
}
