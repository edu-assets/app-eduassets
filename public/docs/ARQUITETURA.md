# Arquitetura — eduAssets

> Este documento descreve a arquitetura atualmente implementada no código-fonte. Não descreve uma topologia de produção implantada e não infere módulos ou recursos de banco que não estejam presentes no código.

## Fronteira do sistema e topologia

A aplicação tem um frontend no navegador, uma API HTTP, um banco PostgreSQL acessado pelo Prisma e um caminho RFID opcional:

```text
Navegador (servidor Vite ou assets compilados)
        │ HTTP / JSON
        ▼
Aplicação Express (backend :3000)
        │ Prisma
        ▼
PostgreSQL

Caminho RFID opcional:
Leitor RFID → bridge Python → POST /auth/rfid ──► backend
                                             │
                                             └─► WS /ws/rfid → abas abertas

Navegador/admin → POST 127.0.0.1:3001/provision → bridge Python → leitor RFID
```

O caminho RFID é opcional e desativado por padrão nas configurações de implantação. O login por senha continua sendo o caminho normal quando não há leitor conectado; o Compose público força RFID desligado e não publica `/ws`.

## Fronteiras de execução e portas

| Componente | Binding/configuração real | Responsabilidade |
|---|---|---|
| Backend | `PORT` ou `BACKEND_PORT` validados (nessa precedência), com padrão **3000**; `HOST` padrão `127.0.0.1` fora de produção e `0.0.0.0` quando `NODE_ENV=production` | API HTTP Express, health check, roteamento, autenticação e tratamento de upgrade WebSocket |
| Servidor de desenvolvimento Vite | **0.0.0.0:5173** | Serve o frontend e encaminha as rotas de API configuradas para `http://127.0.0.1:3000`; `/ws` é encaminhado com suporte WebSocket para `ws://127.0.0.1:3000` |
| Servidor de provisionamento RFID | **127.0.0.1:3001** | Endpoint HTTP local `/provision`, que enfileira a gravação de um token no leitor |
| WebSocket de login RFID | Caminho `/ws/rfid` no backend | Canal opcional de eventos do backend para abas do navegador; só é criado quando `RFID_BRIDGE_ENABLED=true` |

O proxy do Vite é configuração de desenvolvimento, não uma política de rede geral. Ele lista explicitamente as rotas da API (`/auth`, `/categorias`, `/equipamentos`, `/responsaveis`, `/usuarios`, `/emprestimos`, `/ocorrencias`, `/health`) e encaminha `/ws` separadamente.

## Frontend

O frontend é uma aplicação TypeScript construída com Vite e módulos ES nativos. O ponto de entrada é `frontend/src/main.ts`:

1. Em `DOMContentLoaded`, inicializa tema e internacionalização.
2. Executa a inicialização da autenticação e as cargas iniciais de equipamentos, responsáveis, empréstimos e ocorrências com `Promise.allSettled`.
3. Uma falha em uma carga inicial mostra um toast de erro; as demais inicializações continuam de forma independente, para que uma falha de feature não interrompa todas as outras.
4. Inicializa navegação, helpers de UI, timeout de sessão administrativa, módulos de feature, listener RFID, telas de perfil/segurança/configuração e documentação.

As camadas observadas do frontend são:

- **`core/`**: infraestrutura como cliente/configuração da API, stores de token e domínio, autenticação/timeout de sessão, layout, UI, utilitários HTML e listener RFID.
- **`features/`**: módulos de tela (autenticação, dashboard, empréstimos/devoluções, controle de equipamentos e cadastros, exportação, configuração, segurança, perfil e documentação) compostos por `main.ts`.
- O ponto de entrada não inicializa framework nem biblioteca global de estado. O estado de domínio é exposto por stores com funções `get...`, carga/mutação e `subscribe` para equipamentos, empréstimos, ocorrências, responsáveis, tema e i18n.

### Estado e fluxo da API

- `tokenStore` mantém o bearer token atual em memória e o espelha no `localStorage` sob `eduassets_token`. Limpar o token remove essa chave. O código não implementa fluxo de refresh token.
- `apiClient` lê `VITE_API_BASE_URL` por meio de `apiConfig`, adiciona `Authorization: Bearer <token>` quando disponível, envia JSON, interpreta erros estruturados da API e emite `eduassets:sessao-expirada` após um HTTP 401.
- Em desenvolvimento, uma base de API vazia torna as requisições relativas, permitindo que o proxy do Vite as encaminhe. O build de produção do frontend falha se `VITE_API_BASE_URL` estiver vazio.
- O listener RFID tem um gate próprio de build: conecta somente quando `VITE_RFID_BRIDGE_ENABLED=true`, deriva a URL WebSocket da base da API (ou do host atual do navegador), tenta reconectar após 3 segundos, armazena o token recebido, valida-o por `/auth/me` e recarrega a página.

### Contrato de segurança para HTML

`core/utils/html.ts` fornece o tagged template `html`. Valores interpolados passam por `escapeHtml`; `attr()` valida o nome do atributo e escapa seu valor. `raw()` é uma desativação explícita para HTML que o chamador já considera confiável. Portanto, usar `raw()` é uma fronteira deliberada de confiança, não um sanitizador automático.

## Backend

O backend é uma aplicação Node.js/Express em TypeScript estrito. `server.ts` carrega dotenv, cria um servidor HTTP em torno de `app`, anexa condicionalmente a bridge WebSocket RFID e escuta no host e na porta resolvidos.

### Pipeline da aplicação

`app.ts` monta o pipeline nesta ordem:

1. Headers de segurança do Helmet (`frameguard: deny`, política de recurso cross-origin `cross-origin`; CSP HTTP do backend é desabilitada nessa configuração).
2. CORS. O desenvolvimento local só é permissivo quando `NODE_ENV=development` e `HOST` é loopback. Fora desse caso, `CORS_ORIGIN` deve conter origens HTTP(S) exatas, sem path/query/fragment, separadas por vírgula ou o processo falha na inicialização. Produção também exige `TRUST_PROXY` explícito e validado.
3. Log de requisições.
4. `express.json({ limit: '100kb' })`.
5. Rate limiter global.
6. `/health` (liveness), `/ready` (prova de dependência de banco com timeout e resposta mínima), `/` e os routers da aplicação.
7. Handler de rota inexistente e handler centralizado de erros.

Os routers montados são `/auth`, `/categorias`, `/equipamentos`, `/responsaveis`, `/usuarios`, `/emprestimos` e `/ocorrencias`. GETs de categorias/equipamentos/empréstimos/ocorrências permitem auth opcional e aplicam DTOs minimizados a respostas anônimas; listagens de responsáveis/usuários exigem auth. Mutações têm autorização/validação na rota; a UI não é a fronteira de segurança.

### Autenticação e autorização

- O login por senha é `POST /auth/login`. O módulo JWT assina tokens HS256 com validade de **8 horas** e aceita somente HS256 na verificação. O payload contém `sub` numérico, `nivelAcesso` igual a `ADMINISTRADOR` ou `EDITOR` e `sessionVersion` não negativa.
- `JWT_SECRET` é obrigatório e deve ter pelo menos 32 caracteres; o processo falha durante a inicialização do módulo JWT se estiver ausente ou fraco.
- `requireAuth` exige `Authorization: Bearer ...`, verifica o token, confirma que o usuário ainda existe no PostgreSQL, compara `sessionVersion` do JWT ao valor no banco e atualiza o nível de acesso a partir do banco antes de colocá-lo em `req.user`.
- `requireAdmin` compõe `requireAuth` e exige que o nível atual no banco seja `ADMINISTRADOR`. O router de usuários é exclusivo de administradores. Mutações de empréstimos e ocorrências exigem `requireAuth` e validação. Senha atual incorreta em `PATCH /auth/senha` retorna erro de negócio sem encerrar a sessão.
- A inatividade de administradores é limitada a 30 minutos. O backend mantém a atividade em um `Map` na memória do processo, portanto o comportamento é consistente somente em uma instância do backend; escala horizontal exige estado compartilhado. O frontend também encerra a sessão de administrador após 30 minutos sem atividade e reage ao evento 401 do cliente da API.
- `POST /auth/logout` incrementa `sessionVersion` por usuário no PostgreSQL e revoga todos os JWTs anteriores da conta, inclusive entre instâncias. O navegador limpa o token imediatamente e envia a revogação em modo best-effort; se estiver offline/falhar, cópias continuam válidas até expirar. Troca de senha bem-sucedida também incrementa a versão e retorna JWT substituto para o navegador atual.
- `POST /auth/rfid` tem rate limit, valida a entrada e não é uma rota de navegador autenticada por JWT. O serviço exige origem loopback e comparação em tempo constante do header `X-RFID-Bridge-Secret` com `RFID_BRIDGE_SECRET`, aplica SHA-256 ao token RFID de 32 caracteres, procura `Usuario.rfidTokenHash` e publica um evento JWT assinado quando o cartão é reconhecido.

### Persistência

`prisma.ts` exporta um `PrismaClient` único e o helper `runTransaction`. Os limites padrão de uma transação interativa são **15.000 ms de timeout** e **5.000 ms de espera máxima**; o chamador pode fornecer um nível de isolamento.

O datasource Prisma é PostgreSQL; `DATABASE_URL` é obrigatório fora de `NODE_ENV=test` e `DIRECT_URL` é opcional, com fallback a `DATABASE_URL` definido em `prisma.config.ts`. O schema contém atualmente `Categoria`, `Equipamento`, `Responsavel`, `Usuario`, `Emprestimo`, `ItemEmprestimo` e `Ocorrencia`, além dos enums de acesso/status declarados no schema. Há índices de status para empréstimos e ocorrências, e a credencial RFID é armazenada como hash único opcional em `Usuario`.

Não há políticas RLS no schema Prisma. A autorização é implementada no código da aplicação e nos middlewares de rota; o schema não deve ser interpretado como isolamento por linha.

## Bridge RFID e comportamento WebSocket

### WebSocket do backend

`rfidBridge.ts` cria um servidor `ws` com `noServer: true` e trata upgrades HTTP somente para `/ws/rfid`. Aceita apenas `127.0.0.1`, `::1` ou o endereço loopback IPv4 mapeado `::ffff:127.0.0.1`. `publicarLoginRfid` transmite o evento de login assinado para os clientes loopback abertos.

A flag do backend é exata: **o servidor WebSocket só é anexado quando `RFID_BRIDGE_ENABLED === 'true'`**. O Compose de implantação força essa flag para `false` e não publica/proxy `/ws`. O listener frontend tem seu próprio gate `VITE_RFID_BRIDGE_ENABLED === 'true'`. Portanto, a entrega ao navegador exige as flags apropriadas nos dois lados; ativar somente a flag do Vite não cria um endpoint WebSocket no backend.

Loopback é uma verificação do endereço de origem, não substitui firewall, segmentação de rede ou configuração correta de reverse proxy. Um proxy deve preservar a fronteira de confiança pretendida e encaminhar `/ws` deliberadamente; a configuração do proxy do Vite, sozinha, não protege uma implantação acessível externamente.

### Serviço Python e provisionamento

`rpi/rfid/rfid_admin_bridge.py`:

- Envia leituras passivas como `POST {EDUASSETS_BACKEND_URL}/auth/rfid`, com o token em JSON hexadecimal e `X-RFID-Bridge-Secret`; a URL padrão do backend é `http://localhost:3000` e o timeout da requisição é de 3 segundos.
- Exige `RFID_BRIDGE_SECRET` com pelo menos 32 caracteres e compara o header de provisionamento com `hmac.compare_digest`.
- Executa o servidor HTTP de provisionamento em `127.0.0.1:3001`. `POST /provision` aceita um token de tamanho 32, enfileira-o, espera até 35 segundos pela operação do leitor e retorna `201`, `500` ou `504` para gravação, falha ou timeout.
- Usa o bloco `8` do leitor; a escrita espera até 30 segundos. As leituras passivas usam timeout de polling de 1 segundo e debounce físico de 1,5 segundo. `RFID_BACKEND` seleciona o backend do leitor e o padrão é `spi`.

A unidade systemd `eduassets-rfid.service` descreve uma instalação em `/opt/eduassets-rfid`, executada pelo usuário/grupo sem privilégios `eduassets`, carrega `/etc/eduassets/rfid_bridge.env`, exige modo `600` nesse arquivo, reinicia em caso de falha e aplica `NoNewPrivileges`, `PrivateTmp` e `UMask=0077`. O arquivo de unidade é uma definição de implantação; não prova que o serviço esteja instalado ou em execução.

## Configuração e limites

| Variável/configuração | Comportamento ou limite atual |
|---|---|
| `PORT`, `BACKEND_PORT` | Cada valor fornecido é validado; `PORT` vence; padrão `3000` somente se ambos estiverem ausentes |
| `HOST` | Host de binding do backend; padrão `127.0.0.1`, ou `0.0.0.0` em produção |
| `NODE_ENV` | Controla host/trust proxy de produção e a exceção de CORS para desenvolvimento local |
| `CORS_ORIGIN` | Origens HTTP(S) exatas separadas por vírgula; obrigatórias em produção e fora do desenvolvimento local explícito |
| `TRUST_PROXY` | Valor validado; obrigatório explicitamente em produção; `true` é rejeitado, padrão `false` fora de produção |
| `JWT_SECRET` | Obrigatório, mínimo de 32 caracteres |
| `DATABASE_URL`, `DIRECT_URL` | URL do banco requerida fora de teste; URL direta opcional e fallback ao `DATABASE_URL` |
| `RFID_BRIDGE_ENABLED` | Bridge WS do backend habilitada somente para o valor exato `true` |
| `VITE_API_BASE_URL` | Origem da API do frontend; vazia permitida em desenvolvimento, obrigatória no build de produção |
| `VITE_RFID_BRIDGE_ENABLED` | Listener RFID do frontend habilitado somente para o valor exato `true` |
| `EDUASSETS_BACKEND_URL` | URL do backend usada pela bridge Python; padrão `http://localhost:3000` |
| `RFID_BRIDGE_SECRET` | Obrigatória na bridge Python e no login RFID do backend; mínimo de 32 caracteres |
| `RFID_BACKEND` | Seletor do backend do leitor; padrão `spi` |
| Tamanho do JSON | Limite do corpo de requisição Express: `100kb` |
| Validade JWT | `8h` |
| Inatividade administrativa | `30min`, com estado na memória do processo (uma instância; escala horizontal requer compartilhamento) |
| Transação Prisma | `timeout=15s`, `maxWait=5s` por padrão |
| Rate limits | Em memória por instância: global 1.200/15 min por IP do cliente resolvido; login 10/15 min por IP + identificador de login SHA-256 e 300/15 min por IP; troca de senha 10/15 min por usuário autenticado; RFID login 60/15 min por IP; provisioning RFID 5/15 min por administrador + IP. Escala horizontal requer storage compartilhado. |

## Não-afirmações explícitas

- Este documento não afirma RLS, ambiente de produção implantado ou configuração de reverse proxy/firewall em produção.
- Restrições a `127.0.0.1` reduzem os endereços de origem aceitos, mas não substituem política de rede nem configuração de proxy.
- O proxy Vite é somente de desenvolvimento. Templates Cloudflare Pages + Docker/Nginx/Cloudflare foram adicionados, mas seguem não configurados e não verificados.
- RFID é opcional, e a aplicação continua utilizável por autenticação com senha sem o serviço do leitor.
