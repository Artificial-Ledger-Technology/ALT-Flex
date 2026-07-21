/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Star, ShieldAlert, ShieldCheck, Shield, HelpCircle } from 'lucide-react';
import styles from './Skills.module.css';
import { skillsApi } from '../../lib/api-client';
import type { AISkillFile } from '@aegis/core';

// Ensure framer-motion compatibility with React 19
const MotionDiv = motion.div as React.ElementType;

interface SkillCardProps {
  skill: AISkillFile;
}

export function SkillCard({ skill }: SkillCardProps): React.ReactElement {
  const [isCopied, setIsCopied] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(skill.starCount ?? 0);
  const [copyCount, setCopyCount] = useState(skill.copyCount ?? 0);
  const [isActioning, setIsActioning] = useState(false);

  const getSafetyIcon = (): React.ReactElement | null => {
    switch (skill.safetyLabel) {
      case 'safe':
        return <ShieldCheck size={12} className="mr-1" />;
      case 'suspicious':
        return <ShieldAlert size={12} className="mr-1" />;
      case 'malicious':
        return <Shield size={12} className="mr-1" />;
      case 'unanalyzed':
        return <HelpCircle size={12} className="mr-1" />;
      default:
        return null;
    }
  };

  const getSafetyClass = (): string => {
    switch (skill.safetyLabel) {
      case 'safe':
        return styles.badgeSafe ?? '';
      case 'suspicious':
        return styles.badgeSuspicious ?? '';
      case 'malicious':
        return styles.badgeMalicious ?? '';
      case 'unanalyzed':
        return styles.badgeUnanalyzed ?? '';
      default:
        return styles.badgeUnanalyzed ?? '';
    }
  };

  const handleCopy = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    if (isActioning || isCopied) return;

    try {
      setIsActioning(true);
      const res = await skillsApi.getSkillContent(skill.id);
      await navigator.clipboard.writeText(res.content);

      // Optimistic update
      setCopyCount((prev) => prev + 1);
      setIsCopied(true);

      // Sync with server
      await skillsApi.incrementCopyCount(skill.id).catch(() => {
        // Revert on failure
        setCopyCount((prev) => prev - 1);
      });

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy skill content', err);
    } finally {
      setIsActioning(false);
    }
  };

  const handleToggleStar = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    if (isActioning) return;

    const newStarredState = !isStarred;

    // Optimistic update
    setIsStarred(newStarredState);
    setStarCount((prev) => (newStarredState ? prev + 1 : prev - 1));

    try {
      await skillsApi.toggleStar(skill.id);
    } catch (err) {
      // Revert on failure
      setIsStarred(!newStarredState);
      setStarCount((prev) => (newStarredState ? prev - 1 : prev + 1));
      console.error('Failed to toggle star', err);
    }
  };

  return (
    <MotionDiv
      className={styles.card}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>{skill.name}</h3>
          <span className={styles.author}>by {skill.author}</span>
        </div>
      </div>

      <div className={styles.badges}>
        {skill.platform && (
          <span className={`${styles.badge} ${styles.badgePlatform}`}>{skill.platform}</span>
        )}
        {skill.language && (
          <span className={`${styles.badge} ${styles.badgeLanguage}`}>{skill.language}</span>
        )}
        <span
          className={`${styles.badge} ${getSafetyClass()}`}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          aria-label={`Safety: ${skill.safetyLabel}`}
        >
          <span aria-hidden="true" style={{ display: 'flex' }}>
            {getSafetyIcon()}
          </span>
          {skill.safetyLabel}
        </span>
      </div>

      <div className={styles.preview}>{skill.description}</div>

      <div className={styles.cardFooter}>
        <div className={styles.stats}>
          <div className={styles.stat} title="Copies">
            <Copy size={14} />
            <span>{copyCount}</span>
          </div>
          <div className={styles.stat} title="Stars">
            <Star size={14} />
            <span>{starCount}</span>
          </div>
          <div className={styles.stat} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
            {skill.format}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.iconButton} ${isStarred ? styles.starred : ''}`}
            onClick={(e) => {
              void handleToggleStar(e);
            }}
            title={isStarred ? 'Unstar' : 'Star'}
            type="button"
          >
            <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
          </button>
          <button
            className={styles.iconButton}
            onClick={(e) => {
              void handleCopy(e);
            }}
            title="Copy to Clipboard"
            type="button"
          >
            {isCopied ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </MotionDiv>
  );
}
