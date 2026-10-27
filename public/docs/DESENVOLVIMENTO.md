# Desenvolvimento e validação do frontend

Este repositório contém a aplicação de navegador do eduAssets. O código-fonte da API é mantido separadamente em [`edu-assets/eduAssets`](https://github.com/edu-assets/eduAssets), no diretório `backend/`. Os dois repositórios podem ser instalados e implantados independentemente.

## Requisitos

- Node.js **22.12 ou mais recente** e npm;
- Git;
- uma API local/de teste em `127.0.0.1:3000` para fluxos autenticados e validações manuais completas.

## Instalação e configuração

```bash
npm ci
cp .env.example .env
```

Use a configuração local padrão para que o Vite encaminhe as requisições para a API:

```env
VITE_API_BASE_URL=
VITE_RFID_BRIDGE_ENABLED=false
```

Execute a API separadamente a partir do repositório `edu-assets/eduAssets`. A configuração local do backend, PostgreSQL e migrations estão documentados nesse repositório e na [Referência da API](REFERENCIA_API.md). Nunca inclua senha, token, URL de banco ou outro segredo em variável `VITE_*`; o Vite incorpora esses valores nos arquivos públicos do navegador.

## Execução local

```bash
npm run dev
```

O servidor de desenvolvimento Vite escuta na porta **5173**. Seu proxy encaminha as rotas da API e o caminho WebSocket suportado para `127.0.0.1:3000`. `VITE_API_BASE_URL` pode apontar para outra origem de API em um preview, mas é configuração pública e deve corresponder à política CORS dessa API.

## Verificações

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` grava o site estático de produção em `dist/`; `public/_headers` é copiado para a saída. Essas verificações não fazem deploy nem se conectam a serviços de produção.

## Estrutura e convenções

- `src/core/` — cliente de API, autenticação, rotas, estado, localização, tema e utilitários globais;
- `src/features/` — telas e fluxos organizados por funcionalidade;
- `src/shared/` — elementos de interface e utilitários compartilhados;
- `src/types/` — contratos TypeScript;
- `public/docs/` — Markdown público exibido pela Central de Documentação;
- `src/core/docs/registry.ts` — fonte única dos itens do painel Sobre e do modal de documentação.

Não trate proteções de interface como autorização: a fronteira de segurança é o backend. Siga `skills.md` e `architectureskills.md` compartilhados no contexto do projeto.

## Checklist de contribuição

Antes de propor alterações, execute as verificações relevantes acima e `git diff --check`; registre validações que não puderam ser feitas (por exemplo, navegador, proxy real ou hardware RFID). Use dados sintéticos. Nunca faça commit de `.env`, cookies, JWTs, dumps do banco ou dados pessoais reais.

## Referências

Consulte também [README](README.md), [Arquitetura](ARQUITETURA.md), [Referência da API](REFERENCIA_API.md), [Modelo de dados](MODELO_DE_DADOS.md) e o [guia de implantação](GUIA_IMPLANTACAO.md).
