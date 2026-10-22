# Roadmap — eduAssets

> **Status do checkout (2026-10-22): Beta.** A remediação de código foi aplicada e verificada localmente, mas não houve deployment público, operação de banco remoto, migração aplicada, rotação de segredos ou validação no Raspberry Pi 5. Este roadmap não descreve o projeto como *production-ready*.

## Concluído e verificado

- [x] Frontend TypeScript/Vite nas camadas `core`/`features`/`shared`; typecheck e build aprovados; 27 testes do frontend passaram em 5 arquivos.
- [x] Backend TypeScript/Express com Prisma tipado e sem fallback de autenticação/demo em memória; build e 9 testes do backend passaram.
- [x] Autenticação JWT com segredo obrigatório de pelo menos 32 caracteres, autorização no backend para Administrador/Editor e leitura de convidado, rate limiting, headers de segurança e middleware administrativo assíncrono.
- [x] Tratamento de sessão expirada via respostas 401 e timeout de inatividade do administrador; erros de rede e 403 continuam distintos.
- [x] Correções verificadas de serialização/escape HTML, tradução PT/EN, edição de itens na devolução (spinner e estado original) e exportação CSV (escape, BOM, fórmulas e filtro inclusivo), com casos unitários correspondentes.
- [x] Caminho RFID opcional protegido por flag, segredo compartilhado e validação de UID vazio; a existência do código foi verificada, mas não o leitor físico nem a rede de produção.
- [x] Escopo funcional existente confirmado no código: empréstimos/devoluções, estoque transacional, ocorrências, CRUD administrativo, temas Claro/Escuro/Sistema, exportações e modo convidado somente leitura.

> Os itens acima são conclusões de código, testes, build e checagens locais. Não equivalem a teste ponta a ponta em ambiente hospedado, aprovação de privacidade ou certificação de hardware.

## Rumo ao v1.0.0 (curto prazo)

### Trabalho futuro

- [ ] Ampliar a suíte automatizada (Vitest e testes de serviço/integração) para estoque, validações e fluxos críticos; os testes atuais são uma base, não cobertura completa.
- [ ] **F4 — registro/refresh:** uniformizar e verificar no navegador a atualização das listas após criar/editar/excluir em todas as entidades. O cadastro atualmente recarrega a lista após criação, mas os padrões variam e o fluxo completo com banco não foi reproduzido.
- [ ] **F5 — exportações:** validar limites de calendário/fuso horário e abertura dos arquivos no Excel e no LibreOffice; os casos unitários locais passaram.
- [ ] **Acessibilidade e UX de convidado:** revisar teclado, foco, contraste, leitor de tela, mensagens e affordances de ações bloqueadas; o estilo/experiência de ações de convidado (D5) ainda não foi tratado por QA manual.
- [ ] Estabelecer pipeline reproduzível em checkout limpo: instalações com lockfiles, separação explícita entre build e migração e uma etapa que disponibilize o Prisma CLI quando necessário; `npm ci --omit=dev` e o fluxo de deploy ainda não foram estabelecidos nem testados.
- [ ] Configurar e validar no host escolhido o allowlist de `CORS_ORIGIN`, proxy/Nginx (compressão, cache e HTTP/2), `PORT`/`HOST`/`TRUST_PROXY` e o teste simultâneo frontend-backend.
- [ ] Fazer o primeiro deployment público somente após os gates acima e executar smoke tests do frontend, API, autenticação, exportações e fluxos operacionais.

### Bloqueios externos / decisões necessárias

- [ ] **PostgREST/RLS e privacidade:** obter acesso autorizado ao projeto PostgreSQL/Supabase de teste, revisar acesso anônimo, grants, RLS, views e payloads públicos endpoint a endpoint e obter uma auditoria/aprovação externa de privacidade. Não há credenciais nem políticas-alvo disponíveis; nenhuma alteração remota foi feita.
- [ ] **Banco e migração:** disponibilizar PostgreSQL descartável, confirmar backup/recuperação e executar `prisma migrate deploy` em ambiente não produtivo antes de considerar a migração validada.
- [ ] **Pi 5/GPIO/systemd:** instalar no sistema operacional-alvo, validar biblioteca GPIO, conta/caminhos/ambiente do serviço, executar `systemd-analyze verify` e testar leitura/gravação real de cartão. Não há Raspberry Pi 5 nem OS-alvo neste ambiente.
- [ ] **F7 — data de devolução:** decidir se a data escolhida pela interface deve representar uma devolução histórica. Hoje o contrato servidor/backend grava o horário atual; após a decisão, atualizar modelo, API, validações, UI, testes e documentação.
- [ ] **Hospedagem e `VITE_API_BASE_URL`:** obter acesso ao projeto de hospedagem, definir a origem real da API no build do frontend e validar preview/produção. O build de produção falha claramente quando `VITE_API_BASE_URL` falta, mas nenhum projeto hospedado foi verificado.
- [ ] **RFID em produção:** testar exposição loopback/proxy autorizada, política de firewall e comportamento ponta a ponta com o hardware; a flag e os limites de segurança no código não substituem essa validação externa.

## v1.0.0 — Release estável

Marco **ainda não atingido**. Só considerar esta etapa quando as funcionalidades essenciais estiverem cobertas por testes adequados e documentação, e quando os bloqueios externos — privacidade/RLS, migração descartável, hospedagem/configuração, acessibilidade, F4, F7 e Pi/RFID quando habilitados — tiverem evidência registrada. Até lá, o estado correto permanece **Beta**.

## Pós-1.0 (v2 — médio/longo prazo)

- [ ] Migração completa do frontend para React, reaproveitando as camadas `core`/`features`/`shared` já existentes (o frontend atual é TypeScript com renderização DOM nativa).
- [ ] Rastreamento individual por número de série (hoje o controle é por quantidade agregada, não por unidade física).
- [ ] Recuperação de senha ("Esqueci minha senha") — hoje só é possível alteração autenticada via painel Segurança.
- [ ] Permissões mais granulares (por painel/ação), além dos dois níveis atuais (Administrador/Editor).
- [ ] Seletor de temas além de Claro/Escuro/Sistema.
- [ ] Notificações reais (hoje a interface em Configurações é apenas visual).

## Ideias em avaliação (sem compromisso de prazo)

- Relatórios agendados (exportação automática periódica por e-mail).
- App mobile companion para leitura de QR code como alternativa ao RFID.
