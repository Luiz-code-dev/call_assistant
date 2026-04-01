# ADR-002 — Reactive Stack (Spring WebFlux + R2DBC)

**Status:** Accepted  
**Date:** 2026-03-31

## Context

Audio processing is inherently streaming: chunks arrive continuously, are transcribed, translated, and pushed to the UI — all with low latency requirements. A traditional blocking stack (Spring MVC + JDBC) would require thread-per-connection model and struggle under concurrent streaming sessions.

## Decision

Use **Spring WebFlux** (Reactor) throughout the backend stack:

- HTTP endpoints return `Mono<T>` / `Flux<T>`
- Database access via **R2DBC** (non-blocking Postgres driver)
- Redis via **Spring Data Redis Reactive**
- WebSocket streaming via reactive `WebSocketHandler`
- No blocking calls anywhere in the request path

Flyway runs at startup with a separate blocking JDBC `DataSource` (isolated from the reactive path — standard practice).

## Consequences

- **Positive:** Natural backpressure for audio streams; efficient thread usage under load.
- **Positive:** Consistent async model end-to-end — no accidental blocking.
- **Negative:** Reactive debugging is harder; `StepVerifier` is required for tests.
- **Negative:** Cannot mix `@Transactional` (blocking) with R2DBC; transactions handled explicitly via `TransactionalOperator`.
