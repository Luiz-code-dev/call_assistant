# GUIA DE REGISTRO DE SOFTWARE NO INPI (Brasil)

**Referente ao software:** SpeakFlow  
**Autor:** Luiz Eduardo da Silva Dias Melo (CPF 046.245.652-5)  
**Data:** 31 de março de 2026

---

## O QUE É O REGISTRO DE SOFTWARE NO INPI?

O **INPI (Instituto Nacional da Propriedade Industrial)** é o órgão brasileiro
responsável pelo registro de programas de computador. O registro é regulamentado
pela **Lei nº 9.609/1998** (Lei de Software) e pelo **Decreto nº 2.556/1998**.

> **Importante:** Na lei brasileira, o software é automaticamente protegido
> desde o momento de sua criação, SEM necessidade de registro.
> Porém, o registro no INPI fornece **presunção de autoria e data**, tornando
> muito mais fácil provar seus direitos em caso de disputa judicial.

---

## PASSO A PASSO DO REGISTRO

### PASSO 1 — Acesse o sistema e-Software do INPI

1. Acesse: **https://www.gov.br/inpi/pt-br**
2. Clique em **"Programas de Computador"** no menu de serviços
3. Crie uma conta no sistema **GRU Online** se ainda não tiver
4. Acesse o portal **e-Software**: https://gru.inpi.gov.br/pePI/

---

### PASSO 2 — Prepare os documentos necessários

Você precisará de:

#### A) Identificação do Titular
- Nome completo: **Luiz Eduardo da Silva Dias Melo**
- CPF: **046.245.652-5**
- Endereço completo
- E-mail de contato

#### B) Identificação do Software
- **Nome:** SpeakFlow
- **Versão:** 1.0.0
- **Data de criação:** 31/03/2026
- **Linguagem(ns):** Java, TypeScript, Rust
- **Tipo:** Aplicativo desktop
- **Descrição funcional:** (use o texto do README.md)

#### C) Extrato do Código-Fonte (OBRIGATÓRIO)
O INPI exige o depósito de **parte do código-fonte** em sigilo.
O depósito NÃO é público — fica guardado sob sigilo no INPI.

Prepare um arquivo contendo:
- As **primeiras 50 linhas** de cada arquivo fonte principal
- As **últimas 50 linhas** de cada arquivo fonte principal
- O arquivo pode ser enviado em formato `.zip` protegido por senha

**Arquivos principais a incluir:**
```
apps/backend/src/main/java/.../OpenAiCopilotAdapter.java
apps/backend/src/main/java/.../ProcessAudioChunkUseCaseImpl.java
apps/backend/src/main/java/.../WsServerEventFactory.java
apps/desktop/src/ui/pages/SessionPage.tsx
apps/desktop/src/ui/components/CopilotPanel.tsx
apps/desktop/src/ui/components/TranscriptPanel.tsx
services/audio-engine/src/main.rs
services/audio-engine/src/protocol.rs
packages/shared-types/src/suggestion.ts
packages/shared-types/src/websocket-events.ts
```

#### D) Manual do Usuário (recomendado)
Use o arquivo `README.md` do projeto como base.

---

### PASSO 3 — Pague a GRU (Taxa de Registro)

| Serviço | Código GRU | Valor (2026) |
|---|---|---|
| Pedido de registro de programa de computador | 207 | ~R$ 70,00 |
| Pessoa física | — | Sem desconto adicional |

> Verifique o valor atual em: https://www.gov.br/inpi/pt-br/servicos/programas-de-computador/tabela-de-retribuicoes

Pague a GRU pelo sistema bancário ou internet banking antes de enviar o pedido.

---

### PASSO 4 — Preencha o formulário de pedido

No sistema e-Software do INPI, preencha:

```
1. Tipo de pedido:          Registro de Programa de Computador
2. Natureza:                Aplicativo
3. Título:                  SpeakFlow
4. Versão:                  1.0.0
5. Data de publicação:      Não publicado (em sigilo)
6. Titulares:               Luiz Eduardo da Silva Dias Melo
7. Autores:                 Luiz Eduardo da Silva Dias Melo
8. CPF do autor:            046.245.652-5
9. Linguagem de programação: Java, TypeScript, Rust
10. Sistema operacional:    Windows (com suporte a Linux futuro)
11. Descrição:              Assistente de chamadas em tempo real com IA...
```

---

### PASSO 5 — Anexe os documentos

- [ ] Comprovante de pagamento da GRU
- [ ] Extrato do código-fonte (zip protegido por senha — **guarde a senha**)
- [ ] Manual do usuário / README
- [ ] Declaração de autoria (use `docs/legal/DECLARACAO-DE-AUTORIA.md`)

---

### PASSO 6 — Protocolo e acompanhamento

Após o envio, você receberá um **número de processo** no formato:
```
BR 51 XXXX XXXXXX X
```

O prazo para o INPI analisar e publicar o registro é de **aproximadamente 30 dias**.

Acompanhe em: https://busca.inpi.gov.br/pePI/

---

## ALTERNATIVAS COMPLEMENTARES AO INPI

### 1. Cartório de Registro de Títulos e Documentos
Mais rápido e barato. Registre o hash SHA-256 + declaração de autoria em cartório.
Tem validade legal como prova de data.

**Custo:** ~R$ 30–80  
**Prazo:** Imediato (no mesmo dia)

### 2. Blockchain / NFT de Autoria (RecordMe, Bernstein)
Registros imutáveis em blockchain com timestamp. Aceitos internacionalmente.

### 3. Email para si mesmo com hash e código
Envie um email para si mesmo (e para advogados de confiança) contendo:
- O hash SHA-256 do commit: `ca918407a5ac13241f0446caecd7c192cdb3a9c3`
- O arquivo `docs/legal/HASH-REGISTRO.md`
- Um ZIP do código-fonte
O timestamp do servidor de email é aceito como prova em muitos casos.

---

## COMO GERAR O HASH PARA APRESENTAR NO PROCESSO JUDICIAL

O hash que comprova a autoria é o **Git Commit Hash** combinado com os
**SHA-256 dos arquivos**. Veja como gerar:

### Hash do repositório atual (Git)
```bash
git rev-parse HEAD
# Resultado: ca918407a5ac13241f0446caecd7c192cdb3a9c3
```

### Hash de um arquivo específico (PowerShell)
```powershell
Get-FileHash -Path "arquivo.java" -Algorithm SHA256 | Select-Object Hash
```

### Hash de um arquivo específico (Bash/Linux)
```bash
sha256sum arquivo.java
```

### Hash de todos os arquivos fonte (PowerShell)
```powershell
Get-ChildItem -Recurse -File | Get-FileHash -Algorithm SHA256 | Export-Csv hashes.csv
```

---

## EVIDÊNCIAS DIGITAIS JÁ EXISTENTES (sem custo adicional)

Você **já possui** as seguintes provas de anterioridade:

| Evidência | Onde verificar | Validade |
|---|---|---|
| Commit GitHub `ca918407...` datado de 31/03/2026 | github.com/Luiz-code-dev/call_assistant | Alta |
| Histórico de commits imutável | `git log` | Alta |
| Metadados de arquivo no sistema operacional | `dir` / `ls -la` | Média |
| E-mails de desenvolvimento (se houver) | Caixa de entrada | Média |

---

## CHECKLIST FINAL ANTES DE INICIAR O PROCESSO JUDICIAL/INPI

- [ ] Hash do commit principal anotado: `ca918407a5ac13241f0446caecd7c192cdb3a9c3`
- [ ] Repositório GitHub **público** com data de commit visível
- [ ] `docs/legal/DECLARACAO-DE-AUTORIA.md` assinado (imprimir + assinar + reconhecer firma)
- [ ] `docs/legal/HASH-REGISTRO.md` impresso e arquivado
- [ ] `LICENSE` no repositório
- [ ] Código-fonte zipado guardado em local seguro (HD externo + nuvem)
- [ ] Registro em cartório (recomendado como primeiro passo — rápido e barato)
- [ ] Pedido de registro no INPI (e-Software)
- [ ] Consultar advogado especializado em Propriedade Intelectual de Software

---

*© 2026 Luiz Eduardo da Silva Dias Melo. Todos os direitos reservados.*
