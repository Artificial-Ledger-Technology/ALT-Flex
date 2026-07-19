/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions */
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { HackIncident } from '@aegis/core';
import type { PaginatedResponse } from '@/lib/api-client';
import { ChainBadge, VectorBadge } from './HackBadges';
import styles from './HacksTable.module.css';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowUpDown,
  ShieldAlert,
} from 'lucide-react';

interface HacksTableProps {
  data: PaginatedResponse<HackIncident>;
}

export function HacksTable({ data }: HacksTableProps): React.ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const currentSortBy = searchParams.get('sortBy') || 'date';
  const currentSortOrder = searchParams.get('sortOrder') || 'desc';

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRows(next);
  };

  const handleSort = (column: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentSortBy === column) {
      params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', column);
      params.set('sortOrder', 'desc'); // Default to desc when changing columns
    }
    params.set('page', '1'); // Reset to page 1 on sort
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', e.target.value);
    params.set('page', '1'); // Reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) return 'N/A';
    if (amount === 0) return '$0';
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateValue: string | Date): string => {
    return new Date(dateValue).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderSortIcon = (column: string) => {
    if (currentSortBy !== column)
      return <ArrowUpDown size={14} className={styles.sortIcon} style={{ opacity: 0.3 }} />;
    return currentSortOrder === 'asc' ? (
      <ChevronUp size={14} className={styles.sortIcon} />
    ) : (
      <ChevronDown size={14} className={styles.sortIcon} />
    );
  };

  if (!data || data.data.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <ShieldAlert size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <div>No hacks found matching criteria.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.scrollContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th} style={{ width: '40px' }}></th>
              <th
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleSort('date')}
              >
                Date {renderSortIcon('date')}
              </th>
              <th
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleSort('protocolName')}
              >
                Protocol {renderSortIcon('protocolName')}
              </th>
              <th
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleSort('chain')}
              >
                Chain {renderSortIcon('chain')}
              </th>
              <th
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleSort('lossUsd')}
              >
                Loss (USD) {renderSortIcon('lossUsd')}
              </th>
              <th
                className={`${styles.th} ${styles.thSortable}`}
                onClick={() => handleSort('attackVector')}
              >
                Attack Vector {renderSortIcon('attackVector')}
              </th>
              <th className={styles.th} style={{ textAlign: 'center' }}>
                POC
              </th>
              <th className={styles.th}>Sources</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((hack) => {
              const isExpanded = expandedRows.has(hack.id);
              return (
                <React.Fragment key={hack.id}>
                  <tr
                    className={`${styles.tr} ${isExpanded ? styles.trExpanded : ''}`}
                    onClick={() => toggleRow(hack.id)}
                    style={{ cursor: 'pointer' }}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleRow(hack.id);
                      }
                    }}
                  >
                    <td className={styles.td}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </td>
                    <td className={styles.td}>{formatDate(hack.date)}</td>
                    <td className={styles.td}>
                      <strong>{hack.protocolName}</strong>
                    </td>
                    <td className={styles.td}>
                      <ChainBadge label={hack.chain} />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.amount}>{formatCurrency(hack.lossUsd)}</span>
                    </td>
                    <td className={styles.td}>
                      <VectorBadge label={hack.attackVector} />
                    </td>
                    <td className={styles.td} style={{ textAlign: 'center' }}>
                      {hack.hasFoundryPoc ? (
                        <CheckCircle2
                          size={18}
                          color="var(--accent-emerald, #10b981)"
                          style={{ display: 'inline' }}
                        />
                      ) : (
                        <XCircle size={18} color="#52525b" style={{ display: 'inline' }} />
                      )}
                    </td>
                    <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                      {hack.sources.length > 0 ? (
                        <a
                          href={hack.sources[0]}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.iconButton}
                          title="View Source"
                        >
                          <ExternalLink size={16} />
                        </a>
                      ) : (
                        <span style={{ color: '#52525b' }}>-</span>
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div className={styles.expandedContent}>
                          <div className={styles.expandedGrid}>
                            <div className={styles.expandedSection}>
                              <h4>Description</h4>
                              <p>
                                {hack.description || 'No description available for this incident.'}
                              </p>

                              {hack.foundryTestPath && (
                                <div style={{ marginTop: '1rem' }}>
                                  <h4>Foundry POC</h4>
                                  <code
                                    style={{
                                      backgroundColor: 'rgba(0,0,0,0.3)',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '0.25rem',
                                      fontFamily: 'monospace',
                                      fontSize: '0.8rem',
                                      color: 'var(--accent-cyan, #06b6d4)',
                                    }}
                                  >
                                    {hack.foundryTestPath}
                                  </code>
                                </div>
                              )}
                            </div>

                            <div className={styles.expandedSection}>
                              <h4>Transactions</h4>
                              {hack.txHashes && hack.txHashes.length > 0 ? (
                                <ul className={styles.txList}>
                                  {hack.txHashes.map((tx) => (
                                    <li key={tx}>
                                      <code style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                        {tx.length > 20
                                          ? `${tx.slice(0, 10)}...${tx.slice(-8)}`
                                          : tx}
                                      </code>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p style={{ color: '#52525b' }}>No transaction hashes recorded.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.pageInfo}>
          <span>
            Showing page {data.page} of {data.totalPages} ({data.total} total)
          </span>
          <select
            className={styles.pageSizeSelect}
            value={data.pageSize.toString()}
            onChange={handlePageSizeChange}
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
        </div>
        <div className={styles.buttonGroup}>
          <button
            className={styles.button}
            onClick={() => handlePageChange(Math.max(1, data.page - 1))}
            disabled={data.page === 1}
          >
            Previous
          </button>
          <button
            className={styles.button}
            onClick={() => handlePageChange(data.page + 1)}
            disabled={data.page >= data.totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
