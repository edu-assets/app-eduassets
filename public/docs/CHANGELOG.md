# Changelog — eduAssets

Todas as versões abaixo de v1.0.0 fazem parte do ciclo beta; datas antigas são aproximadas. A seção mais recente registra alterações do checkout, não releases publicados.

## Remediação e preparação de release — 22 de outubro de 2026
- Removidos fallbacks de autenticação/persistência em memória e segredo JWT padrão; validação de ambiente falha cedo para segredo, banco, CORS, porta e confiança de proxy inválidos/ausentes em produção.
- Corrigido timeout de administrador com identificador de JWT e estado fail-closed quando o estado de atividade não pode ser comprovado; confirmação de senha incorreta não derruba a sessão. Logout e troca de senha agora atualizam `sessionVersion` persistida para revogar JWTs antigos, inclusive entre instâncias.
- Empréstimo: criação/edição/devolução fazem serialização transacional por linha; retorno duplicado atualiza estoque uma vez. Ocorrências bloqueiam transições concorrentes para resolver/excluir sem duplo ajuste de estoque.
- Guest Mode segue ativo, com DTO allowlist específicos para equipamento, empréstimo e ocorrência; campos pessoais, notas e detalhes livres de ocorrência são omitidos/mascarados; responsáveis e usuários exigem autenticação.
- A devolução envia data/hora offset-aware selecionada pelo usuário; contratos antigos ainda podem omiti-la e usar horário do servidor. Relatórios/exportações filtram calendário local de forma inclusiva.
- `/health` é liveness e `/ready` verifica PostgreSQL com timeout; ambas respostas evitam revelar credenciais/detalhes da conexão. Prisma sem `DIRECT_URL` foi compilado usando fallback `DATABASE_URL`.
- Adicionados `.env` locais separados e template de produção, backend multi-stage Docker e Compose com bind host loopback, RFID desativado, Nginx/Cloudflare com encaminhamento saneado, scripts de backup/restauração somente em banco vazio, workflow CI com PostgreSQL efêmero e testes de integração/race.
- Seed usa nomes sintéticos e não sobrescreve senha existente; identificadores de login históricos foram mantidos.
- Validação em 22/10 no sandbox: 35 testes frontend (9 arquivos), build frontend, 24 testes unitários backend, build TypeScript backend e `prisma validate` aprovados. Um PostgreSQL 16 local e descartável foi instalado somente no sandbox; todas as seis migrations foram aplicadas ao banco de teste vazio, o seed executou duas vezes e uma nova senha-seed foi recusada sem alterar a credencial já cadastrada; os nove testes HTTP/concorrência/autenticação passaram, incluindo revogação por logout e troca de senha. O frontend cobre sincronização Guest/Editor/Administrador e limpeza imediata do logout.
- Continuam pendentes a execução do workflow hospedado, Docker/Docker Compose e `nginx -t`, Browser QA, hardware, Vercel, DNS, firewall, Cloudflare no host, certificado e deployment. Nenhum banco remoto, recurso público ou ambiente de produção foi acessado/alterado; o PostgreSQL usado foi exclusivamente local e descartável.

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
