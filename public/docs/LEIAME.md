# Frontend do eduAssets

[English](README.md) · [README principal em português](https://github.com/edu-assets/app-eduassets/blob/main/README_PT.md)

> **Status: Beta.** Este repositório contém somente a aplicação de navegador. A API Node.js e a integração com o banco são mantidas em [`edu-assets/eduAssets`](https://github.com/edu-assets/eduAssets).

## Escopo

O frontend é uma aplicação single-page em TypeScript/Vite para inventário e empréstimo de equipamentos escolares do eduAssets. Oferece fluxos de inventário e empréstimo, devoluções, ocorrências, telas administrativas, exportações, localização em português/inglês, tema e acesso de convidado somente leitura. A autorização continua sendo aplicada pela API do backend, não pelos controles do navegador.

## Uso local

Requisitos: Node.js **22.12 ou mais recente** e npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Mantenha `VITE_API_BASE_URL` vazia no desenvolvimento local para que o Vite encaminhe as requisições da API para `127.0.0.1:3000`; execute a API separadamente a partir do repositório do backend. Mantenha `VITE_RFID_BRIDGE_ENABLED=false`, a menos que uma configuração RFID isolada esteja pronta. Valores `VITE_*` são configurações públicas de build; nunca inclua segredos nelas.

Execute as verificações do frontend com `npm run typecheck`, `npm test` e `npm run build`.

## Implantação

O frontend de produção é hospedado no Cloudflare Pages a partir de `edu-assets/app-eduassets`, com raiz `/`, comando `npm run build` e diretório de saída `dist`. As requisições de produção usam `https://api.eduassets.tech`. Consulte [Hospedagem e operação](Hospedagem.md) e o [guia de implantação](GUIA_IMPLANTACAO.md).

## Guias

- [Manual do usuário](MANUAL_USUARIO.md) · [User manual](USER_MANUAL.md)
- [Arquitetura](ARQUITETURA.md) · [Architecture](ARCHITECTURE.md)
- [Referência da API](REFERENCIA_API.md) · [API reference](API_REFERENCE.md)
- [Desenvolvimento](DESENVOLVIMENTO.md) · [Development](DEVELOPMENT.md)
- [Operação e recuperação](OPERACAO_E_RECUPERACAO.md) · [Operations and recovery](OPERATIONS_AND_RECOVERY.md)
- [Histórico de alterações](CHANGELOG.md) · [Changelog](CHANGELOG_EN.md)
