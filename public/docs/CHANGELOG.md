# Changelog — eduAssets

Todas as versões abaixo de v1.0.0 fazem parte do ciclo de desenvolvimento beta. Datas são aproximadas.

## v0.9.9 — Atual (agosto 2026)
- Índices de banco em `Emprestimo.status` e `Ocorrencia.status` para consultas mais rápidas no Dashboard e Controle.
- Validação `.refine()` de quantidade no schema de atualização de equipamento (impede disponível+quebrado > total).
- `AbortController` com timeout na requisição do bridge RFID, evitando travamentos quando o hardware está offline.
- Flatpickr agora é lazy-loaded via `import()` dinâmico com promise cacheada, reduzindo o bundle inicial.
- Acessibilidade: `role="dialog"`, `aria-modal` e focus trap aplicados automaticamente a todos os modais via `initModals()`.
- Setup inicial de testes com Vitest (quatro arquivos de teste para utilitários puros).

## v0.9.8 (agosto 2026)
- Login automático por cartão RFID finalizado ponta a ponta: bridge Python (SPI e serial/Arduino), WebSocket loopback-only e propagação de sessão entre abas.
- Painel de Cadastros → Usuários ganhou o fluxo de vincular/regenerar/revogar cartão.
- Sons de feedback sintetizados (sem arquivos de áudio externos) para detecção, sucesso e erro no bridge.

## v0.9.5 (julho 2026)
- Timeout de sessão por inatividade (30 min) para contas Administrador, validado tanto no cliente quanto no servidor.
- Rate limiting dedicado para login (senha e RFID compartilham o mesmo limitador).
- Cabeçalhos de segurança via `helmet` aplicados globalmente.

## v0.9.0 (julho 2026)
- Migração completa do frontend de JavaScript vanilla para TypeScript, seguindo `skillsJS.md` à risca.
- Reestruturação em arquitetura feature-first (`core` / `features` / `shared` / `types`).
- Painel Exportar conectado à lógica real (CSV, Excel via SheetJS, PDF via jsPDF + autotable).

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
