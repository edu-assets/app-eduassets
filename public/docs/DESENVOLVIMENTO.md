# Desenvolvimento e validação do frontend

Este guia se aplica à aplicação de navegador em [`edu-assets/app-eduassets`](https://github.com/edu-assets/app-eduassets). O código da API é mantido separadamente em [`edu-assets/eduAssets`](https://github.com/edu-assets/eduAssets), no diretório `backend/`. O Markdown bilíngue canônico é mantido em [`edu-assets/docs-eduassets`](https://github.com/edu-assets/docs-eduassets).

## Requisitos

Use Node.js **22.12 ou mais recente** e npm. Uma API local/de teste em `127.0.0.1:3000` é necessária para fluxos autenticados e validações manuais completas.

## Instalação e configuração

```bash
npm ci
cp .env.example .env
```

No desenvolvimento local, deixe `VITE_API_BASE_URL` vazia para usar o proxy Vite. `VITE_DOCS_BASE_URL` vazia usa `https://docs.eduassets.tech` por padrão; o fallback Markdown local é usado somente se a requisição remota falhar ou não tiver sucesso:

```env
VITE_API_BASE_URL=
VITE_RFID_BRIDGE_ENABLED=false
VITE_DOCS_BASE_URL=
```

Execute a API separadamente a partir de `edu-assets/eduAssets`. Builds de produção exigem `VITE_API_BASE_URL` apontando para a origem da API; `VITE_DOCS_BASE_URL` é opcional e, quando omitida, usa `https://docs.eduassets.tech`. Nunca inclua senha, token, URL de banco ou outro segredo em variável `VITE_*`; o Vite incorpora esses valores nos arquivos públicos do navegador. Se a origem remota da documentação falhar, o modal usa o fallback local incluído no app.

## Execução e verificações

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
```

O servidor Vite escuta na porta **5173** e encaminha as rotas de API configuradas, `/ready` e o caminho WebSocket suportado para a API local na porta 3000. O build Cloudflare Pages de produção usa a raiz `/`, comando `npm run build` e diretório de saída `dist`. `public/_headers` é copiado para a saída. Esses comandos não fazem deploy nem se conectam a serviços de produção.

## Estrutura e convenções

`src/core/` contém serviços globais, cliente de API, autenticação, rotas, estado, localização e tema. `src/features/` é responsável pelos fluxos das telas; `src/shared/` contém UI reutilizável; `src/types/` centraliza contratos TypeScript. `src/core/docs/registry.ts` é a fonte única dos documentos exibidos em Sobre; o Markdown e os PDFs canônicos estão em `public/docs/` no repositório de documentação. A cópia no frontend é fallback temporário e não deve virar uma segunda fonte de edição.

Não trate proteções de interface como autorização: a fronteira de segurança é o backend. Use fixtures sintéticas e nunca faça commit de `.env`, cookies, JWTs, dumps do banco ou dados pessoais reais.

## Referências

Consulte o [README do repositório frontend](https://github.com/edu-assets/app-eduassets/blob/main/README_PT.md), [Arquitetura](ARQUITETURA.md), [Referência da API](REFERENCIA_API.md), [Modelo de dados](MODELO_DE_DADOS.md) e [Guia de implantação](GUIA_IMPLANTACAO.md).
