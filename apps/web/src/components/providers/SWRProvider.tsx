'use client';

import React from 'react';
import { SWRConfig } from 'swr';
import { swrFetcher } from '../../lib/api-client';

/**
 * Global SWR configuration provider.
 *
 * Sets the default fetcher, retry strategy (3 retries with exponential backoff),
 * request deduplication interval, and revalidation behavior.
 */
export function SWRProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        dedupingInterval: 2000,
        revalidateOnFocus: true,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        onErrorRetry: (error, _key, _config, revalidate, { retryCount }): void => {
          // Don't retry on 4xx errors (except 429)
          if (error instanceof Error && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500 && status !== 429) return;
          }

          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          setTimeout((): void => {
            void revalidate({ retryCount });
          }, delay);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
