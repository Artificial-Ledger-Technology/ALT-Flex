/**
 * @module logger-port
 * @description Hexagonal port interface for structured logging.
 *
 * Domain and use-case layers depend on this interface — never on
 * Pino or any other concrete logging implementation directly.
 * This ensures the domain remains framework-agnostic.
 *
 * @hexagonal Port Interface — Driven Port (outbound)
 * @task P1-ARCH-010
 */

/**
 * Framework-agnostic logging interface.
 *
 * Implemented by the Pino-based logger in `logger.ts`.
 * Consumed by use cases, domain services, and adapters.
 *
 * @example
 * ```typescript
 * class SearchHacksUseCase {
 *   constructor(private readonly logger: LoggerPort) {}
 *
 *   async search(query: HackQuery): Promise<PaginatedResult> {
 *     this.logger.info('Searching hacks', { query });
 *     // ...
 *   }
 * }
 * ```
 */
export interface LoggerPort {
  /** Log an error-level message. */
  error(message: string, meta?: Record<string, unknown>): void;

  /** Log a warning-level message. */
  warn(message: string, meta?: Record<string, unknown>): void;

  /** Log an info-level message. */
  info(message: string, meta?: Record<string, unknown>): void;

  /** Log a debug-level message. */
  debug(message: string, meta?: Record<string, unknown>): void;

  /**
   * Create a child logger with additional bound metadata.
   * All log entries from the child include the parent's metadata.
   */
  child(meta: Record<string, unknown>): LoggerPort;
}
