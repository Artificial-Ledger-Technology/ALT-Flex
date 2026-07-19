'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronDown, 
  Filter, 
  Search
} from 'lucide-react';
import styles from './HacksFilterSidebar.module.css';

import { 
  getAllAttackVectors, 
  getAttackVectorMetadata, 
  getAllChains, 
  getChainMetadata,
  type AttackVector,
  type Chain
} from '@aegis/core';

interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, isOpen, onToggle, children }) => (
  <div className={styles.filterSection}>
    <div className={styles.sectionHeader} onClick={onToggle}>
      <span className={styles.sectionTitle}>{title}</span>
      <ChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
    </div>
    {isOpen && <div className={styles.sectionContent}>{children}</div>}
  </div>
);

export function HacksFilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Internal state for filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedVectors, setSelectedVectors] = useState<AttackVector[]>([]);
  const [selectedChains, setSelectedChains] = useState<Chain[]>([]);
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [minLoss, setMinLoss] = useState(searchParams.get('minLossUsd') || '');
  const [maxLoss, setMaxLoss] = useState(searchParams.get('maxLossUsd') || '');
  const [hasPoc, setHasPoc] = useState<boolean | null>(
    searchParams.has('hasFoundryPoc') ? searchParams.get('hasFoundryPoc') === 'true' : null
  );

  // Section open state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    search: true,
    vectors: true,
    chains: true,
    dates: false,
    losses: false,
    poc: true,
  });

  // Sync state from URL on initial load and param changes
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setDateFrom(searchParams.get('dateFrom') || '');
    setDateTo(searchParams.get('dateTo') || '');
    setMinLoss(searchParams.get('minLossUsd') || '');
    setMaxLoss(searchParams.get('maxLossUsd') || '');
    
    if (searchParams.has('hasFoundryPoc')) {
      setHasPoc(searchParams.get('hasFoundryPoc') === 'true');
    } else {
      setHasPoc(null);
    }

    const vectors = searchParams.getAll('attackVector') as AttackVector[];
    const chains = searchParams.getAll('chain') as Chain[];
    setSelectedVectors(vectors);
    setSelectedChains(chains);
  }, [searchParams]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplyFilters = useCallback((updates: Record<string, string | string[] | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    // Always reset to page 1 on filter change
    newParams.delete('page');

    Object.entries(updates).forEach(([key, value]) => {
      newParams.delete(key);
      if (Array.isArray(value)) {
        value.forEach(v => newParams.append(key, v));
      } else if (value !== null && value !== '') {
        newParams.set(key, value);
      }
    });

    router.push(`?${newParams.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Debounced Search Apply
  useEffect(() => {
    const handler = setTimeout(() => {
      if (search !== (searchParams.get('search') || '')) {
        handleApplyFilters({ search });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [search, searchParams, handleApplyFilters]);

  const toggleVector = (vector: AttackVector) => {
    const next = selectedVectors.includes(vector)
      ? selectedVectors.filter(v => v !== vector)
      : [...selectedVectors, vector];
    handleApplyFilters({ attackVector: next });
  };

  const toggleChain = (chain: Chain) => {
    const next = selectedChains.includes(chain)
      ? selectedChains.filter(c => c !== chain)
      : [...selectedChains, chain];
    handleApplyFilters({ chain: next });
  };

  const clearAllFilters = () => {
    router.push('?', { scroll: false });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (minLoss) count++;
    if (maxLoss) count++;
    if (hasPoc !== null) count++;
    count += selectedVectors.length;
    count += selectedChains.length;
    return count;
  }, [search, dateFrom, dateTo, minLoss, maxLoss, hasPoc, selectedVectors, selectedChains]);

  return (
    <div className={styles.sidebarContainer}>
      <div className={styles.sidebarHeader}>
        <div className={styles.headerTitle}>
          <Filter size={20} />
          Filters
          {activeFilterCount > 0 && (
            <span className={styles.filterBadge}>{activeFilterCount}</span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button className={styles.clearButton} onClick={clearAllFilters} type="button">
            Clear all
          </button>
        )}
      </div>

      <AccordionSection title="Search" isOpen={!!openSections.search} onToggle={() => toggleSection('search')}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            className={styles.searchInput}
            style={{ paddingLeft: '32px' }}
            placeholder="Protocol name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Attack Vectors" isOpen={!!openSections.vectors} onToggle={() => toggleSection('vectors')}>
        {getAllAttackVectors().map(vector => {
          const meta = getAttackVectorMetadata(vector);
          return (
            <label key={vector} className={styles.checkboxRow}>
              <input 
                type="checkbox" 
                className={styles.checkboxInput}
                checked={selectedVectors.includes(vector)}
                onChange={() => toggleVector(vector)}
              />
              <div className={styles.checkboxLabel}>
                <span className={styles.checkboxTitle}>{meta.displayName}</span>
              </div>
            </label>
          );
        })}
      </AccordionSection>

      <AccordionSection title="Chains" isOpen={!!openSections.chains} onToggle={() => toggleSection('chains')}>
        {getAllChains().map(chain => {
          const meta = getChainMetadata(chain);
          return (
            <label key={chain} className={styles.checkboxRow}>
              <input 
                type="checkbox" 
                className={styles.checkboxInput}
                checked={selectedChains.includes(chain)}
                onChange={() => toggleChain(chain)}
              />
              <div className={styles.checkboxLabel}>
                <span className={styles.checkboxTitle}>
                  {meta.displayName}
                </span>
              </div>
            </label>
          );
        })}
      </AccordionSection>

      <AccordionSection title="Date Range" isOpen={!!openSections.dates} onToggle={() => toggleSection('dates')}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>From Date</label>
          <input 
            type="date" 
            className={styles.inputField} 
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              handleApplyFilters({ dateFrom: e.target.value });
            }}
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel}>To Date</label>
          <input 
            type="date" 
            className={styles.inputField}
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              handleApplyFilters({ dateTo: e.target.value });
            }}
          />
        </div>
      </AccordionSection>

      <AccordionSection title="Loss Amount (USD)" isOpen={!!openSections.losses} onToggle={() => toggleSection('losses')}>
        <div className={styles.rangeInputs}>
          <div className={styles.inputGroup} style={{ flex: 1 }}>
            <label className={styles.inputLabel}>Min USD</label>
            <input 
              type="number" 
              className={styles.inputField} 
              placeholder="0"
              value={minLoss}
              onChange={(e) => setMinLoss(e.target.value)}
              onBlur={() => handleApplyFilters({ minLossUsd: minLoss })}
            />
          </div>
          <span className={styles.rangeSeparator}>-</span>
          <div className={styles.inputGroup} style={{ flex: 1 }}>
            <label className={styles.inputLabel}>Max USD</label>
            <input 
              type="number" 
              className={styles.inputField} 
              placeholder="∞"
              value={maxLoss}
              onChange={(e) => setMaxLoss(e.target.value)}
              onBlur={() => handleApplyFilters({ maxLossUsd: maxLoss })}
            />
          </div>
        </div>
      </AccordionSection>

      <AccordionSection title="Foundry POC" isOpen={!!openSections.poc} onToggle={() => toggleSection('poc')}>
        <label className={styles.checkboxRow}>
          <input 
            type="checkbox" 
            className={styles.checkboxInput}
            checked={hasPoc === true}
            onChange={(e) => {
              const val = e.target.checked;
              handleApplyFilters({ hasFoundryPoc: val ? 'true' : null });
            }}
          />
          <div className={styles.checkboxLabel}>
            <span className={styles.checkboxTitle}>Has Foundry POC</span>
            <span className={styles.checkboxDesc}>Incidents with reproducible test cases</span>
          </div>
        </label>
      </AccordionSection>
    </div>
  );
}
