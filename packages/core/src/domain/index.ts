/**
 * @module domain
 * @description Barrel export for the entire domain layer.
 *
 * The domain layer is the nucleus of the hexagonal architecture.
 * It contains:
 * - Entities: Objects with identity (UUID) and lifecycle
 * - Value Objects: Immutable, identity-less domain primitives
 * - Ports: Abstract interfaces to the external world
 *
 * ALL domain code is framework-agnostic — zero coupling to
 * databases, HTTP frameworks, or external services.
 *
 * @hexagonal Domain Layer — Shared Kernel
 */

// ── Entities ─────────────────────────────────────────────────────────────────
export * from './entities/index.js';

// ── Value Objects ────────────────────────────────────────────────────────────
export * from './value-objects/index.js';

// ── Ports ────────────────────────────────────────────────────────────────────
export * from './ports/index.js';
