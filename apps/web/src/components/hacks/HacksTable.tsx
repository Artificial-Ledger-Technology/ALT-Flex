/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
'use client';

import { useState } from 'react';
import { useHacks } from '@/hooks/useHacks';
import { ChainBadge, VectorBadge } from './HackBadges';
import styles from './HacksTable.module.css';

export function HacksTable(): React.ReactNode {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useHacks({ 
    page, 
    pageSize: 20,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  if (error !== null) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error loading hacks: {error.message}</div>
      </div>
    );
  }

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateValue: string | Date): string => {
    return new Date(dateValue).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.scrollContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Protocol</th>
              <th className={styles.th}>Chain</th>
              <th className={styles.th}>Loss (USD)</th>
              <th className={styles.th}>Attack Vector</th>
            </tr>
          </thead>
          <tbody>
            {isLoading === true ? (
              <tr>
                <td colSpan={5} className={styles.loading}>Loading hacks database...</td>
              </tr>
            ) : data === null || data.data.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>No hacks found matching criteria.</td>
              </tr>
            ) : (
              data.data.map((hack) => (
                <tr key={hack.id} className={styles.tr}>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.pageInfo}>
          {data !== null ? `Showing page ${data.page} of ${data.totalPages} (${data.total} total incidents)` : 'Loading...'}
        </div>
        <div className={styles.buttonGroup}>
          <button
            className={styles.button}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </button>
          <button
            className={styles.button}
            onClick={() => setPage(p => p + 1)}
            disabled={data === null || page >= data.totalPages || isLoading === true}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
