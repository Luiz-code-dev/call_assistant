<div align="center">

# 🎙️ Call Assistant

### Assistente de Chamadas em Tempo Real com Inteligência Artificial

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)
[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Electron](https://img.shields.io/badge/Electron-34-blue.svg)](https://www.electronjs.org/)
[![Rust](https://img.shields.io/badge/Rust-stable-orange.svg)](https://www.rust-lang.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4.1-412991.svg)](https://openai.com/)

</div>

---

## 📌 Sobre o Produto

**Call Assistant** é uma aplicação desktop inovadora que atua como assistente inteligente em tempo real durante entrevistas, reuniões e chamadas em inglês. Desenvolvido especialmente para profissionais brasileiros que necessitam de suporte bilíngue em conversações em inglês, o sistema captura o áudio da chamada, transcreve, traduz e sugere respostas contextuais automaticamente — tudo em tempo real.

> **Não existe nenhum produto equivalente disponível no mercado brasileiro.**
> O Call Assistant combina, em uma única aplicação de desktop nativa, captura de áudio do sistema, transcrição por IA, tradução contextual e sugestão de respostas — sem dependência de extensões de browser, sem plugins de terceiros, e sem latência perceptível.

### ✨ Diferenciais únicos

- 🎧 **Captura de áudio do sistema** (WASAPI) — intercepta o áudio da chamada sem necessidade de hardware adicional
- 🗣️ **Transcrição em tempo real** via OpenAI Whisper com buffer adaptativo
- 🌐 **Tradução contextual** para PT-BR com consciência do contexto da reunião
- 🤖 **Copilot de respostas** — 3 sugestões de resposta em inglês com tradução PT-BR para cada uma
- 📋 **Interface bilíngue** — EN principal, PT-BR como suporte, projetada para leitura rápida sob pressão
- 🔒 **100% local + API privada** — nenhum áudio é armazenado em servidores externos além da transcrição

---

## 👤 Autoria e Propriedade Intelectual

```
Autor:        Luiz Eduardo da Silva Dias Melo
Título:       Engenheiro de Software — Especialista em Inteligência Artificial
CPF:          046.***.***-**
Data:         31 de março de 2026
Repositório:  https://github.com/Luiz-code-dev/call_assistant
```

Este software é de **autoria exclusiva** de **Luiz Eduardo da Silva Dias Melo** e foi concebido, arquitetado e desenvolvido integralmente por ele. Qualquer reprodução, distribuição, modificação, engenharia reversa ou uso comercial deste código — total ou parcial — sem autorização expressa e por escrito do autor é **estritamente proibido** e sujeito às penalidades previstas na:

- **Lei nº 9.609/1998** — Lei de Software (Brasil)
- **Lei nº 9.610/1998** — Lei de Direitos Autorais (Brasil)
- **Lei nº 10.406/2002** — Código Civil Brasileiro (Art. 186 — Ato Ilícito)

> © 2026 Luiz Eduardo da Silva Dias Melo. Todos os direitos reservados.

---

## 🏗️ Arquitetura Técnica

O projeto adota **Arquitetura Hexagonal (Ports & Adapters)** no backend, garantindo total separação entre domínio de negócio e infraestrutura.

```
call-assistant/
├── apps/
│   ├── desktop/              # Electron 34 + React 18 + TypeScript + TailwindCSS
│   └── backend/              # Java 21 + Spring Boot 3.4 + WebFlux + R2DBC
├── packages/
│   └── shared-types/         # Contratos TypeScript compartilhados (strict)
├── services/
│   └── audio-engine/         # Sidecar Rust (WASAPI — captura de áudio do sistema)
├── infra/
│   └── docker/               # PostgreSQL, Redis, Prometheus, Grafana, Tempo, OTel
└── docs/
    ├── adr/                   # Architecture Decision Records
    └── api/                   # Especificação OpenAPI
```

### Pipeline em tempo real

```
Sistema de Áudio (WASAPI)
        │
        ▼
   Rust Sidecar ──────────────────────────────────────────────────►
   (PCM chunks via IPC)                                            │
                                                                   ▼
                                                    WebSocket Binary Frame
                                                           │
                                                           ▼
                                              Spring WebFlux (AudioWebSocketHandler)
                                                           │
                                                           ▼
                                               ProcessAudioChunkUseCase
                                                     │         │
                                              ┌──────┘         └──────┐
                                              ▼                       ▼
                                    WhisperSpeechToText        (buffering)
                                    (GPT-4o-mini-transcribe)
                                              │
                                              ▼
                                       Transcript Event
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                            OpenAiCopilot       OpenAiTranslation
                            (/chat/completions) (/chat/completions)
                                    │
                                    ▼
                          contextSummary (PT-BR)
                          + 3 sugestões EN
                          + 3 traduções PT-BR
                                    │
                                    ▼
                         WebSocket SUGGESTION_READY
                                    │
                                    ▼
                           CopilotPanel (React)
```

### Stack tecnológico completo

| Camada | Tecnologia |
|---|---|
| Desktop Shell | Electron 34 + electron-vite 3 |
| UI Framework | React 18 + TypeScript (strict) |
| Estilização | TailwindCSS 4 |
| Estado | Zustand |
| Monorepo | pnpm 9 + Turborepo |
| Backend | Java 21 + Spring Boot 3.4 + WebFlux |
| Reatividade | Project Reactor (Mono/Flux) |
| Persistência | PostgreSQL + R2DBC (reativo) |
| Cache | Redis (Reactive) |
| Migrations | Flyway |
| Audio Engine | Rust (WASAPI — Windows) |
| STT | OpenAI Whisper (gpt-4o-mini-transcribe) |
| Tradução | OpenAI GPT-4.1-mini |
| Copilot | OpenAI GPT-4.1-mini (inline prompt) |
| Observabilidade | OpenTelemetry + Grafana + Prometheus + Tempo |
| Contratos | OpenAPI 3.1 + shared-types TypeScript |

---

## ⚙️ Pré-requisitos

| Requisito | Versão mínima |
|---|---|
| Node.js | 20+ |
| pnpm | 9+ |
| Java (JDK) | 21 |
| Rust (toolchain MSVC) | stable |
| Docker + Docker Compose | latest |
| OpenAI API Key | — |

---

## 🚀 Como executar localmente

### 1. Clonar o repositório

```bash
git clone https://github.com/Luiz-code-dev/call_assistant.git
cd call_assistant/call-assistant
```

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha com sua chave OpenAI:

```bash
cp apps/backend/src/main/resources/application-local.yml.example \
   apps/backend/src/main/resources/application-local.yml
```

Edite `application-local.yml`:

```yaml
callassistant:
  openai:
    api-key: sk-...sua-chave-aqui...
```

### 4. Subir a infraestrutura (Postgres, Redis, Grafana)

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

### 5. Compilar o sidecar Rust

```bash
cargo build --release --manifest-path services/audio-engine/Cargo.toml
```

### 6. Iniciar o backend

```bash
cd apps/backend
./mvnw spring-boot:run
```

### 7. Iniciar o desktop (Electron)

```bash
pnpm --filter @call-assistant/desktop dev
```

---

## 🖥️ Como usar

1. **Abra o Call Assistant**
2. Clique em **Start Session**
3. No modal de contexto, descreva o assunto da reunião (opcional, melhora as sugestões)
4. Inicie sua chamada em inglês em qualquer aplicativo
5. O painel **Conversa** exibe o que o entrevistador diz em inglês + tradução PT-BR
6. O painel **Copilot** exibe automaticamente:
   - **O que foi dito** — resumo em PT-BR do contexto
   - **3 sugestões de resposta** em inglês com tradução PT-BR
7. Clique em **Copiar** na sugestão desejada e cole no chat da chamada
8. Arraste a borda do painel Copilot para redimensioná-lo (240px – 600px)

---

## 📦 Estrutura dos Eventos WebSocket

| Evento | Descrição |
|---|---|
| `TRANSCRIPT_PARTIAL` | Fragmento de transcrição em tempo real |
| `TRANSCRIPT_FINAL` | Transcrição finalizada e confirmada |
| `TRANSLATION_READY` | Tradução PT-BR disponível |
| `SUGGESTION_READY` | Copilot: contextSummary + sugestões EN + traduções PT-BR |
| `SESSION_STATUS_CHANGED` | Mudança de estado da sessão (ACTIVE/PAUSED/ENDED) |

---

## 🗂️ Architecture Decision Records

| ADR | Decisão |
|---|---|
| [ADR-001](./docs/adr/ADR-001-hexagonal-architecture.md) | Arquitetura Hexagonal no backend |
| [ADR-002](./docs/adr/ADR-002-reactive-stack.md) | Stack reativo com WebFlux + R2DBC |
| [ADR-003](./docs/adr/ADR-003-rust-audio-sidecar.md) | Sidecar Rust para captura de áudio (WASAPI) |

---

## 📄 Licença

**PROPRIETÁRIO — TODOS OS DIREITOS RESERVADOS**

Este software é propriedade exclusiva de **Luiz Eduardo da Silva Dias Melo** (CPF 046.245.652-5).
É expressamente proibido copiar, distribuir, sublicenciar, modificar, realizar engenharia reversa ou usar este software para qualquer finalidade sem autorização prévia e por escrito do titular.

Para licenciamento comercial, parcerias ou autorizações, entre em contato com o autor.

---

<div align="center">

**Call Assistant** — Desenvolvido com 🧠 e ☕ por **Luiz Eduardo da Silva Dias Melo**

*Engenheiro de Software · Especialista em Inteligência Artificial · Brasil · 2026*

</div>
