# eduAssets

<div align="center">
  <img src="/assets/img/eduAssets_banner.png" alt="Banner do EduAssets" width="100%">
</div>

> **Status: Beta (v0.9.9).** As funcionalidades principais — incluindo autenticação com dois níveis de acesso, login por cartão RFID físico, Modo Convidado, Modo Escuro e exportação de dados — estão implementadas de ponta a ponta em um frontend e backend totalmente em TypeScript. O projeto está em polimento final antes da primeira implantação pública. Ajustes pontuais ainda são esperados antes de uma versão estável 1.0.

## Visão Geral

**eduAssets** é um sistema de gestão de empréstimos e inventário de equipamentos escolares, construído como projeto de portfólio. Ele é voltado ao uso operacional diário por um pequeno grupo de usuários (administradores e editores do sistema), e suas decisões de design priorizam fluxos de trabalho de baixo atrito e alta frequência em vez de rastreamento granular por unidade.

O sistema cobre cinco operações principais:
- Registro de novos empréstimos de equipamentos
- Processamento de devoluções
- Monitoramento de estoque e histórico de empréstimos via dashboard, com busca/filtro nas duas visões
- Acompanhamento de ocorrências em equipamentos (observações, manutenções e quebras) através de um painel de controle dedicado, com busca/filtro
- Exportação do histórico de empréstimos/devoluções e do inventário de equipamentos em CSV, Excel ou PDF

Como o eduAssets é destinado a ficar publicamente acessível como peça de portfólio, ele vem com um **Modo Convidado**: qualquer pessoa pode abrir a implantação ao vivo e explorar a aplicação completa em modo somente leitura, enquanto todas as ações que alteram dados ficam restritas a usuários autenticados. O acesso autenticado, por sua vez, é dividido em dois níveis (Administrador e Editor) com permissões diferentes — veja [Autenticação e Níveis de Acesso](#autenticação-e-níveis-de-acesso).

A interface também suporta **Modo Escuro**, com detecção automática do esquema de cores do sistema operacional, alternância manual (Claro / Escuro / Sistema) e persistência da preferência escolhida entre sessões.

Como extensão opcional de hardware, o eduAssets suporta **login por cartão RFID**: um Raspberry Pi (ou Arduino Nano) rodando um pequeno serviço de ponte pode ler um cartão RFID físico e autenticar o usuário correspondente automaticamente em todas as abas do navegador abertas, sem digitar senha. Veja [Login por Cartão RFID](#login-por-cartão-rfid).

As decisões de UI/UX seguem um conjunto interno de diretrizes de design focado em minimalismo funcional: sem elementos decorativos sem valor informativo, sem conteúdo redundante entre painéis, e sem texto autopromocional.

## Stack Tecnológica

### Frontend
- **TypeScript** (migrado integralmente do código-base original em JavaScript puro), compilado via [Vite](https://vitejs.dev/), ES Modules, sem configuração de bundler separada além do `vite.config.js`
- **Arquitetura feature-first** (veja [Arquitetura](#arquitetura) abaixo) — já implementada, não apenas planejada
- [flatpickr](https://flatpickr.js.org/) para manipulação de entrada de data e hora
- [SheetJS (xlsx)](https://sheetjs.com/) e [jsPDF](https://github.com/parallax/jsPDF) + `jspdf-autotable`, carregados via CDN em `index.html`, para exportação em Excel e PDF
- Material Symbols Outlined para ícones, com subconjunto (subset) gerado em tempo de build via script customizado (`scripts/extract-icons.mjs` + `scripts/subset-icons.mjs`) para manter a fonte de ícones pequena
- Temas implementados puramente com CSS Custom Properties (`base/variables.css`), escopados via `html[data-theme]` — sem duplicação de estilos por componente entre os temas Claro e Escuro
- Um cliente WebSocket nativo leve (`core/rfid/rfidListener.ts`) que escuta eventos de login RFID enviados pelo backend e recarrega a sessão automaticamente

### Frontend (planejado)
- Migração para React + TypeScript (v2), aproveitando a estrutura em camadas feature-first atual para que a migração toque apenas a camada de renderização

### Backend
- Node.js + **Express 5**
- **Prisma ORM** 6, PostgreSQL, hospedado via Supabase
- **TypeScript**, modo estrito (strict)
- Autenticação baseada em JWT (`jsonwebtoken`), hash de senha com bcrypt
- **`ws`** para uma ponte WebSocket restrita a loopback (`/ws/rfid`) que envia eventos de login RFID para as abas conectadas do navegador
- **Middleware de segurança**: `helmet` para cabeçalhos de segurança HTTP, `express-rate-limit` para um limitador global de requisições e um limitador dedicado, mais rígido, nos endpoints de login (login por senha e login RFID compartilham o mesmo limitador)
- Schemas Zod para validação de requisições em toda rota que altera dados
- Handler centralizado de erros com reconhecimento do Prisma (`errorHandler.ts`), mapeando códigos de erro conhecidos do Prisma para respostas HTTP apropriadas
- Rastreamento de sessão ociosa em memória para contas de administrador (`lib/adminActivity.ts`), aplicado em toda requisição autenticada

### Ponte de hardware (opcional — `rpi/`)
- Serviço em **Python 3** (`rfid_admin_bridge.py`) que roda em um Raspberry Pi (SPI nativo, via `spidev`) ou faz a ponte através de um **Arduino Nano** conectado via serial USB, abstraído por trás de uma interface comum `RfidReaderBase` (`rfid_reader.py`)
- Comunica com o backend através de um endpoint HTTP restrito a loopback e protegido por segredo compartilhado (`POST /auth/rfid`)
- Feedback sonoro local (síntese de tons + `aplay`, sem arquivos de áudio externos) para detecção de cartão, sucesso e estados de erro
- `provision_card.py` para gravar um token recém-gerado em um cartão físico
- Distribuído como uma unidade `systemd` (`eduassets-rfid.service`) para operação contínua no Pi

### Hospedagem (planejado)
- **Frontend:** Vercel
- **Backend:** Render

---

## Autenticação e Níveis de Acesso

O eduAssets usa um modelo de acesso em três camadas:
- **Convidado (padrão):** concedido automaticamente ao carregar a página, sem necessidade de login. Pode visualizar o Dashboard, o Histórico de Empréstimos e os dados de inventário, mas não pode criar, editar ou excluir nada.
- **Editor (autenticado):** pode registrar empréstimos, processar devoluções e criar/editar registros de Controle (observações, manutenções e entradas de equipamentos quebrados), mas não pode acessar Cadastros, salvar Configurações, excluir registros de Controle ou gerenciar cartões RFID — essas ações permanecem exclusivas de administrador.
- **Administrador (autenticado):** acesso CRUD completo em todos os painéis, incluindo Cadastros (equipamentos, responsáveis, usuários e categorias), exclusão de registros, gerenciamento de contas (alteração de senha) e provisionamento de cartões RFID para qualquer usuário.

A aplicação acontece em duas camadas:
- **Frontend:** controles que disparam alterações são marcados com o atributo `data-requires-auth` (Editor+) ou `data-requires-admin` (somente Administrador), que desabilita visualmente o controle fora do nível de acesso exigido, e todo handler de evento que altera dados chama uma guarda `bloquearSeConvidado()` ou `bloquearSeNaoAdmin()` antes de fazer a chamada à API.
- **Backend:** toda rota que cria, atualiza ou exclui dados é protegida por um middleware `requireAuth` (qualquer usuário autenticado) ou `requireAdmin` (somente administradores), que valida um JWT enviado via `Authorization: Bearer <token>`. As restrições do frontend existem apenas para UX — o backend é a barreira de segurança real.

O login é feito via `POST /auth/login` (limitado por taxa para prevenir tentativas de força bruta), a persistência de sessão é validada na inicialização do app via `GET /auth/me`, e qualquer usuário autenticado pode trocar a própria senha via `PATCH /auth/senha` (exige digitar a senha atual novamente), disponível no painel **Segurança**.

**Expiração de sessão por inatividade:** sessões de administrador (somente) expiram automaticamente após 30 minutos de inatividade, rastreadas tanto no cliente (`core/auth/sessionTimeout.ts`, escutando eventos de mouse/teclado/scroll/touch) quanto no servidor (`backend/src/lib/adminActivity.ts`), para que a expiração não possa ser contornada apenas mantendo uma aba aberta sem interagir com o backend. Sessões de Editor não estão sujeitas a essa expiração.

> **Nota:** o painel Cadastros é tratado como totalmente restrito a administradores (incluindo visualização e listagem de itens cadastrados).

---

## Login por Cartão RFID

Como extensão opcional de hardware, qualquer usuário cadastrado (Administrador ou Editor) pode ter um cartão RFID físico vinculado à sua conta para login com um toque, sem digitar senha.
- **Provisionamento:** em **Cadastros → Usuários**, um administrador gera um token de uso único para um usuário (`POST /usuarios/:id/rfid-token`) e o grava em um cartão físico usando `rpi/provision_card.py`. O token é exibido apenas uma vez e armazenado no servidor como um hash SHA-256 (`Usuario.rfidTokenHash`, único); pode ser regenerado ou revogado (`DELETE /usuarios/:id/rfid-token`) a qualquer momento.
- **Leitura:** um pequeno serviço de ponte em Python (`rpi/rfid_admin_bridge.py`) roda continuamente em um Raspberry Pi ou em um Arduino Nano (conectado via serial USB), aguarda um cartão, lê seu token, e o envia para um endpoint do backend restrito a loopback e protegido por segredo compartilhado (`POST /auth/rfid`).
- **Propagação do login:** em uma leitura válida, o backend emite um JWT e transmite um evento de login via WebSocket (`/ws/rfid`, também restrito a loopback) para toda aba aberta apontando para a aplicação, para que a pessoa seja autenticada automaticamente onde quer que o app esteja aberto naquela máquina.
- **Feedback:** a ponte no Pi/Arduino toca tons sintetizados distintos para detecção de cartão, login bem-sucedido e estados de erro (cartão não reconhecido, backend inacessível), então nenhuma tela é necessária para saber que a leitura funcionou.

Isso é totalmente opcional — a aplicação web funciona completamente sem qualquer hardware RFID conectado, usando login por senha no lugar.

---

## Modo Escuro

A preferência de tema é tratada como uma configuração de dispositivo/pessoa, não como dado da aplicação — funciona de forma idêntica para Convidados e usuários autenticados de qualquer nível, e nunca fica bloqueada por `bloquearSeConvidado()`.
- **Detecção automática:** na primeira visita, o tema segue a configuração do SO via `prefers-color-scheme`, e se mantém sincronizado ao vivo caso o tema do SO mude com o app aberto.
- **Alternância manual:** um seletor Claro / Escuro / Sistema está disponível em **Configurações → Aparência**.
- **Persistência:** a preferência escolhida é armazenada em `localStorage` e restaurada a cada carregamento.
- **Sem flash de tema incorreto:** um script inline no `<head>` do `index.html` aplica o tema salvo/detectado ao `<html data-theme="...">` antes da primeira renderização, antes do bundle de módulos ES.
- **Fonte única de verdade para cor:** todo valor de tema vive em `frontend/src/styles/base/variables.css`, escopado sob `html[data-theme="dark"]`. Todos os componentes consomem tokens semânticos (`--surface-white`, `--text-primary`, `--border-color`, cores de feedback, etc.) em vez de valores de cor brutos, então nenhuma folha de estilo de componente precisa de sobrescritas específicas de tema.
- **Módulo de estado:** `frontend/src/core/state/themeStore.ts` segue o mesmo padrão de store do restante do estado da aplicação (`subscribe` / `notify`), expondo `getPreferenciaTema()`, `getTemaResolvido()` e `definirTema()`.

---

## Arquitetura

O frontend já segue a arquitetura em camadas feature-first, definida internamente como padrão de engenharia do projeto:
- **`core/`** — apenas infraestrutura, nunca lógica de negócio: cliente de API + módulos de API por entidade, guardas de autenticação (`guestGate`, `permissions`, `sessionTimeout`), layout (navegação, navegação mobile), stores de estado, primitivas de UI (modal, toast, confirm, datepicker), o listener WebSocket de RFID, utilitários reutilizáveis, e serviços agnósticos de framework (exportação CSV/Excel/PDF).
- **`features/`** — uma pasta por tela de negócio (`dashboard`, `emprestimo`, `devolucao`, `controle`, `cadastros`, `exportar`, `config`, `seguranca`, `perfil`, `auth`), cada uma internamente dividida em `index.ts` (wiring), `events.ts`, `render.ts`, `templates.ts` e `service.ts` quando relevante. Templates só retornam strings HTML; events apenas orquestram; regras de negócio vivem em `service.ts`; o estado é a única fonte de verdade e nunca é lido de volta do DOM.
- **`shared/`** — blocos de UI reutilizáveis não pertencentes a nenhuma feature específica (status badge, empty state, opções de select, helpers de DOM).
- **`types/`** — interfaces TypeScript centralizadas para todas as entidades, payloads e dados formatados para UI (`Loan`, `Equipamento`, `Ocorrencia`, `Usuario`, etc.), importadas em toda a aplicação em vez de redefinidas por arquivo.

Todo HTML dinâmico passa por um helper de template tagged `html\`` seguro contra XSS (`core/utils/html.ts`), que escapa automaticamente valores interpolados, com um escape hatch explícito `raw()` para fragmentos HTML confiáveis já sanitizados.

---

## Estrutura do Projeto

Veja a estrutura completa de pastas no README em inglês — a organização de diretórios é idêntica em ambos os idiomas.

---

## Executando Localmente

### Frontend
1. Clone o repositório
2. Navegue até o diretório do frontend:
```bash
cd frontend
```
3. Instale as dependências:
```bash
npm install
```
4. (Opcional) Crie um arquivo `.env` para apontar para uma URL de backend não padrão:
```env
VITE_API_BASE_URL=http://localhost:3000
```
5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```
> O Vite serve o app em `http://localhost:5173` por padrão. Rode `npm run build` para gerar um build de produção em `dist/`, ou `npm run typecheck` para rodar `tsc --noEmit`.

### Backend
1. Navegue até o diretório do backend:
```bash
cd backend
```
2. Instale as dependências:
```bash
npm install
```
3. Crie um arquivo `.env` com as seguintes variáveis:
```env
DATABASE_URL=<sua string de conexão Postgres do Supabase>
DIRECT_URL=<sua string de conexão direta do Supabase>
JWT_SECRET=<uma string longa, aleatória e imprevisível — nunca reutilize entre ambientes>
SEED_ADMIN_PASSWORD=<a senha da conta de administrador inicial>
SEED_EDITOR_PASSWORD=<opcional — cria uma conta de editor de teste quando definida>
CORS_ORIGIN=<lista separada por vírgulas de origens de frontend permitidas, ex: http://localhost:5173>
RFID_BRIDGE_SECRET=<necessário apenas se for usar login por cartão RFID — segredo compartilhado com a ponte rpi/>
```
4. Rode as migrações:
```bash
npx prisma migrate dev
```
5. Popule o banco de dados (cria dados iniciais e a conta de administrador inicial):
```bash
npx prisma db seed
```
6. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```
> A API roda em `http://localhost:3000` por padrão, e também faz upgrade de conexões WebSocket em `/ws/rfid` na mesma porta (somente loopback). Faça login no frontend usando o login definido no seed (`admin@eduassets.com` por padrão) e a senha definida em `SEED_ADMIN_PASSWORD`.

### Ponte RFID (opcional)
Necessária apenas se você quiser login por cartão físico. Rode na mesma máquina que o backend (ou em um Raspberry Pi com acesso de rede a ele):
1. Navegue até o diretório `rpi/` e instale as dependências:
```bash
cd rpi
pip install -r requirements.txt
```
2. Defina as variáveis de ambiente necessárias (correspondendo ao `RFID_BRIDGE_SECRET` do backend):
```env
RFID_BRIDGE_SECRET=<mesmo segredo do backend>
EDUASSETS_BACKEND_URL=http://localhost:3000
RFID_BACKEND=spi        # ou "serial" para fazer a ponte através de um Arduino Nano
RFID_SERIAL_PORT=/dev/ttyUSB0   # usado somente quando RFID_BACKEND=serial
RFID_SOUND_DEVICE=<dispositivo ALSA opcional para feedback sonoro>
```
3. Rode a ponte:
```bash
python3 rfid_admin_bridge.py
```
> Para operação contínua em um Raspberry Pi, instale `eduassets-rfid.service` como uma unidade `systemd` e configure `/etc/eduassets/rfid-bridge.env` com as variáveis acima. Use `provision_card.py <token>` para gravar um token (gerado via Cadastros → Usuários no app) em um cartão físico.

---

## Autor
Desenvolvido por Thiago da Silva.