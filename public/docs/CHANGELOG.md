# Changelog — eduAssets

Todas as versões abaixo de v1.0.0 fazem parte do ciclo beta; datas antigas são aproximadas. A seção mais recente registra alterações do checkout, não releases publicados.

## Remediação e preparação de release — 22 de outubro de 2026
- Removidos fallbacks de autenticação/persistência em memória e segredo JWT padrão; validação de ambiente falha cedo para segredo, banco, CORS, porta e confiança de proxy inválidos/ausentes em produção.
- Corrigido timeout de administrador com identificador de JWT e estado fail-closed quando o estado de atividade não pode ser comprovado; confirmação de senha incorreta não derruba a sessão. Logout e troca de senha agora atualizam `sessionVersion` persistida para revogar JWTs antigos, inclusive entre instâncias.
- Empréstimo: criação/edição/devolução fazem serialização transacional por linha; retorno duplicado atualiza estoque uma vez. Ocorrências bloqueiam transições concorrentes para resolver/excluir sem duplo ajuste de estoque.
- Guest Mode segue ativo, com DTO allowlist específicos para equipamento, empréstimo e ocorrência; campos pessoais, notas e detalhes livres de ocorrência são omitidos/mascarados; responsáveis e usuários exigem autenticação.
- A devolução envia data/hora offset-aware selecionada pelo usuário; contratos antigos ainda podem omiti-la e usar horário do servidor. Relatórios/exportações filtram calendário local de forma inclusiva.
- `/health` é liveness e `/ready` verifica PostgreSQL com timeout; ambas respostas evitam revelar credenciais/detalhes da conexão. Prisma sem `DIRECT_URL` foi compilado usando fallback `DATABASE_URL`.
- Adicionados `.env` locais separados e template de produção, backend multi-stage Docker e Compose com bind host loopback, RFID desativado, Nginx/Cloudflare com encaminhamento saneado, scripts de backup/restauração somente em banco vazio, workflow CI com PostgreSQL efêmero e testes de integração/race. A remediação atual também instala OpenSSL no stage compartilhado do Prisma, remove a injeção vazia de `DIRECT_URL`, usa entrypoint Node direto, permite a origem API documentada na CSP, bloqueia `/auth/rfid` e `/ws/rfid` no Nginx público e adiciona smoke de container em produção ao CI.
- Seed usa nomes sintéticos e não sobrescreve senha existente; identificadores de login históricos foram mantidos.
- Validação desta execução local: 36 testes frontend (9 arquivos), typecheck/build frontend, 30 testes backend, build TypeScript/Prisma e `prisma validate` com `DIRECT_URL` omitido e vazio passaram. Docker, PostgreSQL, migrations/seed, testes de integração, `nginx -t` e runtime do container não foram executados porque as ferramentas/serviços não estão disponíveis no sandbox. O `npm audit --omit=dev` do backend ainda reportou a cadeia do Prisma no lockfile atual; a auditoria mantém três high (`deepmerge-ts`).
- O run hospedado `39806752284` pertence a um HEAD anterior e não valida o checkout atual nem o job `production-smoke`. Browser QA, hardware, Vercel, DNS, firewall, Cloudflare no host, certificado e deployment continuam pendentes.
- No desenvolvimento local, `backend` agora gera o Prisma Client e aplica migrations antes de iniciar; falhas do PostgreSQL/schema retornam 503 diagnosticável, e o frontend verifica `/ready` antes de disparar as cargas de sessão. O frontend também encerra junto quando o backend falha no `npm run dev`, evitando uma tela aberta com API indisponível.
- Migrations deixaram de rodar automaticamente no `npm run dev`; use `npm run dev:db` somente depois de confirmar que `backend/.env` aponta para um banco de desenvolvimento. Isso evita travamentos ao conectar em PostgreSQL remoto e alterações não intencionais.

- Limites de payload adicionados para itens de empréstimo e identificadores de ocorrência; senha de usuários/troca de senha elevada para 12 caracteres; inicializações assíncronas e conteúdo de TOC/busca receberam tratamento seguro.
- Auditoria backend registrada: `npm audit --omit=dev` ainda reporta a cadeia do Prisma no lockfile atual; 3 high permanecem na cadeia de ferramentas Prisma 6 usada em desenvolvimento/migração, sem upgrade major forçado.

## v0.9.9 (agosto 2026)
- Índices de banco em `Emprestimo.status` e `Ocorrencia.status` para consultas mais rápidas no Dashboard e Controle.
- Validação `.refine()` de quantidade no schema de atualização de equipamento (impede disponível+quebrado > total).
- Flatpickr agora é lazy-loaded via `import()` dinâmico com promise cacheada, reduzindo o bundle inicial.
- Acessibilidade: `role="dialog"`, `aria-modal` e focus trap aplicados automaticamente a todos os modais via `initModals()`.
- Setup inicial de testes com Vitest para utilitários puros.

## v0.9.8 (agosto 2026)
- Fluxo de login automático por cartão RFID implementado no bridge Python (SPI e serial/Arduino), no WebSocket de loopback e na propagação de sessão entre abas.
- Painel de Cadastros → Usuários ganhou o fluxo de vincular/regenerar/revogar cartão.
- Sons de feedback sintetizados (sem arquivos de áudio externos) para detecção, sucesso e erro no bridge.

## v0.9.5 (julho 2026)
- Timeout de sessão por inatividade (30 min) para contas Administrador, implementado tanto no cliente quanto no servidor.
- Rate limiting dedicado para login (senha e RFID compartilham o mesmo limitador).
- Cabeçalhos de segurança via `helmet` aplicados globalmente.

## v0.9.0 (julho 2026)
- Migração completa do frontend de JavaScript vanilla para TypeScript, seguindo `skillsJS.md` à risca.
- Reestruturação em arquitetura feature-first (`core` / `features` / `shared` / `types`).
- Painel Exportar conectado à lógica real (CSV, Excel via ExcelJS, PDF via jsPDF + autotable).

## v0.8.0 (julho 2026)
- Autenticação JWT implementada, com Modo Convidado (leitura pública, escrita restrita).
- Diferenciação de permissões entre Administrador e Editor no frontend e no backend.
- Dark Mode com detecção automática do sistema, alternância manual e persistência.

## v0.6.0 (julho 2026)
- Estoque decrementado/incrementado de forma atômica via transações Prisma, eliminando condições de corrida em empréstimos simultâneos.
- Painel Controle completo: quatro abas (Observação, Manutenção, Quebrado, Resolvidos) com modal de criação/edição e resolução.

## v0.4.0 (junho 2026)
- Primeira versão do backend com todas as rotas CRUD (Categoria, Equipamento, Responsável, Usuário, Empréstimo, Ocorrência) e schema Prisma inicial.
- Frontend passa a consumir a API real, substituindo o estado mockado usado nos protótipos iniciais.

## v0.2.0 (junho 2026)
- Protótipo funcional em JavaScript vanilla, com estado em memória (sem backend), usado para validar o fluxo de UX de empréstimo/devolução.
- Design system inicial: paleta de cores, tokens semânticos em CSS custom properties, tipografia (Poppins/Inter).

## v0.1.0 (junho 2026)
- Ideia inicial e wireframes do projeto, motivados pelo controle manual de equipamentos por planilha física.
- Primeiros mockups estáticos em HTML/CSS.
