# Changelog — eduAssets

Todas as versões abaixo de v1.0.0 fazem parte do ciclo de desenvolvimento beta. Datas são aproximadas. A seção sem número de versão registra remediações posteriores no checkout selecionado.

## Remediações recentes — 22 de outubro de 2026
- Removidos os fallbacks de autenticação e persistência em memória/demo; o backend usa `PrismaClient` e propaga erros de banco em vez de ocultá-los.
- `JWT_SECRET` agora é obrigatório e deve ter pelo menos 32 caracteres; não há segredo padrão. O middleware administrativo aguarda a autenticação antes de autorizar.
- Segurança reforçada: `helmet` nega enquadramento; CORS exige allowlist fora do desenvolvimento local; o WebSocket RFID só é inicializado com `RFID_BRIDGE_ENABLED=true` e aceita apenas conexões loopback.
- O bridge RFID evita seleção/escrita quando não há UID e usa limites de espera nas operações do leitor; o comportamento com hardware real não foi validado.
- Contrato de execução alinhado: o backend honra `PORT` (depois `BACKEND_PORT`) e usa 3000 por padrão; o frontend Vite usa 5173 e faz proxy para 3000. Builds de produção do frontend falham claramente sem `VITE_API_BASE_URL`.
- A configuração Prisma usa `DATABASE_URL` como fallback de `DIRECT_URL`; `prisma generate` foi verificado, mas nenhuma conexão de banco ou migração foi executada.
- Exportações CSV agora incluem BOM, escape de delimitadores/aspas/quebras de linha e neutralização de prefixos de fórmula; o cliente encerra a sessão autenticada em qualquer resposta 401.
- Corrigidos serialização segura de atributos HTML, tradução ausente e spinner/estado obsoleto do fluxo de devolução; foram adicionados casos de teste para CSV e HTML.
- Adicionado lockfile na raiz; backend e frontend declaram Node `>=22.12.0`. O serviço systemd do RFID deixou de depender de caminho e conta de máquina específicos, mas sua instalação e verificação no dispositivo não foram realizadas.
- Validações locais registradas no relatório: 27 testes do frontend em cinco arquivos, 9 testes do backend, typecheck e build do frontend, build do backend, `prisma generate`, verificação de sintaxe Python e `git diff --check`.
- Não houve deploy, operação em banco remoto, migração, rotação de segredo ou teste em hardware RFID/Raspberry Pi. Comportamento em produção/proxy e instalação do systemd não foram verificados; grants/RLS/PostgREST não foram alterados, e a semântica de data histórica da devolução não foi implementada.

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
