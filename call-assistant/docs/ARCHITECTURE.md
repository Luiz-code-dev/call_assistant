# DOCUMENTAÇÃO DE ARQUITETURA — SPEAKFLOW

**Versão:** 1.0.0  
**Autor:** Luiz Eduardo da Silva Dias Melo  
**Data:** 31 de março de 2026

---

## 1. VISÃO GERAL DO SISTEMA

O **SpeakFlow** é uma aplicação desktop de múltiplas camadas que opera
inteiramente na máquina do usuário, integrando-se a APIs de Inteligência
Artificial para processar áudio em tempo real.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MÁQUINA DO USUÁRIO                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ELECTRON DESKTOP APP                          │  │
│  │  ┌─────────────────────┐    ┌──────────────────────────────────┐ │  │
│  │  │   Main Process      │    │       Renderer Process           │ │  │
│  │  │   (Node.js)         │    │  React 18 + TypeScript + Zustand │ │  │
│  │  │                     │◄──►│                                  │ │  │
│  │  │  - SidecarManager   │    │  - SessionPage                   │ │  │
│  │  │  - IPC Handlers     │    │  - TranscriptPanel               │ │  │
│  │  │  - WindowFactory    │    │  - CopilotPanel                  │ │  │
│  │  └──────┬──────────────┘    └──────────────┬───────────────────┘ │  │
│  │         │ spawn + stdio IPC                 │ WebSocket           │  │
│  │  ┌──────▼──────────────┐    ┌──────────────▼───────────────────┐ │  │
│  │  │  RUST SIDECAR        │    │      SPRING BOOT BACKEND         │ │  │
│  │  │  audio-engine        │    │      (localhost:8080)            │ │  │
│  │  │                     │    │                                  │ │  │
│  │  │  WASAPI loopback    ├───►│  - AudioWebSocketHandler         │ │  │
│  │  │  PCM 16kHz mono     │    │  - ProcessAudioChunkUseCase      │ │  │
│  │  │  JSON IPC protocol  │    │  - WhisperSpeechToTextAdapter    │ │  │
│  │  └─────────────────────┘    │  - OpenAiCopilotAdapter          │ │  │
│  │                             │  - SessionEventPublisher          │ │  │
│  │                             └──────────────┬───────────────────┘ │  │
│  └──────────────────────────────────────────── │ ────────────────────┘  │
│                                                │ HTTPS                   │
└────────────────────────────────────────────────│────────────────────────┘
                                                 ▼
                                    ┌────────────────────────┐
                                    │    OPENAI API          │
                                    │  - Whisper STT         │
                                    │  - GPT-4.1-mini        │
                                    └────────────────────────┘
```

---

## 2. CAMADAS DA ARQUITETURA

### 2.1 Audio Engine (Rust Sidecar)

**Localização:** `services/audio-engine/`  
**Linguagem:** Rust (stable, MSVC toolchain)  
**Responsabilidade:** Captura de áudio do sistema operacional em tempo real.

```
┌─────────────────────────────────────────────────────┐
│                  AUDIO ENGINE (Rust)                │
│                                                     │
│  WASAPI Loopback Capture                           │
│  ├── Abre o dispositivo de saída de áudio padrão   │
│  ├── Captura PCM: 16kHz, 16-bit, mono              │
│  ├── Emite chunks via stdout (binary IPC)          │
│  └── Fallback: stub_capture em caso de erro        │
│                                                     │
│  Protocolo IPC (stdin/stdout):                     │
│  ├── stdin:  JSON commands {"cmd":"start",...}     │
│  └── stdout: binary PCM frames + JSON events       │
└─────────────────────────────────────────────────────┘
```

**Decisões de design:**
- Rust foi escolhido por acesso direto às APIs do SO sem overhead de JVM/V8
- WASAPI (Windows Audio Session API) permite captura do áudio do sistema
- O sidecar é spawned pelo processo principal do Electron via `child_process`

### 2.2 Desktop Application (Electron + React)

**Localização:** `apps/desktop/`  
**Stack:** Electron 34, React 18, TypeScript strict, Zustand, TailwindCSS 4

#### 2.2.1 Main Process (Node.js)

```
electron/main/
├── index.ts          # Ponto de entrada, ciclo de vida da janela
├── ipc/
│   └── index.ts      # Handlers IPC: startCapture, stopCapture
├── sidecar/
│   └── SidecarManager.ts  # Spawn do sidecar Rust, relay IPC→WS
└── window/
    └── WindowFactory.ts   # Configuração da BrowserWindow
```

#### 2.2.2 Renderer Process (React)

```
src/
├── ui/
│   ├── pages/
│   │   └── SessionPage.tsx     # Layout principal + gerenciamento de estado
│   └── components/
│       ├── TranscriptPanel.tsx  # Histórico de transcrições + traduções
│       └── CopilotPanel.tsx     # Sugestões de resposta + PT-BR
├── application/
│   ├── hooks/
│   │   ├── useTranscription.ts  # WebSocket event handler
│   │   └── useAudioBridge.ts    # Ponte áudio Sidecar→Backend
│   └── store/
│       ├── sessionStore.ts      # Estado da sessão (Zustand)
│       ├── transcriptStore.ts   # Transcrições + traduções (Zustand)
│       └── copilotStore.ts      # Sugestões do Copilot (Zustand)
└── infrastructure/
    ├── api/
    │   └── sessionApi.ts        # REST client (create/stop session)
    └── websocket/
        └── WebSocketClient.ts  # WS client com reconexão automática
```

### 2.3 Backend (Java 21 + Spring Boot 3.4)

**Localização:** `apps/backend/`  
**Padrão:** Arquitetura Hexagonal (Ports & Adapters)  
**Stack:** Spring WebFlux, R2DBC, Flyway, PostgreSQL, Redis

#### 2.3.1 Estrutura Hexagonal

```
src/main/java/com/callassistant/
├── domain/                          # NÚCLEO — zero dependências externas
│   ├── model/
│   │   ├── Session.java
│   │   ├── Transcript.java
│   │   ├── Translation.java
│   │   ├── CopilotSuggestion.java   # + suggestionTranslations
│   │   └── ...
│   ├── port/
│   │   ├── inbound/                 # Casos de uso (interfaces)
│   │   │   ├── StartSessionUseCase
│   │   │   ├── StopSessionUseCase
│   │   │   └── ProcessAudioChunkUseCase
│   │   └── outbound/               # Portas de saída (interfaces)
│   │       ├── SessionRepository
│   │       ├── SpeechToTextPort
│   │       ├── TranslationPort
│   │       ├── CopilotPort
│   │       └── SessionEventPublisher
│   └── event/
│       └── (eventos de domínio)
│
├── application/                     # CASOS DE USO — orquestração
│   └── usecase/
│       ├── StartSessionUseCaseImpl
│       ├── StopSessionUseCaseImpl
│       └── ProcessAudioChunkUseCaseImpl  # Pipeline principal
│
└── infrastructure/                  # ADAPTADORES — implementações
    ├── adapter/
    │   ├── inbound/
    │   │   ├── rest/
    │   │   │   └── SessionController
    │   │   └── websocket/
    │   │       ├── AudioWebSocketHandler
    │   │       └── protocol/
    │   │           └── WsServerEventFactory
    │   └── outbound/
    │       ├── ai/
    │       │   ├── stt/WhisperSpeechToTextAdapter
    │       │   ├── translation/OpenAiTranslationAdapter
    │       │   ├── copilot/OpenAiCopilotAdapter
    │       │   └── tts/ElevenLabsTtsAdapter
    │       └── persistence/
    │           ├── SessionRepositoryAdapter
    │           ├── TranscriptRepositoryAdapter
    │           └── TranslationRepositoryAdapter
    └── config/
        ├── OpenAiProperties
        └── OpenAiWebClientConfig
```

#### 2.3.2 Pipeline de Processamento de Áudio

```java
// ProcessAudioChunkUseCaseImpl — fluxo reativo (Reactor)

audioChunk (PCM bytes)
    │
    ▼
speechToTextPort.transcribe(sessionId, chunk, language)   // Whisper API
    │
    ▼ Mono<Transcript>
sessionEventPublisher.emitTranscript()                     // WS: TRANSCRIPT_FINAL
    │
    ├─── copilotPort.suggest(sessionId, text, config)      // GPT-4.1-mini
    │         │
    │         ▼ Mono<CopilotSuggestion>
    │    sessionEventPublisher.emitSuggestion()            // WS: SUGGESTION_READY
    │
    └─── translationPort.translate(sessionId, text, config) // fallback
              │
              ▼ Mono<Translation>
         sessionEventPublisher.emitTranslation()           // WS: TRANSLATION_READY
```

---

## 3. PROTOCOLO DE COMUNICAÇÃO

### 3.1 IPC Electron ↔ Sidecar Rust

```json
// Electron → Sidecar (stdin, JSON)
{ "cmd": "start", "sampleRate": 16000, "channels": 1 }
{ "cmd": "stop" }

// Sidecar → Electron (stdout, binary + JSON events)
// Binary: PCM frames prefixados com tipo de mensagem
// JSON: { "type": "error", "message": "..." }
```

### 3.2 WebSocket — Eventos do Servidor

```json
// TRANSCRIPT_FINAL
{
  "type": "TRANSCRIPT_FINAL",
  "sessionId": "uuid",
  "ts": 1743465600000,
  "payload": {
    "transcript": {
      "id": "uuid", "text": "...", "speaker": "LOCAL",
      "isFinal": true, "confidence": 0.95, "language": "en-US"
    }
  }
}

// SUGGESTION_READY
{
  "type": "SUGGESTION_READY",
  "sessionId": "uuid",
  "ts": 1743465600000,
  "payload": {
    "suggestion": {
      "id": "uuid",
      "contextSummary": "PT-BR tradução do que foi dito",
      "suggestions": ["Yes, I can help.", "Certainly!", "..."],
      "suggestionTranslations": ["Sim, posso ajudar.", "Certamente!", "..."],
      "createdAt": "2026-03-31T21:00:00Z"
    }
  }
}
```

---

## 4. MODELO DE DADOS

### 4.1 Schema do Banco de Dados (PostgreSQL)

```sql
-- V1: Sessões
CREATE TABLE sessions (
    id            VARCHAR(36) PRIMARY KEY,
    status        VARCHAR(20) NOT NULL,
    source_lang   VARCHAR(10) NOT NULL,
    target_lang   VARCHAR(10) NOT NULL,
    enable_tts    BOOLEAN NOT NULL DEFAULT FALSE,
    enable_suggestions BOOLEAN NOT NULL DEFAULT FALSE,
    started_at    TIMESTAMP NOT NULL,
    ended_at      TIMESTAMP
);

-- V2: Transcrições
CREATE TABLE transcripts (
    id         VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES sessions(id),
    text       TEXT NOT NULL,
    speaker    VARCHAR(10) NOT NULL,
    language   VARCHAR(10) NOT NULL,
    confidence DOUBLE PRECISION,
    is_final   BOOLEAN NOT NULL DEFAULT FALSE,
    start_ms   BIGINT,
    end_ms     BIGINT,
    created_at TIMESTAMP NOT NULL
);

-- V3: Traduções
CREATE TABLE translations (
    id            VARCHAR(36) PRIMARY KEY,
    session_id    VARCHAR(36) NOT NULL,
    transcript_id VARCHAR(36) NOT NULL,
    source_text   TEXT NOT NULL,
    target_text   TEXT NOT NULL,
    source_lang   VARCHAR(10) NOT NULL,
    target_lang   VARCHAR(10) NOT NULL,
    created_at    TIMESTAMP NOT NULL
);

-- V4: Contexto de reunião (meeting_context)
ALTER TABLE sessions ADD COLUMN meeting_context TEXT;
```

---

## 5. INTEGRAÇÕES COM IA

### 5.1 OpenAI Whisper — Speech-to-Text

| Campo | Valor |
|---|---|
| Endpoint | `POST /audio/transcriptions` |
| Modelo | `gpt-4o-mini-transcribe` |
| Input | WAV 16kHz mono (30 chunks PCM bufferizados) |
| Output | Texto transcrito com idioma detectado |

### 5.2 OpenAI GPT-4.1-mini — Copilot

| Campo | Valor |
|---|---|
| Endpoint | `POST /chat/completions` |
| Modelo | `gpt-4.1-mini` |
| Input | System prompt inline + texto transcrito |
| Output | Tradução PT-BR + 3 sugestões EN + 3 traduções PT-BR |

**System Prompt (estrutura):**
```
You are a real-time call assistant for a Brazilian user attending an English interview.
Given a transcript snippet, you must:
1. Translate it from {sourceLang} to {targetLang}.
2. Suggest 3 possible replies in English.
3. For each reply, provide a PT-BR translation.
[optional: Call context: {meetingContext}]

Respond in EXACTLY this format:
<pt-br translation>
RESPOSTAS SUGERIDAS:
1. Curta: <reply>
   PT: <translation>
2. Profissional: <reply>
   PT: <translation>
3. Detalhada: <reply>
   PT: <translation>
```

---

## 6. INFRAESTRUTURA LOCAL

```yaml
# docker-compose.yml
services:
  postgres:   # PostgreSQL 16 — porta 5432
  redis:      # Redis 7 — porta 6379
  prometheus: # Prometheus — porta 9090
  grafana:    # Grafana — porta 3000
  tempo:      # Grafana Tempo (tracing) — porta 3200
  otel:       # OpenTelemetry Collector — porta 4317
```

---

## 7. DECISÕES ARQUITETURAIS (ADRs)

| ADR | Decisão | Justificativa |
|---|---|---|
| ADR-001 | Arquitetura Hexagonal | Separação total entre domínio e infra; testabilidade |
| ADR-002 | Stack reativo (WebFlux + R2DBC) | Baixa latência; sem bloqueio de threads para I/O |
| ADR-003 | Sidecar Rust para áudio | Acesso nativo WASAPI; sem overhead de GC; latência mínima |

---

## 8. FLUXO DE DADOS COMPLETO

```
[YouTube / Google Meet / Zoom]
         │ áudio do sistema
         ▼
[WASAPI — Windows Audio Loopback]
         │ PCM 16kHz
         ▼
[Rust Sidecar — audio-engine]
         │ binary IPC (stdout)
         ▼
[SidecarManager — Electron Main]
         │ WebSocket binary frame
         ▼
[AudioWebSocketHandler — Spring]
         │ Reactor Flux<byte[]>
         ▼
[WhisperSpeechToTextAdapter]
         │ 30 chunks bufferizados → WAV
         │ POST /audio/transcriptions
         ▼
[OpenAI Whisper API]
         │ Transcript text
         ▼
[ProcessAudioChunkUseCaseImpl]
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
[OpenAiCopilotAdapter]              [OpenAiTranslationAdapter]
POST /chat/completions               POST /chat/completions
         │                                      │
         ▼                                      ▼
[CopilotSuggestion]                 [Translation]
contextSummary (PT-BR)              targetText (PT-BR)
suggestions[] (EN)
suggestionTranslations[] (PT-BR)
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                        ▼
[WsServerEventFactory — Spring]
SUGGESTION_READY + TRANSLATION_READY
                        │
                        ▼
[WebSocketClient — Electron Renderer]
                        │
                        ▼
[Zustand Stores — React]
copilotStore / transcriptStore
                        │
                        ▼
[TranscriptPanel + CopilotPanel]
Entrevistador: "Can you explain..."
PT: "Pode explicar..."
─────────────────────────
● Curta     [Copiar]
Yes, I can.
PT: Sim, posso.
```

---

*© 2026 Luiz Eduardo da Silva Dias Melo. Todos os direitos reservados.*  
*Documento de arquitetura — SpeakFlow v1.0.0*
