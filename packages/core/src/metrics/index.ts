/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AltFlex AEGIS v3.0 — Prometheus Metrics Module
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Shared Prometheus metrics registry and custom metric definitions.
 * All backend services (API Gateway, ETL Workers, Forensic Engine) import
 * from this module to ensure consistent metric names and label schemas.
 *
 * @module @aegis/core/metrics
 * @hexagonal Infrastructure Layer — Observability Adapter
 * @task P6-PROD-005
 */

import {
  Registry,
  collectDefaultMetrics,
  Histogram,
  Counter,
  Gauge,
} from 'prom-client';

// ═══════════════════════════════════════════════════════════════════════════════
// Registry Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AEGIS metrics bundle returned by the factory.
 * Consumers destructure the metrics they need.
 */
export interface AegisMetrics {
  /** The prom-client registry instance */
  registry: Registry;

  /** HTTP request duration in seconds (histogram) */
  httpRequestDuration: Histogram;

  /** Total HTTP errors (counter) */
  httpErrorsTotal: Counter;

  /** BullMQ job processing duration in seconds (histogram) */
  bullmqJobDuration: Histogram;

  /** BullMQ queue size by state (gauge) */
  bullmqQueueSize: Gauge;

  /** Forensic trace execution duration in seconds (histogram) */
  forensicTraceDuration: Histogram;
}

/**
 * Create a new Prometheus metrics registry with all AEGIS custom metrics.
 *
 * Each service should call this once at boot and keep the returned bundle
 * for the lifetime of the process.
 *
 * @returns AegisMetrics bundle with registry and all metric handles
 */
export function createMetricsRegistry(): AegisMetrics {
  const registry = new Registry();

  // ── Default Node.js Metrics (CPU, memory, event loop lag, GC) ───────────
  collectDefaultMetrics({ register: registry });

  // ── HTTP Request Duration ───────────────────────────────────────────────
  const httpRequestDuration = new Histogram({
    name: 'aegis_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  });

  // ── HTTP Error Rate ─────────────────────────────────────────────────────
  const httpErrorsTotal = new Counter({
    name: 'aegis_http_errors_total',
    help: 'Total number of HTTP error responses (status >= 400)',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [registry],
  });

  // ── BullMQ Job Processing Time ──────────────────────────────────────────
  const bullmqJobDuration = new Histogram({
    name: 'aegis_bullmq_job_duration_seconds',
    help: 'Duration of BullMQ job processing in seconds',
    labelNames: ['queue', 'job_name'] as const,
    buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
    registers: [registry],
  });

  // ── BullMQ Queue Size ───────────────────────────────────────────────────
  const bullmqQueueSize = new Gauge({
    name: 'aegis_bullmq_queue_size',
    help: 'Current number of jobs in BullMQ queue by state',
    labelNames: ['queue', 'state'] as const,
    registers: [registry],
  });

  // ── Forensic Trace Execution Time ───────────────────────────────────────
  const forensicTraceDuration = new Histogram({
    name: 'aegis_forensic_trace_duration_seconds',
    help: 'Duration of forensic trace execution in seconds',
    labelNames: ['chain', 'trace_type'] as const,
    buckets: [0.5, 1, 2.5, 5, 10, 30, 60, 120],
    registers: [registry],
  });

  return {
    registry,
    httpRequestDuration,
    httpErrorsTotal,
    bullmqJobDuration,
    bullmqQueueSize,
    forensicTraceDuration,
  };
}
