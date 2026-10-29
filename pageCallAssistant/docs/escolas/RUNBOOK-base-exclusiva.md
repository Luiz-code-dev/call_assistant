# RUNBOOK — Base Exclusiva por Rede

## Objetivo
Mover uma rede do banco compartilhado (`db01`) para um banco dedicado (ex.: `escolas-dados-prefeitura-x`), sem interrupção de dados e com janela de manutenção mínima.

---

## Pré-requisitos

1. **Railway**: criar o novo banco Postgres e renomear para o padrão `escolas-dados-<cliente>`.
2. **Variável de ambiente**: adicionar por referência no serviço do site:
   ```
   ESCOLAS_DB_<CLIENTE>_URL = ${{escolas-dados-<cliente>.DATABASE_URL}}
   ```
3. **TenantDatabase no catálogo**: inserir uma linha na tabela `TenantDatabase`:
   ```sql
   INSERT INTO "TenantDatabase" (key, "envVar", region, "isShared", "isActive")
   VALUES ('pref-exemplo', 'ESCOLAS_DB_PREF_EXEMPLO_URL', 'railway-us', false, true);
   ```
4. **Gerar o cliente Prisma** (se necessário) e fazer deploy para que a variável esteja disponível.

---

## Passos da migração

### 1. Identificar a rede

```bash
# Ver ID da rede no catálogo:
psql $ESCOLAS_CATALOG_URL -c "SELECT id, name, \"dbKey\", status FROM \"Tenant\";"
```

### 2. Executar o script de migração

```bash
# Em homologação / staging primeiro:
node scripts/escolas/mover-rede.mjs --rede <tenantId> --para <dbKey>

# Exemplo real:
node scripts/escolas/mover-rede.mjs --rede pref-salvador-001 --para pref-salvador
```

O script realiza automaticamente:
- Marca a rede como `MIGRATING` (login retorna mensagem amigável)
- Roda `prisma migrate deploy` no destino
- Copia todas as linhas na ordem correta de dependências
- Verifica as contagens tabela a tabela
- Atualiza o `dbKey` no catálogo
- Restaura o status para `ACTIVE`

**Duração estimada**: 1–5 minutos para redes com até 10.000 alunos.

### 3. Verificar após migração

```bash
# Conferir que o catálogo foi atualizado:
psql $ESCOLAS_CATALOG_URL -c \
  "SELECT id, name, \"dbKey\", status FROM \"Tenant\" WHERE id = '<tenantId>';"

# Testar login com uma conta da rede
```

### 4. Limpar origem (opcional, após 7 dias)

```bash
node scripts/escolas/mover-rede.mjs \
  --rede <tenantId> --para <dbKey-destino> \
  --limpar-origem --forcar
```

> **Atenção**: `--forcar` apaga permanentemente os dados na origem. Execute apenas após confirmar que o destino está íntegro e o app está funcionando.

---

## Mover Demo A de db01 para db02 (teste)

```bash
node scripts/escolas/mover-rede.mjs --rede demo-rede-a --para db02
# Testa login e funcionalidade
# Para reverter:
node scripts/escolas/mover-rede.mjs --rede demo-rede-a --para db01
```

---

## Rollback

Se algo der errado, o script restaura automaticamente o status para `ACTIVE` (origem). Os dados na origem permanecem intocados. Basta corrigir o problema e reexecutar.

---

## Checklist pós-migração

- [ ] Login de usuário da rede funciona normalmente
- [ ] Aluno consegue praticar e ver dados corretos
- [ ] db01 NÃO recebe novas linhas desta rede
- [ ] Contagens batem entre origem (histórico) e destino (ativo)
- [ ] `git diff --stat` sem arquivos `speakflowMobile/`
- [ ] BNCC (1.304 habilidades) presente na nova base

---

## Contratar base exclusiva do zero (sem migração)

1. Criar Postgres no Railway → renomear → adicionar variável
2. Inserir linha em `TenantDatabase`
3. Inserir linha em `Tenant` com o novo `dbKey`
4. Executar `npm run db:migrate:escolas` (aponta para a nova base via `ESCOLAS_DB_URL`)
5. Executar `node scripts/escolas/bncc-import.mjs` para importar BNCC
6. Executar `npm run escolas:seed-demo` se for rede de demonstração
7. Criar usuário gestor com `npm run escola:admin-master`
