# ADR-001 — Hexagonal Architecture (Ports & Adapters)

**Status:** Accepted  
**Date:** 2026-03-31

## Context

The backend needs to integrate with multiple external AI providers (STT, translation, TTS, copilot) that may change over time. Additionally, the domain logic must be independently testable without standing up databases or HTTP servers.

## Decision

Adopt Hexagonal Architecture (Ports & Adapters) for the backend:

- **Domain layer** — pure Java, zero framework dependencies. Contains entities, value objects, domain events, and port interfaces.
- **Application layer** — use case implementations. Depends only on the domain. No Spring annotations except `@Service`.
- **Infrastructure layer** — all framework and external system concerns. REST controllers, WebSocket handlers, R2DBC adapters, AI provider clients.

```
Domain ←── Application ←── Infrastructure
  (no deps)    (domain)       (Spring, R2DBC, HTTP)
```

## Consequences

- **Positive:** Provider swap (e.g., Whisper → Deepgram) requires only a new `@Component` implementing `SpeechToTextPort` — domain unchanged.
- **Positive:** Domain unit tests run in milliseconds with no Spring context.
- **Positive:** Clear ownership boundaries enforce Clean Code and SOLID.
- **Negative:** More files than a layered architecture; acceptable given project scale.
