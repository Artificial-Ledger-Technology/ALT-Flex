'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Filter, Search, X } from 'lucide-react';
import styles from './Skills.module.css';

const PLATFORMS = ['claude', 'cursor', 'mcp', 'copilot', 'gemini', 'generic'];
const LANGUAGES = ['solidity', 'vyper', 'rust', 'move', 'cairo', 'multi'];
const SAFETY_LABELS = ['safe', 'suspicious', 'malicious', 'unanalyzed'];
const SORTS = [
  { value: 'createdAt', label: 'Newest' },
  { value: 'copyCount', label: 'Most Copied' },
  { value: 'starCount', label: 'Most Starred' },
  { value: 'name', label: 'Name (A-Z)' },
];

export function SkillsFilterSidebar(): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper to get active filters
  const getFilterValues = useCallback(
    (key: string): string[] => {
      return searchParams.getAll(key);
    },
    [searchParams],
  );

  // Helper to toggle a filter value
  const toggleFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.getAll(key);

      params.delete(key);
      if (current.includes(value)) {
        current.filter((v) => v !== value).forEach((v) => params.append(key, v));
      } else {
        current.forEach((v) => params.append(key, v));
        params.append(key, value);
      }

      // Reset page to 1 when filters change
      params.set('page', '1');

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (e.target.value) {
        params.set('search', e.target.value);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sortBy', e.target.value);
      if (e.target.value === 'name') {
        params.set('sortOrder', 'asc');
      } else {
        params.set('sortOrder', 'desc');
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  const clearFilters = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    router.push(pathname);
  }, [pathname, router]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    const keys = Array.from(searchParams.keys());
    keys.forEach((k) => {
      if (['platform', 'language', 'safetyLabel', 'search', 'author'].includes(k)) {
        count += searchParams.getAll(k).length;
      }
    });
    return count;
  }, [searchParams]);

  const currentSort = searchParams.get('sortBy') ?? 'createdAt';
  const currentSearch = searchParams.get('search') ?? '';

  return (
    <div className={styles.sidebarContainer}>
      <div className={styles.sidebarHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: 'var(--font-size-md)', margin: 0 }}>Filters</h2>
          {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={clearFilters}
            title="Clear all filters"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className={styles.sidebarSection}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search skills..."
            value={currentSearch}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Sort By</h3>
        <select className={styles.selectInput} value={currentSort} onChange={handleSortChange}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Safety Label</h3>
        <div className={styles.checkboxGroup}>
          {SAFETY_LABELS.map((label) => (
            <label key={label} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={getFilterValues('safetyLabel').includes(label)}
                onChange={() => toggleFilter('safetyLabel', label)}
                className={styles.checkboxInput}
              />
              <span style={{ textTransform: 'capitalize' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Platform</h3>
        <div className={styles.checkboxGroup}>
          {PLATFORMS.map((platform) => (
            <label key={platform} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={getFilterValues('platform').includes(platform)}
                onChange={() => toggleFilter('platform', platform)}
                className={styles.checkboxInput}
              />
              <span style={{ textTransform: 'capitalize' }}>{platform}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.sidebarSection}>
        <h3 className={styles.sectionTitle}>Language</h3>
        <div className={styles.checkboxGroup}>
          {LANGUAGES.map((lang) => (
            <label key={lang} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={getFilterValues('language').includes(lang)}
                onChange={() => toggleFilter('language', lang)}
                className={styles.checkboxInput}
              />
              <span style={{ textTransform: 'capitalize' }}>{lang}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
