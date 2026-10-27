# Implantação e operação

> **Registro histórico (23/10/2026):** o operador validou naquele momento o frontend Cloudflare Pages em `app.eduassets.tech`, a API Nginx na VM Oracle em `api.eduassets.tech`, a configuração de conexão com o Neon, o HTTPS externo e o preflight CORS. Este registro não verifica o estado remoto atual. Backup externo, ensaio de restauração, monitoramento e revisão final para dados reais continuam tarefas operacionais. Consulte `Hospedagem.md` para o runbook.

## Topologia escolhida

A arquitetura de referência é frontend estático na Cloudflare Pages e uma instância Docker do backend em VM dedicada, atrás de Nginx local e Cloudflare em modo Full (strict). O PostgreSQL é externo e dedicado a essa implantação. O serviço `api` usa a porta 3000 dentro da rede Docker; a VM publica a API somente em loopback na porta 3000. RFID fica desativado na instância pública. Não conectar demo e dados operacionais.

```text
Navegador → frontend estático Cloudflare Pages → Cloudflare HTTPS → Nginx :443
                                                       → 127.0.0.1:3000 API Docker → PostgreSQL
```

### Pré-requisitos (ações do operador)

1. Escolha e verifique os domínios da aplicação/API; provisionar banco e usuário PostgreSQL dedicados, com privilégios mínimos, backup automático do provedor e destino separado para teste de restauração. Não compartilhar credenciais/banco com escola, quiosque RFID ou demo pública. Em PostgreSQL gerenciado, use o hostname e a CA do provedor e siga os parâmetros TLS específicos do cliente. `sslmode=verify-full` é uma configuração do libpq para `pg_dump`/`psql`; não a copie para uma URL Prisma sem confirmar que a versão instalada a aceita. Mantenha uma URL libpq separada para backup/restore quando Prisma e as ferramentas PostgreSQL exigirem parâmetros diferentes, e nunca desative a validação TLS em produção. [Documentação SSL do PostgreSQL](https://www.postgresql.org/docs/current/libpq-ssl.html)
2. Provisionar VM, Docker Engine/Compose, Nginx, ferramentas cliente PostgreSQL e conta de deployment não-root. No NSG/Security Lists Oracle Cloud e firewall da VM, liberar apenas HTTPS (preferencialmente apenas origens Cloudflare) e SSH administrativo controlado. Não expor 3000, 3001 nem PostgreSQL publicamente.
3. Obter TLS de origem para o hostname real da API. No Cloudflare, usar **Full (strict)**. Nunca versionar chave privada. Conferir hostname, cadeia e validade do certificado e configurar renovação/alerta de expiração.
4. Copiar `.env.production.example` para `.env.production`, modo `0600`, e preencher origem verificada, allowlist, `JWT_SECRET` forte gerado externamente, URLs do banco dedicado e `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` de uso único para o seed inicial. Não colocar segredos no Git, variáveis frontend, argumentos de build ou layers Docker. `DIRECT_URL` pode ser omitida; Prisma usa `DATABASE_URL` como fallback.
5. Revise `deploy/nginx/eduassets-cloudflare-realip.conf.example`, que registra ranges obtidos nas fontes oficiais Cloudflare em 2026-10-22. Confira novamente a lista oficial imediatamente antes da implantação e periodicamente; instale os ranges atuais em `/etc/nginx/snippets/eduassets-cloudflare-realip.conf`, um `set_real_ip_from` por range. Só confie em `CF-Connecting-IP` de peers validados e restrinja a origem também nos firewalls da nuvem e do host.

## Build, migração e início

Na VM, a partir de um checkout de release revisado:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
# Edite após verificar DNS, banco e certificado.
docker compose --env-file .env.production -f docker-compose.production.yml build api migrate seed
# Fazer e conferir backup novo antes de mudança de schema.
set -a; . ./.env.production; set +a
DATABASE_URL="$DATABASE_URL" BACKUP_DIR=./backups ./deploy/scripts/backup-postgres.sh
# Conferir que o dump existe/não está vazio; idealmente restaurá-lo em outro banco vazio de teste.
docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm migrate
docker compose --env-file .env.production -f docker-compose.production.yml --profile release run --rm seed
# Verifique login administrativo pela UI/API usando valores do arquivo protegido.
# Depois altere a senha no fluxo autenticado e remova/limpe SEED_ADMIN_* de .env.production.
docker compose --env-file .env.production -f docker-compose.production.yml up -d api
docker compose --env-file .env.production -f docker-compose.production.yml ps
API_ORIGIN="${API_ORIGIN:?defina a origem da API verificada pelo operador}"
curl --fail "${API_ORIGIN%/}/health"
curl --fail "${API_ORIGIN%/}/ready"
```

A migration `20261022110000_user_session_version` rejeita JWTs antigos sem o novo claim; planeje novo login dos usuários após esta release.

A imagem multi-stage mantém apenas dependências de produção no runtime, roda como usuário Node sem privilégio, remove capabilities Linux, usa filesystem root somente leitura e tem política de restart. O alvo `migration` contém Prisma CLI/TSX apenas para operação explícita. O build fornece URL sintética loopback para `prisma generate`; ela não é configuração runtime. Migrações nunca rodam automaticamente no startup. `npm ci --omit=dev` sozinho não é fluxo de release: etapa de migração precisa do Prisma CLI, enquanto o runtime é podado após gerar o client.

Na configuração de build do Cloudflare Pages, use raiz `/`, comando `npm run build` e diretório `dist`. Defina `VITE_API_BASE_URL=https://api.eduassets.tech` e `VITE_RFID_BRIDGE_ENABLED=false`. `VITE_DOCS_BASE_URL` é opcional: se vazia, o app usa `https://docs.eduassets.tech`; se definida, deve conter a origem base, sem `/docs`. O fallback local é usado se a requisição remota falhar ou não tiver sucesso. Configure `CORS_ORIGIN=https://app.eduassets.tech` na API, sem barra final. A CSP do frontend deve permitir API, `https://docs.eduassets.tech` e o beacon oficial Cloudflare Analytics. CI valida código e templates, mas não publica Pages nem implanta na VM. Consulte `Hospedagem.md` para DNS, Nginx, Docker, firewall, CORS e diagnóstico.

## Nginx, proxy confiável e TLS

Revise `deploy/nginx/eduassets-api.conf.example`, substitua hostname e caminhos de certificado pelos valores verificados e instale somente após criar o include de real-IP da Cloudflare com os ranges oficiais atualizados. O include deve confiar apenas nessas faixas; o template sobrescreve `X-Forwarded-For` com o endereço saneado pelo Nginx, não com uma cadeia enviada pelo cliente. A atribuição do IP do cliente no Nginx/Express e os rate limits dependem da cadeia de proxy e das faixas confiáveis atuais; faixas ausentes ou obsoletas podem impedir a identificação correta. Valide essa cadeia no host antes de concluir a configuração. O template bloqueia `/auth/rfid` e `/ws/rfid` e não habilita upgrades WebSocket. Rode `nginx -t` e recarregue somente após revisão do operador.

O backend usa loopback como padrão de serviço direto fora de produção; o container escuta na sua rede isolada, publicado só em loopback da VM. RFID público permanece off (`RFID_BRIDGE_ENABLED=false`, `VITE_RFID_BRIDGE_ENABLED=false`); não há rota proxy `/ws`. Não colocar quiosque RFID na instância pública.


Para deployments públicos, configure uma regra Cloudflare WAF/limite de taxa revisada para `POST /auth/login`, além do limitador da aplicação. Essa configuração externa não é criada nem verificada por este repositório.

## Saúde, logs e monitoramento

- `GET /health` é liveness e deliberadamente não depende do PostgreSQL.
- `GET /ready` executa `SELECT 1` com timeout limitado; retorna só `{status:"ready"}` ou HTTP 503 `{status:"unavailable"}`.
- Docker monitora `/ready`; indisponibilidade do PostgreSQL pode deixar o container `unhealthy`. `restart: unless-stopped` não reinicia um container apenas porque está `unhealthy`; monitore e alerte esse estado separadamente.
- Logs vão para stdout/stderr e a rotação Docker está limitada a 10 MB × 5 arquivos por container; consultar `docker compose ... logs --since=1h api`. Não registrar bearer tokens, tokens RFID, segredos da ponte ou dados pessoais brutos.

## Backup, retenção e recuperação

No checkout do backend, execute [`deploy/scripts/backup-postgres.sh`](https://github.com/edu-assets/eduAssets/blob/main/deploy/scripts/backup-postgres.sh) com env file protegido ou secret manager. O backup custom-format (`pg_dump`) recebe permissão 0600. Agende-o pelo serviço de backup/host aprovado; o repositório backend não instala um agendamento. Armazene-o criptografado fora da VM e separado das credenciais do banco. Política inicial recomendada: 30 pontos diários e 12 mensais, ajustada a RPO/RTO aprovados e regras de retenção de dados. O script não exclui backups antigos; retenção deve ficar no sistema de armazenamento aprovado, com alerta de falhas.

Para ensaio, crie banco **novo, vazio e descartável**. No mesmo checkout do backend, consulte [`deploy/scripts/restore-postgres-empty-db.sh`](https://github.com/edu-assets/eduAssets/blob/main/deploy/scripts/restore-postgres-empty-db.sh) e execute:

```bash
DATABASE_URL='postgresql://...novo-banco-vazio-de-teste...' \
BACKUP_FILE='./backups/eduassets-AAAAMMDDTHHMMSSZ.dump' \
RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE \
./deploy/scripts/restore-postgres-empty-db.sh
```

O script recusa objetos preexistentes em qualquer schema não sistêmico e não usa `pg_restore --clean`. Verifique o schema restaurado e execute smoke test sintético. Não restaure sobre produção como atalho de rollback.

## Release e rollback

Antes de release: verificar backup e evidência de restauração; buildar/taguear imagens imutáveis e definir `EDUASSETS_IMAGE_TAG` explicitamente, mantendo registrada a tag anterior; executar CI; revisar SQL da migration; aplicá-la como etapa explícita; subir uma instância da API; testar `/health`, `/ready`, CORS, login, allowlists do Guest e fluxos principais; então publicar manualmente o build do Cloudflare Pages. Os workflows atuais de CI validam código e smoke tests, mas não publicam/deployam automaticamente.

Rollback Git/imagem **não reverte migração**. Usar migrações compatíveis para frente/trás (expand/migrate/contract). Se uma migração não for compatível, restaurar somente por plano aprovado de incidente, avaliando perda de dados; não executar SQL de rollback às cegas. Primeira migração de produção, backups, TLS, firewall, Cloudflare Pages e monitoramento continuam tarefas externas não verificadas.

## Diagnóstico

- Falha no startup: revisar `JWT_SECRET`, `DATABASE_URL`, `TRUST_PROXY` explícito, `CORS_ORIGIN`, `PORT` e RFID desativado em produção. As mensagens não devem revelar valores secretos.
- `/health` funciona, `/ready` retorna 503: verificar reachability/credenciais PostgreSQL de forma privada; o endpoint não expõe detalhes.
- Erro CORS/CSP no navegador: conferir domínio personalizado Cloudflare Pages, CSP `connect-src` do `_headers`, origem CORS exata, DNS/TLS e headers do proxy. Não ampliar CSP para `*`.
- Rate limit agrupa clientes: revisar real-IP Nginx baseado somente em ranges Cloudflare atuais, headers sobrescritos e `TRUST_PROXY=1` coerente com um salto.
- RFID indisponível em deployment público é intencional.
