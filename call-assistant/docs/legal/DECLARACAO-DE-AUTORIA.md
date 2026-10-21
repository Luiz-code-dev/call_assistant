# DECLARAÇÃO FORMAL DE AUTORIA E PROPRIEDADE INTELECTUAL

---

## IDENTIFICAÇÃO DO SOFTWARE

| Campo | Valor |
|---|---|
| **Nome do Software** | SpeakFlow |
| **Versão** | 1.0.0 |
| **Tipo** | Aplicação Desktop com Inteligência Artificial |
| **Data de Criação** | 31 de março de 2026 |
| **Repositório Oficial** | https://github.com/Luiz-code-dev/call_assistant |
| **Hash do Commit Inicial** | `13f7a9e` (verificar hash completo abaixo) |

---

## IDENTIFICAÇÃO DO AUTOR

| Campo | Valor |
|---|---|
| **Nome Completo** | Luiz Eduardo da Silva Dias Melo |
| **Qualificação** | Engenheiro de Software — Especialista em Inteligência Artificial |
| **CPF** | 046.245.652-5 |
| **Data da Declaração** | 31 de março de 2026 |
| **País** | Brasil |

---

## DECLARAÇÃO

Eu, **Luiz Eduardo da Silva Dias Melo**, portador do CPF nº **046.245.655-25**,
na qualidade de único e exclusivo autor do software denominado **SpeakFlow**,
DECLARO para os devidos fins de direito que:

1. **Concebi, arquitetei e desenvolvi integralmente** o presente software,
   incluindo toda a sua arquitetura, código-fonte, estrutura de dados,
   pipeline de processamento, interface gráfica e documentação técnica;

2. **O software é uma obra original**, não derivada de nenhum outro software
   proprietário, sendo construído sobre bibliotecas e frameworks de código aberto
   devidamente identificados nas dependências do projeto;

3. **Não existe no mercado brasileiro ou internacional** nenhuma solução que
   combine, em uma única aplicação desktop nativa, os seguintes elementos:
   - Captura de áudio do sistema em tempo real via WASAPI (Rust)
   - Transcrição automática via OpenAI Whisper
   - Tradução contextual bilíngue (EN→PT-BR)
   - Geração de sugestões de resposta com tradução em tempo real
   - Interface bilíngue de baixa latência para entrevistas

4. **A data de criação** foi 31 de março de 2026, conforme evidenciado pelo
   histórico de commits do repositório público no GitHub;

5. **Detenho todos os direitos morais e patrimoniais** sobre o software, nos
   termos da Lei nº 9.609/1998 e Lei nº 9.610/1998.

---

## EVIDÊNCIAS DE AUTORIA

### Commit Inicial no GitHub
```
Repositório:  https://github.com/Luiz-code-dev/call_assistant
Branch:       main
Data:         2026-03-31
Commit Hash:  (gerado automaticamente pelo Git — ver seção HASH)
Mensagem:     feat: initial commit — call-assistant MVP
```

### Estrutura de Autoria do Código
Todos os commits do repositório estão assinados com:
- **Author Name:** Luiz-code-dev
- **Author Email:** programadorlesd@gmail.com

### Hash Criptográfico do Código-Fonte
> Consulte o arquivo `docs/legal/HASH-REGISTRO.md` para os hashes SHA-256
> gerados em 31/03/2026, que constituem prova criptográfica da anterioridade.

---

## TECNOLOGIAS E INOVAÇÕES PROTEGIDAS

### 1. Pipeline de Processamento em Tempo Real
A combinação específica e o fluxo de dados implementado:
```
WASAPI (Rust) → IPC Binary → WebSocket → Whisper STT →
GPT-4.1-mini Translation → GPT-4.1-mini Copilot →
Bilingual Suggestion Cards (EN + PT-BR)
```

### 2. Arquitetura de Sugestões Bilíngues
O sistema de geração de sugestões de resposta com tradução simultânea
EN/PT-BR, incluindo o formato do prompt, o parser de resposta e a
estrutura de dados `CopilotSuggestion` com `suggestionTranslations`.

### 3. Interface de Leitura Rápida
O design da interface com priorização visual do inglês e tradução
PT-BR como suporte imediato, otimizado para uso em situação de pressão
(entrevistas em tempo real).

### 4. Sidecar de Áudio em Rust
A implementação do componente de captura de áudio via WASAPI com
fallback automático e protocolo IPC customizado para comunicação
com o processo Electron principal.

---

## LEGISLAÇÃO APLICÁVEL

| Lei | Descrição | Aplicação |
|---|---|---|
| Lei nº 9.609/1998 | Proteção de Programa de Computador | Registro e proteção do software |
| Lei nº 9.610/1998 | Direitos Autorais | Proteção da obra intelectual |
| Decreto nº 2.556/1998 | Registro de Programas de Computador no INPI | Base para registro formal |
| Lei nº 10.406/2002 | Código Civil — Art. 186 | Responsabilidade por ato ilícito |
| Convenção de Berna | Proteção Internacional | Reconhecimento em 179 países |
| Acordo TRIPS | Propriedade Intelectual Internacional | Proteção em países da OMC |

---

## PROCESSO DE REGISTRO FORMAL

Para registro oficial junto ao **INPI (Instituto Nacional da Propriedade Industrial)**,
consulte o arquivo `docs/legal/GUIA-REGISTRO-INPI.md`.

---

*Esta declaração foi elaborada em 31 de março de 2026.*
*© 2026 Luiz Eduardo da Silva Dias Melo. Todos os direitos reservados.*
