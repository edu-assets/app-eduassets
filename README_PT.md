# Frontend do eduAssets

[English](README.md) · [Repositório da API/backend](https://github.com/edu-assets/api-eduassets)

> **Status: Versão oficial 1.0.1.** Este repositório contém a aplicação web do eduAssets. É uma aplicação single-page em Vite/TypeScript; a API e o banco de dados são mantidos separadamente.

## Visão geral

O frontend oferece fluxos de inventário e empréstimo de equipamentos escolares, incluindo consultas de equipamentos e estoque, registro de empréstimos e devoluções, gerenciamento de ocorrências, telas administrativas, exportações CSV/Excel/PDF, acesso de convidado somente leitura e interface para recursos opcionais relacionados a RFID. Também oferece interface em português e inglês e persistência do tema claro/escuro.

A aplicação usa módulos TypeScript organizados por funcionalidade e renderização nativa do DOM. O backend continua sendo a fronteira de segurança: proteções de rotas e controles desabilitados no frontend são medidas de usabilidade, não autorização. Em produção, o app se comunica com `https://api.eduassets.tech` por sessões exclusivamente em cookie (`HttpOnly`, `SameSite=Lax` e `Secure` em HTTPS); o navegador nunca armazena JWT em `localStorage`. Se não for possível confirmar suporte a cookie de sessão, o login falha fechado.

## Estrutura do repositório

- `src/core/` — serviços globais, cliente de API, rotas, estado, tema e localização;
- `src/features/` — telas e fluxos específicos de cada funcionalidade;
- `src/shared/` — interface e utilitários compartilhados;
- `src/types/` — tipos TypeScript compartilhados;
- `public/` — arquivos estáticos, cabeçalhos de segurança e documentação do projeto;
- `scripts/` — utilitários de assets e ícones do frontend.

## Requisitos

- Node.js **22.12 ou mais recente** e npm;
- uma API eduAssets em execução para usar os fluxos completos localmente. Na configuração atual, o Vite encaminha os caminhos da API para `http://127.0.0.1:3000`.

## Desenvolvimento local

```bash
npm ci
cp .env.example .env
npm run dev
```

No Windows PowerShell, use `Copy-Item .env.example .env` em vez de `cp`. Mantenha a URL base da API vazia no desenvolvimento local para que o Vite utilize seu proxy:

```env
VITE_API_BASE_URL=
VITE_RFID_BRIDGE_ENABLED=false
```

Execute a API separadamente. Seu código-fonte está atualmente no diretório `backend/` de [`edu-assets/api-eduassets`](https://github.com/edu-assets/api-eduassets). Não coloque senhas, tokens ou outros segredos em variáveis `VITE_*`; esses valores ficam públicos nos arquivos compilados para o navegador.

## Comandos disponíveis

```bash
npm run dev        # Servidor Vite em http://localhost:5173
npm run typecheck  # Verificação TypeScript
npm test           # Testes do frontend
npm run build      # Build de produção em dist/
npm run preview    # Pré-visualização local da build de produção
```

## Deploy no Cloudflare Pages

O site de produção é servido em `https://app.eduassets.tech`. Para o projeto Cloudflare Pages conectado a este repositório, configure:

- Branch de produção: `main`;
- Diretório raiz: `/` (raiz do repositório);
- Comando de build: `npm run build`;
- Diretório de saída: `dist`;
- Node.js: `22.13.0` ou outra versão compatível que satisfaça `>=22.12.0`.

Configure estas variáveis públicas de build para Production e Preview conforme necessário:

```env
VITE_API_BASE_URL=https://api.eduassets.tech
VITE_RFID_BRIDGE_ENABLED=false
```

O arquivo `public/_headers` fornece cabeçalhos de segurança estáticos, copiados para a saída da build. O build do frontend não implanta nem configura a API, o banco de dados, o DNS ou as configurações da conta Cloudflare.

## Documentação

Os guias bilíngues canônicos são mantidos em [`edu-assets/docs-eduassets`](https://github.com/edu-assets/docs-eduassets/tree/main/public/docs) e hospedados em https://docs.eduassets.tech. O modal Sobre carrega Markdown de um commit imutável, fixado em `src/core/docs/docsService.ts`, por `raw.githubusercontent.com`; `VITE_DOCS_BASE_URL` não é suportada. O Markdown em `public/docs/` é fallback, usado somente quando a requisição fixada falha ou retorna resposta sem sucesso. A CSP de produção deve permitir a API e `https://raw.githubusercontent.com`.

Guias principais no repositório central:

- [Manual do usuário](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/MANUAL_USUARIO.md) · [User manual](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/USER_MANUAL.md)
- [Arquitetura](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/ARQUITETURA.md) · [Architecture](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/ARCHITECTURE.md)
- [Referência da API](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/REFERENCIA_API.md) · [API reference](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/API_REFERENCE.md)
- [Desenvolvimento](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/DESENVOLVIMENTO.md) · [Development](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/DEVELOPMENT.md)
- [Implantação](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/GUIA_IMPLANTACAO.md) · [Deployment](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/DEPLOYMENT.md)
- [Hospedagem](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/Hospedagem.md) · [Hosting](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/Hosting.md)
- [Operação e recuperação](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/OPERACAO_E_RECUPERACAO.md) · [Operations and recovery](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/OPERATIONS_AND_RECOVERY.md)
- [Histórico de alterações](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/CHANGELOG.md) · [Changelog](https://github.com/edu-assets/docs-eduassets/blob/main/public/docs/CHANGELOG_EN.md)

Para alterações na API e na infraestrutura, consulte o código do backend e sua documentação em [`edu-assets/api-eduassets`](https://github.com/edu-assets/api-eduassets).
