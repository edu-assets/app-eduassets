# Changelog — eduAssets

Este changelog preserva registros datados de desenvolvimento e implantação. A versão atual do produto é a **1.4.0 oficial**, publicada em 13/11/2026; entradas anteriores permanecem como histórico.

## v1.4.0 — Autoria dos registros, gestão de usuários e refinamentos de interface — 13 de novembro de 2026

- **Autoria dos registros:** empréstimos, ocorrências, equipamentos, categorias e responsáveis passam a guardar quem os criou, alterou, devolveu ou resolveu. A migration `20261113150000_record_authorship` é aditiva e preenche os registros existentes a partir da auditoria; registros sem linhas de auditoria ficam sem autor. Usuários autenticados (Administrador ou Editor) veem a autoria em Devoluções, Dashboard (Histórico e detalhes do estoque), Controle e Cadastros; Convidados nunca recebem esses dados. As exportações CSV, Excel e PDF ganham **Registrado por** e **Devolvido por** (empréstimos) e **Criada por** (ocorrências) quando há login.
- **Cadastros → Usuários:** edição de nome, nível de acesso e login, desativação e reativação (com confirmação), selo **Inativo** e aviso para logins que não são e-mails válidos. Novos logins e alterações de login precisam ser e-mails. A API impede desativar ou rebaixar a si mesmo e remover o último administrador ativo.
- **Cadastros:** **Ajustar total** de equipamentos (não pode ficar abaixo dos itens em uso), busca nas listas e erros nos próprios campos.
- **Configurações:** o botão **Salvar Configurações** foi removido (não salvava nada); tema e idioma valem na hora e ficam salvos neste navegador.
- **Controle:** paginação sem função removida, **Saiba mais** abre o manual, validação de campos obrigatórios, proteção contra clique duplo ao salvar, resolver e excluir, e abas e menus acessíveis pelo teclado (setas, Home/End, Esc).
- **Novo empréstimo:** os equipamentos mostram "(N disponíveis)", modelos indisponíveis ficam desabilitados, a quantidade é limitada com erro no campo e a observação tem contador 0/250.
- **Devoluções:** botão **Detalhes** em cada cartão, acessível pelo teclado.
- **Carregamento e erros:** esqueletos de carregamento e contadores "—" no primeiro carregamento; erro no próprio painel com **Tentar novamente** no Dashboard, em Devoluções e em Controle.
- **Segurança e perfil:** **Última alteração** mostra a data da última troca de senha (**Sem registro** se não houver); o subtítulo de Meu Perfil é neutro para Editores; Convidados veem "Faça login para registrar alterações." ao tentar uma ação bloqueada.
- **API:** `GET /auth/me` retorna `senhaAlteradaEm`; respostas autenticadas incluem objetos de autor `{ id, nome }`; `GET /categorias` para Convidados retorna `{ id, nome }`; novos erros em `PATCH /usuarios/:id`.
- **Observação:** a recuperação de senha só funciona se a caixa de e-mail do login realmente existir.
- **Documentação:** Manual do Usuário §2, §4, §5, §6, §7, §8, §9, §10, §11 e §12; Referência da API (autoria, `/auth/me`, `/usuarios`); Modelo de Dados (campos de autoria e migration).

## v1.3.0 — Banner de notificações, ativação guiada e versão única — 13 de novembro de 2026

Consolida tudo o que foi publicado desde a 1.2.0; os detalhes estão nas entradas datadas abaixo.

- **Notificações push para administradores:** alertas do sistema para empréstimos, devoluções e ocorrências, ativados por dispositivo (veja *Notificações push para administradores*).
- **Banner de ativação:** administradores que ainda não ativaram as notificações no dispositivo atual veem um banner no topo do app, com **Ativar notificações** e **Agora não** (oculta o banner por 7 dias naquele dispositivo). No iPhone e no iPad, fora do app instalado, ele explica como instalar na Tela de Início; com as notificações bloqueadas, mostra como desbloqueá-las.
- **Permissão não exibida:** quando o navegador não mostra o pedido de permissão (por exemplo, a interface discreta do Chrome, que mostra apenas um sino riscado na barra de endereço, ou pedidos dispensados várias vezes), o app explica como permitir pelo ícone ao lado do endereço (Notificações › Permitir); a mensagem de bloqueio foi melhorada da mesma forma.
- **Conclusão automática:** depois que o administrador permite as notificações nas configurações do site, o app conclui a ativação sozinho, sem segundo clique — apenas se ele a pediu naquela sessão ou se o banner estava visível; um dispositivo nunca é inscrito silenciosamente.
- **Atualização automática e data e hora:** atualização periódica dos dados, correções de formulários no celular, relógio do servidor e validação de datas.
- **Privacidade e cookies:** Política de Privacidade do app, consentimento de cookies e Google Analytics somente após aceite.
- **E-mail de recuperação:** novo modelo profissional e envio pelo Brevo.
- **Operação:** monitoramento ativo, alertas por dead-man switch, MFA e proteções na conta Cloudflare e `rclone` oficial nos backups.
- **Versão única:** a versão exibida no app (selo em Sobre) vem do `package.json` do app em tempo de build. `npm run version:set -- <x.y.z> [--date AAAA-MM-DD]` atualiza a versão em todos os repositórios (app, API, site, READMEs da documentação e arquivos de pacote) e `npm run version:set -- --check` verifica se estão de acordo. O site do portfólio também lê a versão do seu `package.json`.
- **Documentação:** Manual do Usuário §10 (banner, permissão e notificações do sistema) e Desenvolvimento (novo *Versionamento*).

## Atualização automática e ajustes de data e hora — 12 de novembro de 2026

Correções e ajustes, sem número de versão.

- **Atualização automática:** os dados são atualizados sozinhos a cada 30 s com a tela aberta, ao voltar para o app ou a aba e, para administradores, ao receber uma notificação push. O estoque também se atualiza após empréstimos, devoluções e ocorrências.
- **Correção no celular (empréstimo):** depois de alterar a data e a hora de um empréstimo, o formulário podia deixar de ser enviado (mensagem "Insira um valor válido...") até a página ser recarregada; o mesmo acontecia nas devoluções.
- **Correção no celular (menu):** a barra lateral não rolava até o perfil do usuário.
- **Data e hora:** os campos automáticos seguem o relógio do servidor; devoluções sem data alterada manualmente usam a hora do servidor.
- **Validação:** o servidor recusa datas com mais de 5 minutos no futuro e devoluções anteriores à retirada do empréstimo.
- **Notificações:** empréstimos e devoluções abrem o Dashboard (aba Histórico) em vez de Controle.
- **Sessão:** as atualizações automáticas não mantêm ativa a sessão de um administrador ocioso.
- **Documentação:** Manual do Usuário §3, §4, §5 e §10; Referência da API (nova seção *Sincronização de dados*, `POST /emprestimos` e `PATCH /emprestimos/:id/devolver`).

## Notificações push para administradores — 12 de novembro de 2026

Novo recurso, sem número de versão.

- **Alertas do sistema:** quando outro usuário registra um empréstimo, uma devolução ou uma ocorrência, os administradores ativos recebem uma notificação no computador ou no celular, mesmo com o app fechado ou o celular bloqueado. A ativação é feita por dispositivo em **Configurações → Notificações**, com interruptores por tipo de evento e o som dentro do app. Contas Editor não recebem.
- **Privacidade:** a notificação mostra apenas o solicitante (ou o tipo de ocorrência), os equipamentos por categoria e modelo e quem registrou; nunca mostra observações, descrições, problemas, medidas tomadas ou números de patrimônio. Os serviços de push (Google, Apple, Mozilla e Microsoft) veem apenas o endpoint do dispositivo e um payload criptografado.
- **Operação:** novas variáveis opcionais `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` em `.env.production`; sem elas o recurso fica desativado e a API funciona normalmente. Nova tabela `PushSubscription` (migration `20261113090000_push_subscriptions`). Não houve alteração no Nginx nem na CSP.
- **Documentação:** Hospedagem §5.3 e §10; Manual do Usuário §2, §10, §14 e §15; Referência da API (nova seção *Notificações push*); Modelo de Dados (entidade `PushSubscription` e regras de notificação).

## Monitoramento, alertas e segurança da conta Cloudflare — 12 de novembro de 2026

Operação, sem mudança de código nem de versão.

- **Uptime ativo:** o Bot Fight Mode do Cloudflare bloqueava os runners do GitHub (HTTP 403); foi mantido desligado e o workflow passou a rodar verde a cada 15 minutos.
- **Alertas por dead-man switch** (healthchecks.io) configurados para o health check da VM e para o backup diário.
- **Cloudflare:** MFA da conta e AI Labyrinth ativados; `security.txt` configurado também no painel.
- **Banco:** grants e RLS verificados no Neon e registrados no Modelo de Dados.
- **Backup:** o HTTP 501 do R2 vinha do `rclone` 1.60 do Ubuntu, sem perda de dados; com o `rclone` oficial 1.76.0 na VM, o envio passa na primeira tentativa.
- **Documentação:** Hospedagem §10, §11.2, §14 e §15; Modelo de Dados.

## Política de privacidade do app, consentimento de cookies e Google Analytics — 12 de novembro de 2026

- **Política de Privacidade do app** em `app.eduassets.tech/#privacidade` (PT/EN), baseada nos dados e fornecedores documentados: responsável, dados tratados, modo convidado, bases legais da LGPD, fornecedores, retenção, cookies e armazenamento do navegador, segurança e direitos do titular. A tela de entrada passou a dizer "Ao continuar, você concorda com os Termos de Uso e declara ciência da Política de Privacidade", e o item 9 dos Termos de Uso aponta para ela.
- **Google Analytics com consentimento:** a tag `G-9LJ1MQRCEV` estava no HTML do app e do site, mas a CSP bloqueava o script no app e a configuração no site, então nenhuma visita era registrada — e as políticas do site diziam não haver analytics. Agora o app e o site mostram um banner de cookies e só carregam o Google Analytics após **Aceitar**, por um módulo próprio (sem script inline); **Recusar** apaga os cookies `_ga*`, e a escolha pode ser mudada em **Preferências de cookies**. Sinais do Google e personalização de anúncios desativados; o endereço enviado nunca inclui o link de recuperação de senha. As CSPs liberam os domínios do Google Analytics e a CI do app verifica isso.
- **Site:** políticas de privacidade e de cookies reescritas (PT/EN) para declarar o Google Analytics com consentimento, o armazenamento local e o link para a política do app; botão **Preferências de cookies** no rodapé.
- **Documentação:** Hospedagem §3 (CSP) e novo §16 (privacidade e cookies), Manual do Usuário.

## E-mail de recuperação profissional e envio pelo Brevo — 12 de novembro de 2026

Atualização da API após a publicação da 1.2.0, sem mudança de versão nem de banco.

- **Novo modelo do e-mail de recuperação** (commit `5167d9f` da API): HTML responsivo em PT/EN com banner da marca embutido (anexo inline, sem imagens externas), botão **Definir nova senha** com o link por extenso, quadro com conta, data/hora do pedido (horário de Brasília) e validade, próximos passos, aviso "Não foi você?" e rodapé com links do app, do site e do suporte. A versão em texto puro acompanha o HTML.
- **Novas variáveis opcionais:** `SUPPORT_EMAIL` (contato no rodapé e Reply-To, para que respostas não caiam no `nao-responda@`) e `PUBLIC_SITE_URL` (link do site). Ambas são validadas no startup.
- **Envio pelo Brevo:** o plano gratuito do Zoho Mail não oferece SMTP, então a produção passou a enviar por `smtp-relay.brevo.com:587` com o domínio `eduassets.tech` autenticado (DKIM `brevo1`/`brevo2`), subdomínio de marca `em` e IP da VM na lista de IPs autorizados. O Zoho continua recebendo os e-mails do domínio. O DMARC foi consolidado em um único registro.
- **Documentação:** Hospedagem §5.2 reescrita para o Brevo (incluindo o comando correto para recriar a API com a tag da imagem), registro da ativação em §14 e DMARC em §15; Manual do Usuário descreve o e-mail recebido.

## v1.2.0 — Recuperação de senha por e-mail, deploy automático e alertas — 12 de novembro de 2026

- **Recuperação de senha self-service:** link **Esqueci minha senha** na tela de entrada. A API (`POST /auth/senha/recuperar`) responde sempre da mesma forma, sem revelar se a conta existe, e envia por e-mail (SMTP; em produção, Brevo com o remetente `nao-responda@eduassets.tech`) um link de uso único válido por 30 minutos; o token viaja no fragmento da URL, é removido da barra de endereço ao abrir o app e só o seu hash SHA-256 é armazenado (nova tabela `PasswordResetToken`, migration `20261112130000_password_reset_tokens`). `POST /auth/senha/redefinir` aplica a política forte de senha, encerra todas as sessões e audita `PASSWORD_RESET_SELF`. Limites: 10 pedidos por IP a cada 15 minutos e 3 por e-mail por hora. Sem SMTP configurado, a funcionalidade fica oculta.
- **Deploy automático da API:** `eduassets-deploy.timer` na VM implanta o `main` quando a CI passa para o commit — com backup antes de migrations, verificação de saúde e rollback automático de código e imagem. Não abre portas nem guarda chaves da VM no GitHub.
- **Alerta de erros 5xx:** o health check da VM passou a ler o log de requisições da API e alerta quando há pelo menos 5 respostas 5xx que representem 5% ou mais das requisições desde a verificação anterior; também alerta quando o último deploy automático falhou.
- **Catálogo de documentação automatizado:** `npm run docs:sync` no app atualiza datas e versões do catálogo a partir do histórico Git do repositório de documentação, e a CI do app falha se o catálogo ou a cópia local dos documentos divergirem do commit fixado.
- **Dependências:** corrigidas todas as vulnerabilidades apontadas pelo `npm audit`. API: `body-parser` 2.4.0 (DoS com bytes extras após corpo comprimido) e `deepmerge-ts` 8.0.2 no CLI do Prisma via `overrides`, sem migrar para o Prisma 7. Site: `undici`, `zod`, `fast-xml-parser` e `fast-uri`. Os quatro repositórios ficaram com 0 vulnerabilidades conhecidas.
- **Documentação:** Hospedagem (§5.1 deploy automático, §5.2 e-mail via SMTP, §10 alerta de 5xx), Guia de Implantação, Referência da API, Manual do Usuário e Operação e Recuperação atualizados.

## v1.1.0 — Redefinição de senha, sessões e operação contínua — 12 de novembro de 2026

- **Redefinição de senha pelo administrador:** em **Cadastros → Usuários**, o botão **Redefinir senha** define uma senha temporária para outra conta usando o endpoint já existente `POST /usuarios/:id/password-reset` — mesma política forte da API, encerramento de todas as sessões da conta (`sessionVersion`) e auditoria `PASSWORD_RESET`. Para a própria conta, o app orienta o uso de **Segurança**. O runbook de reset manual no banco ficou restrito ao caso em que nenhum administrador consegue entrar.
- **Logout sem conexão:** quando a API não confirma o logout, o navegador marca a saída como pendente, não restaura a sessão ao reabrir o app e repete a revogação ao voltar a conexão ou na próxima abertura. Antes, o cookie `HttpOnly` remanescente podia restaurar a sessão no recarregamento.
- **Monitoramento:** workflow `Uptime` no GitHub Actions (a cada 15 minutos) para `/health`, `/ready`, app, landing page, documentação, validade TLS e `security.txt`; health check na VM via systemd (disco, memória, saúde do container com reinício automático após 3 falhas seguidas e idade do backup), com pings opcionais de dead-man switch.
- **Backup:** execução diária agendada por systemd, retenção de 7 dias locais e 30 dias no R2 com trava de segurança (nunca apaga com menos de 3 cópias recentes) e ensaio automatizado de restauração em PostgreSQL descartável na máquina do operador (`verify-backup-restore.sh`).
- **Documentação:** Manual, Referência da API (inclui `PATCH /usuarios/:id` e `POST /usuarios/:id/password-reset`), Hospedagem (novos §11.1, §11.2, §14 e §15 com a checklist de segurança da zona Cloudflare) e Operação e Recuperação atualizados; caminho do checkout de produção unificado em `/opt/api-eduassets`. Verificação externa de 12/11/2026 registrou a API saudável e conectada ao banco.
- **Pendências que dependem do operador:** ativar os timers de backup e health check na VM, rodar o primeiro ensaio de restauração e aplicar os ajustes do painel Cloudflare (DMARC, Bot Fight Mode, AI Labyrinth, MFA). O passo a passo está no Guia de Hospedagem.

## v1.0.2 — Correções de interface — 12 de novembro de 2026

- Dashboard → Estoque: cada linha passou a exibir o nome do equipamento (modelo) com a categoria abaixo, eliminando linhas aparentemente duplicadas quando há mais de um equipamento na mesma categoria (por exemplo, dois modelos de tablet). O cabeçalho da coluna passou a ser "Equipamento".
- A busca do estoque também encontra equipamentos pelo modelo; o painel de detalhe mostra o equipamento junto da categoria; a exportação CSV do estoque ganhou a coluna `Modelo`.
- Login: o cartão de entrada não tem mais altura máxima fixa com conteúdo oculto. Em telas baixas (notebooks, escalas de 125–150%) o espaçamento é compactado para que todo o formulário, incluindo o contato de suporte, fique visível; se ainda faltar altura, a tela rola em vez de cortar o conteúdo.
- O selo de versão do painel Sobre foi atualizado para a versão atual.

## v1.0.1 — Correções de segurança e operação — 28 de outubro de 2026

- Remediação do frontend: sanitização dos documentos com DOMPurify, allowlist restrita de elementos/atributos/esquemas de URL, remoção de imagens remotas e regressões para `javascript:` com CR/LF/TAB, `data:` e `vbscript:`; proteção de identificadores brutos.
- Sessões de navegador passaram a ser somente por cookie protegido; tokens JWT não são persistidos em `localStorage`. A API valida `Origin` nas mutações autenticadas por cookie.
- Fonte de Markdown fixada em commit imutável; CSP e CI verificam a origem necessária, com fallback local sincronizado. A listagem pública de empréstimos usa cursor, padrão 50 e máximo de 100 registros por página.
- API: registros `AuditLog` atribuídos ao ator na mesma transação das mutações de usuário, categoria, equipamento, responsável, ocorrência e empréstimo; ordenação determinística de IDs em transações de estoque e conflitos Prisma P2034 retornam HTTP 409. Provisionamento RFID não retorna segredo; WebSocket restringe caminho/origem e usa código de uso único no modo cookie.
- Hardening complementar: limites Zod, limite de 72 bytes para senhas, redação de credenciais/PII em logs, correção de campos de exportação e cache headers; imagens Node de produção fixadas por digest e templates Nginx limitam o acesso de origem às faixas Cloudflare.
- Deploy da API em produção registrado no commit `14b0716110750857daa27d0e979e3bec574e39e0`; migration `20261028173000_user_management_audit` aplicada, imagens de API/migration construídas e serviço reiniciado. `/health` e `/ready` responderam com sucesso localmente e por `https://api.eduassets.tech`.
- Antes da migration, foi gerado um backup PostgreSQL 18.6 custom-format, criptografado com `age` e transferido para Cloudflare R2. A senha foi lida por `PGPASSFILE` (modo 0600); o objeto foi listado no destino. O primeiro upload recebeu HTTP 501, mas a repetição automática teve sucesso. Esta foi uma execução manual; não registra agendamento, política de retenção ou restauração do objeto de produção.
- CI hospedado da API, run `40769671846`, concluiu `verify` e `production-smoke` com sucesso. Os guias detalham a sequência e distinguem verificações de código, registro do operador e itens não exercitados no banco de produção.

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
