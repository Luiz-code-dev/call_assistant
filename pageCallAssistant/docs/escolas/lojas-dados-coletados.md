# Dados coletados — formulários de privacidade (Apple App Privacy / Google Data Safety)

Use esta lista ao preencher os formulários das lojas do app **SpeakFlow Escolas** (`br.com.speakflow.escolas`).

## Resumo
- **Não usado para rastreamento (tracking).** Sem publicidade, sem SDK de anúncios, sem analytics de terceiros, sem identificadores do aparelho (AAID/IDFA/IMEI/MAC).
- **Criptografado em trânsito** (HTTPS). `ITSAppUsesNonExemptEncryption = false`.
- **Exclusão de conta** disponível: https://www.speakflow.ia.br/escola/excluir-conta

## Por tipo de dado

| Dado | Quem | Finalidade | Vinculado à identidade | Rastreamento |
|---|---|---|---|---|
| Nome | Equipe, responsável | Funcionalidade do app, identificação na escola | Sim | Não |
| E-mail e/ou telefone | Equipe, responsável | Login, convites, resumo semanal | Sim | Não |
| Conteúdo do usuário (texto e **áudio** das respostas) | Aluno | Correção pedagógica pela IA (sem nome/matrícula) | Sim | Não |
| Dados de uso / diagnóstico do app | Todos | Funcionamento e melhoria do serviço | Sim | Não |
| Matrícula e data de nascimento do aluno | Aluno | Vínculo com a turma e acesso da família | Sim | Não |

## NÃO coletamos
- CPF do aluno, foto, localização.
- Contatos, fotos/galeria, armazenamento do aparelho.
- Identificadores de publicidade ou do dispositivo.

## Apple — App Privacy
- Tipos: Contact Info (nome, e-mail/telefone), User Content (textos/áudios), Identifiers (apenas conta interna, não de aparelho), Usage Data, Diagnostics.
- "Used to Track You": **Não**.
- Privacy Manifest (`PrivacyInfo.xcprivacy`): gerado pelo Expo; conferir motivos das APIs após o build.

## Google — Data Safety
- Coleta: nome, e-mail/telefone, conteúdo do usuário (texto/áudio), uso/diagnóstico.
- Criptografado em trânsito: **Sim**.
- Usuário pode pedir exclusão: **Sim** (link acima).
- Público-alvo inclui menores de 13 → **Política de Famílias** (sem anúncios/identificadores).
