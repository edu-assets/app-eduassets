# Arquitetura — eduAssets

## Visão geral

O eduAssets é dividido em três camadas independentes que se comunicam por HTTP/WebSocket:

```
Cartão RFID → Leitor MFRC522 → Serviço Python (bridge) → Backend (Express) → Frontend (Vite/TS)
                                                              ↕
                                                        PostgreSQL (Prisma)
```

Veja o diagrama de componentes e o diagrama de sequência do login RFID nas imagens desta seção.

## Frontend

Arquitetura **feature-first e em camadas**, totalmente em TypeScript, sem framework — apenas Vite + módulos ES.

```
frontend/src/
├── core/       infraestrutura: API client, auth guards, layout, state stores, UI primitives, utils
├── features/   uma pasta por tela (dashboard, emprestimo, devolucao, controle, cadastros, exportar, config, seguranca, perfil, auth)
├── shared/     componentes reutilizáveis não pertencentes a nenhuma feature específica
└── types/      interfaces TypeScript centralizadas
```

Cada `feature/` segue o padrão de 4 arquivos, com fluxo de dados unidirecional:

| Arquivo | Responsabilidade |
|---|---|
| `index.ts` | apenas inicializa (busca elementos do DOM, monta estado, chama `attachEvents`) |
| `events.ts` | escuta eventos de UI e orquestra chamadas a `service.ts` |
| `service.ts` | regras de negócio e chamadas de API — nunca toca o DOM |
| `render.ts` / `templates.ts` | `templates.ts` gera apenas strings HTML; `render.ts` atualiza o DOM |

Regra de ouro: **`events → service → render`**, nunca `events → render` diretamente para operações de negócio. Features não importam umas das outras — lógica compartilhada vai para `core/` ou `shared/`.

Toda geração de HTML dinâmico passa pelo helper `html\`\`` (tagged template com auto-escape), com `raw()` como escape hatch explícito para HTML já confiável.

O estado global usa um padrão simples de *store* (`subscribe`/`notify`) por entidade — sem Redux/Zustand — mantendo o app leve e sem dependências externas de state management.

## Backend

Node.js + Express 5, TypeScript estrito, Prisma como ORM sobre PostgreSQL.

```
backend/src/
├── routes/       um router por entidade (equipamentos, emprestimos, ocorrencias, usuarios...)
├── middleware/    auth (requireAuth/requireAdmin), security (helmet, rate limit), errorHandler
├── lib/           jwt, estoque (lógica atômica de estoque), validate, adminActivity, rfidBridge/Token
└── schemas/       validação de entrada com Zod, em toda rota de escrita
```

Pontos importantes:

- **Autenticação**: JWT assinado no login, validado em todo endpoint mutável via `requireAuth`/`requireAdmin`.
- **Estoque atômico**: decrementos usam `updateMany` com condição `WHERE quantidadeDisponivel >= quantidade`, evitando condição de corrida sem lock explícito. Erros de estoque insuficiente lançam `EstoqueInsuficienteError`, tratado de forma centralizada.
- **WebSocket loopback-only** (`/ws/rfid`): usado apenas para propagar login automático por cartão para as abas abertas no mesmo dispositivo — nunca exposto externamente.
- **Tratamento de erro centralizado**: `errorHandler.ts` mapeia códigos conhecidos do Prisma (registro não encontrado, referência inválida, valor duplicado) para respostas HTTP consistentes.

## Bridge RFID (opcional)

Serviço Python que roda no Raspberry Pi (SPI nativo) ou é retransmitido via Arduino Nano (serial USB), atrás de uma interface comum `RfidReaderBase`. Comunica-se com o backend por uma rota HTTP protegida por segredo compartilhado e restrita a conexões loopback (`127.0.0.1`) — o leitor físico e o backend precisam estar na mesma máquina (ou o bridge acessando `localhost`).

## Decisões arquiteturais notáveis

- **Sem framework de frontend (v1)**: escolha deliberada para portfólio — demonstra fundamentos de DOM, TypeScript e arquitetura sem depender de React/Vue. A migração para React + TS está planejada para v2, reaproveitando as camadas `core`/`features`/`shared` já existentes (só a camada de renderização muda).
- **Guest Mode como padrão**: como o projeto é público, toda leitura é aberta; apenas escrita exige autenticação — reforçado tanto na UI (`data-requires-auth`/`data-requires-admin`) quanto no backend (a UI é só UX, o backend é a fronteira de segurança real).
- **Hardware desacoplado da aplicação principal**: o RFID é 100% opcional — o sistema funciona inteiramente por senha sem qualquer leitor conectado.
