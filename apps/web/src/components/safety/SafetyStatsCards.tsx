/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/explicit-function-return-type */
'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './Safety.module.css';
import type { SafetyStatsResponse } from '@aegis/core';

const MotionDiv = motion.div as any;

interface SafetyStatsCardsProps {
  stats: SafetyStatsResponse | null;
}

export function SafetyStatsCards({ stats }: SafetyStatsCardsProps): React.ReactElement {
  const shouldReduceMotion = useReducedMotion();

  if (!stats) return <></>;

  const { totalScans, averageScore, labelDistribution } = stats;

  const totalAnalyzed =
    labelDistribution.safe + labelDistribution.suspicious + labelDistribution.malicious;
  const percentSafe =
    totalAnalyzed > 0 ? ((labelDistribution.safe / totalAnalyzed) * 100).toFixed(1) : '0.0';
  const percentMalicious =
    totalAnalyzed > 0 ? ((labelDistribution.malicious / totalAnalyzed) * 100).toFixed(1) : '0.0';

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <MotionDiv
      className={styles.statsGrid}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <MotionDiv className={styles.statCard} variants={itemVariants}>
        <div className={styles.statLabel}>Total Scanned</div>
        <div className={styles.statValue}>{totalScans.toLocaleString()}</div>
      </MotionDiv>
      <MotionDiv className={styles.statCard} variants={itemVariants}>
        <div className={styles.statLabel}>% Safe</div>
        <div className={styles.statValue} style={{ color: 'var(--accent-emerald)' }}>
          {percentSafe}%
        </div>
      </MotionDiv>
      <MotionDiv className={styles.statCard} variants={itemVariants}>
        <div className={styles.statLabel}>% Malicious</div>
        <div className={styles.statValue} style={{ color: 'var(--accent-red)' }}>
          {percentMalicious}%
        </div>
      </MotionDiv>
      <MotionDiv className={styles.statCard} variants={itemVariants}>
        <div className={styles.statLabel}>Avg Score</div>
        <div className={styles.statValue}>{averageScore.toFixed(1)} / 100</div>
      </MotionDiv>
    </MotionDiv>
  );
}
