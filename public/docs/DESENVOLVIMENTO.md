# Desenvolvimento e validação — eduAssets

> Guia para quem trabalha no checkout do repositório. Os valores de ambiente são locais; nunca copie segredos de produção para o Git, screenshots, testes ou documentação.

## Requisitos

- Node.js **22.12 ou superior** e npm;
- PostgreSQL local ou ambiente de teste descartável para executar a API e as migrações;
- Git; Docker apenas para os fluxos de imagem/Compose e validação de deployment.

O monorepo contém três projetos npm: a raiz (utilitário `concurrently`), `backend` e `frontend`. Instale cada árvore separadamente:

```bash
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

## Configuração local

Copie `.env.example` para `backend/.env` e preencha valores locais. Configure `DATABASE_URL` para um banco PostgreSQL de desenvolvimento e `JWT_SECRET` como um valor aleatório com pelo menos 32 caracteres. `DIRECT_URL` é opcional e usa `DATABASE_URL` como fallback. Não use banco de produção para testes ou migrações exploratórias.

Para uma build do frontend independente do proxy Vite, configure `VITE_API_BASE_URL` com a origem da API local (por exemplo, `http://127.0.0.1:3000`). A flag RFID permanece desligada por padrão; não a habilite sem uma rede, bridge e segredo isolados.

## Executar

Na raiz, `npm run dev` inicia frontend e API juntos. Em separado, use:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

O Vite usa a porta 5173 e encaminha a API local para o backend na porta 3000. O backend também aceita `PORT`, com precedência sobre `BACKEND_PORT`. O assistente local de provisionamento RFID, quando instalado separadamente, usa `127.0.0.1:3001`; não é a API web.

## Testes, tipos e build

```bash
# Frontend
npm --prefix frontend test
npm --prefix frontend run typecheck
npm --prefix frontend run build

# Backend (carrega os valores locais de backend/.env)
JWT_SECRET='substitua-por-um-segredo-local-com-32-caracteres' npm --prefix backend test
npm --prefix backend run build

# Build combinado da raiz (backend antes do frontend)
npm run build
```

Os testes de integração do backend e as migrações precisam de PostgreSQL descartável configurado conforme os scripts e jobs de CI. Não rode `migrate:deploy`, `db:seed` ou testes de integração contra a base operacional. `npm run build` inclui `prisma generate`; gerar o cliente não substitui executar migrações no banco.

## Estrutura e convenções

- `frontend/src/core`: infraestrutura compartilhada, estado, API, autenticação, roteamento e utilitários.
- `frontend/src/features`: módulos de interface e fluxos de negócio, organizados por feature.
- `frontend/src/shared`: componentes e helpers reutilizáveis entre features.
- `backend/src/routes`, `middlewares`, `controllers`, `services`, `schemas` e `lib`: transporte HTTP, autorização, validação e regras do backend.
- `backend/prisma`: schema, migrations e seed.
- `rpi/rfid`: bridge física opcional; requer testes no hardware/OS de destino.
- `frontend/public/docs`: Markdown público consumido pela Central de Documentação. Ao adicionar um documento, registre-o em `frontend/src/core/docs/registry.ts`; a página Sobre e o modal usam o mesmo registry.

Siga também as instruções compartilhadas `skills.md` e `architectureskills.md` do projeto. Evite duplicar regras de autorização no frontend: o backend é a fronteira de segurança.

## Pull requests e evidências

Antes de enviar alterações, execute as checagens pertinentes acima, revise `git diff --check` e descreva testes que não puderam ser executados (por exemplo, hardware RFID, proxy real, restauração de backup ou provedor externo). Use dados sintéticos nos fixtures. Não inclua `.env`, dumps, cookies, JWTs ou dados pessoais reais.

## Referências

Consulte também [README em português](LEIAME.md), [Arquitetura](ARQUITETURA.md), [Referência da API](REFERENCIA_API.md), [Modelo de Dados](MODELO_DE_DADOS.md) e [Guia de implantação](GUIA_IMPLANTACAO.md).
