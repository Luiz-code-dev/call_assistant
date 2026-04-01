# Call Assistant

> Real-time call assistant with transcription, translation, TTS and response suggestions.

## Architecture

- **Desktop**: Electron + React + TypeScript (strict)
- **Audio Engine**: Rust sidecar (WASAPI / CoreAudio / ALSA)
- **Backend**: Java 21 + Spring Boot 3 + WebFlux (Hexagonal Architecture)
- **Database**: PostgreSQL (via R2DBC)
- **Cache**: Redis (Reactive)
- **Observability**: OpenTelemetry + Grafana + Prometheus + Tempo + Loki

## Monorepo Structure

```
call-assistant/
├── apps/
│   ├── desktop/          # Electron + React + TypeScript
│   └── backend/          # Java 21 + Spring Boot 3 + WebFlux
├── packages/
│   └── shared-types/     # Shared TypeScript contracts
├── services/
│   └── audio-engine/     # Rust sidecar
├── infra/
│   └── docker/           # Docker Compose for local dev
└── docs/
    ├── adr/              # Architecture Decision Records
    └── api/              # OpenAPI specification
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Java 21 (JDK)
- Rust (stable toolchain)
- Docker + Docker Compose

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure (Postgres, Redis, Grafana)

```bash
pnpm infra:up
```

### 3. Start all services in dev mode

```bash
pnpm dev
```

## Docs

- [Architecture Decision Records](./docs/adr/)
- [API Contract (OpenAPI)](./docs/api/openapi.yaml)
- [Backend README](./apps/backend/README.md)
- [Desktop README](./apps/desktop/README.md)
- [Audio Engine README](./services/audio-engine/README.md)
