# Frontend do eduAssets

[English](README.md) · [Repositório da API/backend](https://github.com/edu-assets/eduAssets)

> **Status: Beta.** Este repositório contém a aplicação web do eduAssets. É uma aplicação single-page em Vite/TypeScript; a API e o banco de dados são mantidos separadamente.

## Visão geral

O frontend oferece fluxos de inventário e empréstimo de equipamentos escolares, incluindo consultas de equipamentos e estoque, registro de empréstimos e devoluções, gerenciamento de ocorrências, telas administrativas, exportações CSV/Excel/PDF, acesso de convidado somente leitura e interface para recursos opcionais relacionados a RFID. Também oferece interface em português e inglês e persistência do tema claro/escuro.

A aplicação usa módulos TypeScript organizados por funcionalidade e renderização nativa do DOM. O backend continua sendo a fronteira de segurança: proteções de rotas e controles desabilitados no frontend são medidas de usabilidade, não autorização. Em produção, o app se comunica com a API em `https://api.eduassets.tech`; quando suportado, a autenticação usa o fluxo seguro de sessão do backend.

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

Execute a API separadamente. Seu código-fonte está atualmente no diretório `backend/` de [`edu-assets/eduAssets`](https://github.com/edu-assets/eduAssets). Não coloque senhas, tokens ou outros segredos em variáveis `VITE_*`; esses valores ficam públicos nos arquivos compilados para o navegador.

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

Os guias bilíngues completos estão em [`public/docs/`](public/docs/):

- [Manual do usuário](public/docs/MANUAL_USUARIO.md) · [User manual](public/docs/USER_MANUAL.md)
- [Arquitetura](public/docs/ARQUITETURA.md) · [Architecture](public/docs/ARCHITECTURE.md)
- [Referência da API](public/docs/REFERENCIA_API.md) · [API reference](public/docs/API_REFERENCE.md)
- [Desenvolvimento](public/docs/DESENVOLVIMENTO.md) · [Development](public/docs/DEVELOPMENT.md)
- [Implantação](public/docs/GUIA_IMPLANTACAO.md) · [Deployment](public/docs/DEPLOYMENT.md)
- [Operação e recuperação](public/docs/OPERACAO_E_RECUPERACAO.md) · [Operations and recovery](public/docs/OPERATIONS_AND_RECOVERY.md)
- [Histórico de alterações](public/docs/CHANGELOG.md) · [Changelog](public/docs/CHANGELOG_EN.md)

Para alterações na API e na infraestrutura, consulte o código do backend e sua documentação em [`edu-assets/eduAssets`](https://github.com/edu-assets/eduAssets).
