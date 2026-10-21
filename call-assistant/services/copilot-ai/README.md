# copilot-ai — SpeakFlow Live Backend

Serviço Python FastAPI + AgentScope responsável pela IA do **SpeakFlow Live**: recebe transcrições em tempo real, mantém memória de sessão e retorna tradução + 3 sugestões de resposta em inglês.

> Faz parte do ecossistema SpeakFlow. Para o frontend Next.js, veja [`pageCallAssistant`](../../pageCallAssistant).

---

## Arquitetura

```
copilot-ai/
├── src/
│   ├── api/
│   │   ├── main.py                         # FastAPI app, inicializa modelo e adapters
│   │   └── routers/
│   │       └── copilot_router.py           # POST /copilot/suggest · POST /copilot/session/end
│   ├── application/
│   │   └── use_cases/
│   │       └── suggest_use_case.py         # Valida input e delega ao ICopilotPort
│   ├── domain/
│   │   └── ports/
│   │       └── copilot_port.py             # Interface ICopilotPort
│   └── infrastructure/
│       └── agentscope/
│           ├── agentscope_copilot_adapter.py  # Implementa ICopilotPort via AgentScope
│           ├── speakflow_agent.py              # Agente com InMemoryMemory por sessão
│           └── session_registry.py             # Ciclo de vida dos agentes (create/get/end)
├── requirements.txt
├── Dockerfile
└── railway.toml
```

---

## Fluxo de uma sugestão

```
Next.js /api/live/suggest
        │
        ▼ POST /copilot/suggest
  copilot_router.py
        │
        ▼
  SuggestResponseUseCase
        │  valida session_id, transcript
        ▼
  AgentScopeCopilotAdapter
        │  • busca ou cria agente via SessionRegistry
        │  • constrói system prompt (idioma, contexto, nível)
        │  • chama OpenAIChatModel (gpt-4o-mini)
        │  • parseia JSON: translation + suggestions[3] + suggestion_translations[3]
        ▼
  SpeakFlowCopilotAgent
        │  • armazena transcript na InMemoryMemory
        │  • retorna resposta estruturada
        ▼
  { translation, suggestions, suggestion_translations }
        │
        ▼
  Next.js debita 2 créditos e retorna ao cliente
```

---

## Contrato da API

### `POST /copilot/suggest`

**Request:**
```json
{
  "session_id": "live_{userId}_{timestamp}",
  "transcript": "The project deadline was moved to Friday",
  "meeting_context": "Reuniões de Negócios · Intermediário (B1-B2)",
  "source_lang": "en-US",
  "target_lang": "pt-BR"
}
```

**Response `200`:**
```json
{
  "translation": "O prazo do projeto foi movido para sexta-feira",
  "suggestions": [
    "Got it, I'll adjust my schedule accordingly.",
    "Understood. I'll reprioritize my tasks to meet the new deadline.",
    "Thank you for the update. I'll reorganize my workload and ensure all deliverables are ready by Friday."
  ],
  "suggestion_translations": [
    "Entendido, vou ajustar minha agenda.",
    "Entendido. Vou repriorizar minhas tarefas para cumprir o novo prazo.",
    "Obrigado pela atualização. Vou reorganizar minhas entregas para garantir que tudo esteja pronto até sexta."
  ]
}
```

### `POST /copilot/session/end`

```json
{ "session_id": "live_{userId}_{timestamp}" }
```

Limpa a `InMemoryMemory` do agente associado à sessão.

### `GET /health`

```json
{ "status": "ok" }
```

---

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `OPENAI_API_KEY` | Chave OpenAI — usada pelo `OpenAIChatModel` |
| `PORT` | Porta do servidor (padrão: `8080`) |

---

## Setup local

```bash
cd call-assistant/services/copilot-ai

# Criar virtualenv
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Configurar ambiente
echo "OPENAI_API_KEY=sk-..." > .env

# Rodar servidor
uvicorn src.api.main:app --reload --port 8000
```

Acesse: http://localhost:8000/health

---

## Deploy (Railway)

O serviço é deployado automaticamente via `railway.toml` na branch `main`.

- **Nome do serviço:** `innovative-peace`
- **URL interna Railway:** `http://innovative-peace.railway.internal:8080`
- **URL pública:** configurada no Railway dashboard

O Next.js consome o serviço via variável `COPILOT_SERVICE_URL=http://innovative-peace.railway.internal:8080`.

---

## Notas de design

- **Memória por sessão:** cada `session_id` tem um `SpeakFlowCopilotAgent` isolado com `InMemoryMemory`. Contextos de sessões diferentes nunca se misturam.
- **Prefixo `live_`:** o Next.js envia `session_id` como `live_{userId}_{timestamp}` para distinguir sessões Live das sessões do app desktop Java.
- **Sem persistência:** a memória é in-process. Se o serviço reiniciar, sessões ativas são perdidas (sem impacto para o usuário — basta iniciar nova sessão).
- **Modelo:** `gpt-4o-mini` por padrão (balanceio custo/velocidade). Configurável via `MODEL_NAME` se necessário.

---

© 2026 Luiz Eduardo da Silva Dias Melo
