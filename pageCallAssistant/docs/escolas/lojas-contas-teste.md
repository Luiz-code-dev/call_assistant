# Contas de teste para a revisão das lojas (Apple / Google)

Rede fictícia **"Vila Esperança (Demonstração)"** com dados de exemplo (trilhas, retornos, evolução).

> As **senhas/PIN NÃO ficam no Git**. Preencha-os diretamente nos campos de "informações para revisão" de cada loja (App Store Connect / Google Play Console).

## Contas

| Perfil | Como entrar | Identificador (preencher na loja) |
|---|---|---|
| Professor | Equipe escolar · e-mail + senha | e-mail: `prof.demo@speakflow.escola` · senha: _(preencher na loja)_ |
| Responsável | Sou responsável · código de família + data de nascimento (ou e-mail + senha) | e-mail: `responsavel.demo@speakflow.escola` · senha: _(preencher na loja)_ |
| Aluno | Sou aluno · código da turma + matrícula + PIN | turma: `SF2027-6A` · matrícula: _(preencher)_ · PIN: _(preencher na loja)_ |

## Notas para o revisor (modelo)
> App para escolas. O acesso é criado pela escola (não há cadastro público nem compras no app).
> Use as contas de teste acima. O perfil "Sou responsável" só aparece quando `familyEnabled=true` na config do servidor.
> O app é usado por professores, responsáveis e alunos; as telas de gestão (secretaria/coordenação) ficam na web.

## Como preparar os dados de exemplo
1. Garantir a rede demo via `prisma/seed-escolas.ts` (já cria escolas, turmas e 60 alunos).
2. Gerar o **código de família** de um aluno (ficha do aluno → "Gerar código de família") e anotar para a conta de responsável.
3. Conferir que há pelo menos uma **trilha** atribuída e um **retorno** de exemplo para as telas não ficarem vazias na revisão.
