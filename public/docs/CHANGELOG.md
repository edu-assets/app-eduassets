# Changelog — eduAssets

Este changelog preserva registros datados de desenvolvimento e implantação. A versão atual do produto é a **1.0.0 oficial**, publicada em 28/10/2026; entradas anteriores permanecem como histórico.

## v1.0.0 — Versão oficial — 28 de outubro de 2026

- O status oficial 1.0.0 foi aplicado aos repositórios do app, API, documentação e site; o pacote do frontend já usava a versão 1.0.0 e o pacote do site foi alinhado.
- O frontend consolidou sessão de navegador cookie-first com `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS e validação de `Origin` para mutações, mantendo compatibilidade controlada com Bearer legado e troca RFID por código de uso único.
- A entrada `#login` evita exibir o conteúdo protegido antes da autorização; o modo Convidado usa projeções allowlisted no servidor e permissões são aplicadas na API.
- A central de documentação usa catálogo compartilhado entre a página Sobre e o modal; os guias bilíngues podem ser carregados do host canônico e contam com fallback local.
- O site público recebeu hierarquia revisada para desafio/solução, navegação em uma linha, stack com logos SVG locais, documentação agrupada e cartão de perfil ajustado à foto e aos links sociais.
- Os guias operacionais e de hospedagem foram revisados junto com arquitetura, dados, API e operação; o histórico registra a topologia observada em 23/10 sem apresentar esse snapshot como estado atual dos serviços.

## Sessão, entrada e central de documentação — 26–27 de outubro de 2026
- O navegador negocia suporte de sessão via `/auth/session-capabilities`; quando disponível, a sessão usa cookie `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS e proteção de mutações por validação de `Origin`. O Bearer permanece apenas para compatibilidade/fallback.
- O login por RFID no modo cookie troca código de uso único com validade de 30 segundos por sessão; canais legados ainda podem usar o evento com JWT.
- A entrada por hash `#login` evita o flash do app protegido durante o bootstrap; acesso direto a `#app` aguarda autenticação/autorização de convidado.
- Os seletores de tema/idioma do painel Configurações foram alinhados ao login; as mensagens PT/EN da UI também refletem o salvamento explícito.
- A Central Sobre e o modal passaram a usar o mesmo registry para gerar automaticamente todos os cards. Foram acrescentados os guias bilíngues de API e desenvolvimento e registrados os guias de implantação e hospedagem. O portfolio `site-eduassets` passou a ler Markdown de `docs.eduassets.tech` em diálogo acessível com busca, sumário, links internos e sanitização; o leitor permanece em PT-BR/EN.
- READMEs, manuais, arquitetura, dados, hospedagem, roadmap e changelogs foram reconciliados com o código/CI registrado; instruções de migration agora separam atualização sem schema do procedimento de release com backup e migrate.

## Implantação e documentação de hospedagem — 23 de outubro de 2026
- Frontend publicado no Cloudflare Pages em `app.eduassets.tech`; landing page permanece separada em `eduassets.tech`.
- API publicada em `api.eduassets.tech`, na VM Ubuntu da Oracle Cloud, atrás do Nginx e com PostgreSQL remoto no Neon.
- Corrigido o bloqueio de entrada causado por `REJECT` genérico antes das chains do UFW: regras explícitas para TCP 80/443 foram inseridas antes do bloqueio, sem expor a porta 3000.
- Validado HTTPS externo e preflight CORS `OPTIONS /ready`, com `Access-Control-Allow-Origin: https://app.eduassets.tech`.
- CSP do Pages passou a permitir o beacon oficial do Cloudflare Web Analytics em `static.cloudflareinsights.com`.
- Adicionados os runbooks bilíngues `Hospedagem.md` e `Hosting.md`, registrados na visualização de documentação do frontend.
- Naquele registro, backup externo, ensaio de restauração, monitoramento/alertas e revisão para uso com dados reais foram identificados como temas operacionais para acompanhamento.

## Remediação e preparação de release — 22 de outubro de 2026
- Removidos fallbacks de autenticação/persistência em memória e segredo JWT padrão; validação de ambiente falha cedo para segredo, banco, CORS, porta e confiança de proxy inválidos/ausentes em produção.
- Corrigido timeout de administrador com identificador de JWT e estado fail-closed quando o estado de atividade não pode ser comprovado; confirmação de senha incorreta não derruba a sessão. Logout e troca de senha agora atualizam `sessionVersion` persistida para revogar JWTs antigos, inclusive entre instâncias.
- Empréstimo: criação/edição/devolução fazem serialização transacional por linha; retorno duplicado atualiza estoque uma vez. Ocorrências bloqueiam transições concorrentes para resolver/excluir sem duplo ajuste de estoque.
- Guest Mode segue ativo, com DTO allowlist específicos para equipamento, empréstimo e ocorrência; campos pessoais, notas e detalhes livres de ocorrência são omitidos/mascarados; responsáveis e usuários exigem autenticação.
- A devolução envia data/hora offset-aware selecionada pelo usuário; contratos antigos ainda podem omiti-la e usar horário do servidor. Relatórios/exportações filtram calendário local de forma inclusiva.
- `/health` é liveness e `/ready` verifica PostgreSQL com timeout; ambas respostas evitam revelar credenciais/detalhes da conexão. Prisma sem `DIRECT_URL` foi compilado usando fallback `DATABASE_URL`.
- Adicionados `.env` locais separados e template de produção, backend multi-stage Docker e Compose com bind host loopback, RFID desativado, Nginx/Cloudflare com encaminhamento saneado, scripts de backup/restauração somente em banco vazio, workflow CI com PostgreSQL efêmero e testes de integração/race. A remediação atual também instala OpenSSL no stage compartilhado do Prisma, remove a injeção vazia de `DIRECT_URL`, usa entrypoint Node direto, permite a origem API documentada na CSP, bloqueia `/auth/rfid` e `/ws/rfid` no Nginx público e adiciona smoke de container em produção ao CI.
- Seed usa nomes sintéticos e não sobrescreve senha existente; identificadores de login históricos foram mantidos.
- Validação registrada naquela execução: 36 testes frontend (9 arquivos), typecheck/build frontend, 30 testes backend, build TypeScript/Prisma e `prisma validate` com `DIRECT_URL` omitido e vazio passaram. Docker, PostgreSQL, migrations/seed, testes de integração e runtime do container não foram executados localmente porque as ferramentas/serviços não estavam disponíveis no sandbox; o CI hospedado `39875293195` passou nos jobs `verify` e `production-smoke`, incluindo esses checks. A auditoria de dependências daquela execução registrou findings na cadeia do Prisma; esta anotação histórica não representa uma auditoria atual.
- O run hospedado `39875293195` valida o HEAD `a8cd39b` e passou em `verify` e `production-smoke`; `39806752284` é apenas histórico. Esse registro cobre os jobs de CI e não relata resultados de QA de browser/hardware nem uma verificação contínua dos serviços externos.
- O fluxo local não aplica migrations automaticamente: `npm run dev` inicia os processos de desenvolvimento, e `npm run dev:db` executa a preparação explícita do banco de desenvolvimento. O frontend aguarda `/ready` e encerra junto se o backend falhar.
- Migrations deixaram de rodar automaticamente no `npm run dev`; use `npm run dev:db` somente depois de confirmar que `backend/.env` aponta para um banco de desenvolvimento. Isso evita travamentos ao conectar em PostgreSQL remoto e alterações não intencionais.

- Limites de payload adicionados para itens de empréstimo e identificadores de ocorrência; senha de usuários/troca de senha elevada para 12 caracteres; inicializações assíncronas e conteúdo de TOC/busca receberam tratamento seguro.
- A auditoria de dependências daquela execução registrou três findings high na cadeia de ferramentas Prisma 6 usada em desenvolvimento/migração; este registro histórico não representa o resultado de uma auditoria atual.

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
