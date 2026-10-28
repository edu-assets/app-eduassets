# Implantação e operação

> **Registro histórico (23/10/2026):** o operador validou naquele momento o frontend Cloudflare Pages em `app.eduassets.tech`, a API Nginx na VM Oracle em `api.eduassets.tech`, a configuração do Neon, HTTPS externo e preflight CORS. Em 28/10/2026, o operador também registrou uma execução manual de backup criptografado em R2, aplicação da migration de auditoria e respostas bem-sucedidas de `/health` e `/ready`; os detalhes e limites estão no registro v1.0.1 abaixo. Esses registros são datados e não representam monitoramento contínuo.

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

O backend é mantido no repositório separado [`edu-assets/api-eduassets`](https://github.com/edu-assets/api-eduassets). Na atualização registrada, o checkout de produção ficava em `/opt/api-eduassets` e o projeto Compose se chamava `eduassets`. Use um commit revisado, não uma alteração local desconhecida. Depois de aprovar o commit e o CI:

```bash
cd /opt/api-eduassets
git fetch origin main
git switch main
git pull --ff-only origin main
git rev-parse --short=12 HEAD
chmod 600 .env.production
export EDUASSETS_IMAGE_TAG="$(git rev-parse --short=12 HEAD)"
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml config --quiet
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml build --pull api migrate
```

Confirme um backup criptografado antes de migrations. Use uma URL **Direct** compatível com libpq, sem senha; para PostgreSQL 18, use `pg_dump` major 18 ou posterior. Armazene a senha em `/etc/eduassets/pgpass` (modo `0600`) e use apenas a chave pública `age` na VM; mantenha a identidade privada fora da VM. Exemplo de ambiente, sem credenciais reais:

```bash
export DATABASE_URL='postgresql://USUARIO@HOST_DIRECT:5432/BANCO?sslmode=require&channel_binding=require'
export PGPASSFILE='/etc/eduassets/pgpass'
export AGE_RECIPIENT="$(< /etc/eduassets/age-recipient.txt)"
export RCLONE_DESTINATION='offsite:<bucket>/postgres'
export BACKUP_DIR='/var/backups/eduassets'
export PATH="/usr/lib/postgresql/18/bin:$PATH"
./deploy/scripts/backup-postgres.sh
ls -lh "$BACKUP_DIR"/*.dump.age
rclone ls "$RCLONE_DESTINATION"
```

Interrompa a release se o script falhar ou o objeto novo não aparecer no armazenamento externo. A listagem confirma transferência, não uma restauração. Este repositório não agenda backups nem implementa retenção automática.

Aplique a migration como etapa explícita e reinicie somente o serviço da API:

```bash
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml --profile release run --rm --no-deps migrate
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml up -d --no-build --force-recreate api
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml ps
docker compose -p eduassets --env-file .env.production -f docker-compose.production.yml logs --since=10m --tail=100 api
curl --fail --show-error http://127.0.0.1:3000/health
curl --fail --show-error http://127.0.0.1:3000/ready
curl --fail --show-error https://api.eduassets.tech/health
curl --fail --show-error https://api.eduassets.tech/ready
```

Não rode `seed` em atualização normal. O serviço `seed` é somente para provisionamento inicial revisado, com banco correto e variáveis `SEED_*` temporárias. `20261028173000_user_management_audit` cria o schema de gestão de usuários/auditoria e precisa ser aplicada antes de iniciar a API correspondente.

A imagem multi-stage mantém apenas dependências de produção no runtime, roda sem privilégios, remove capabilities Linux, usa filesystem root somente leitura e possui política de restart. O alvo de migration mantém Prisma CLI/TSX para a etapa de release explícita. A geração do Prisma Client usa URL sintética local somente durante build; migrations nunca rodam automaticamente no startup.

Na configuração do Cloudflare Pages, use raiz `/`, `npm run build` e diretório `dist`; defina `VITE_API_BASE_URL=https://api.eduassets.tech` e `VITE_RFID_BRIDGE_ENABLED=false`. Não existe `VITE_DOCS_BASE_URL`. O frontend carrega Markdown de um commit imutável fixado em `src/core/docs/docsService.ts` por `raw.githubusercontent.com`; use o fallback local apenas se a requisição falhar. Configure `CORS_ORIGIN=https://app.eduassets.tech`, sem barra final. A CSP precisa permitir a API, `https://raw.githubusercontent.com` e o beacon oficial do Cloudflare Analytics. CI valida código/templates, mas não implanta Pages nem a VM.

## Registro da release de produção — 28 de outubro de 2026

O operador confirmou a atualização da API no repositório `edu-assets/api-eduassets`, commit `14b0716110750857daa27d0e979e3bec574e39e0`. As imagens `eduassets-backend` e `eduassets-backend-migration` foram construídas com a tag curta `14b071611075`; `20261028173000_user_management_audit` foi aplicada e o serviço `api` foi recriado sem rebuild. Os endpoints `/health` e `/ready` responderam com os estados esperados tanto via loopback da VM quanto por `https://api.eduassets.tech`. A primeira leitura de `docker compose ps` ocorreu durante `health: starting`; não foi registrada uma leitura posterior de `healthy`.

Antes da migration, o operador gerou `eduassets-20261028T223140Z.dump.age` com `pg_dump` 18.6 contra Neon 18.6 usando URL Direct sem senha e `PGPASSFILE` modo `0600`; `age` criptografou o dump e o `rclone` transferiu o ciphertext para o bucket Cloudflare R2 `eduassets-postgres-backups`. O objeto de 328366 bytes foi listado no R2. O primeiro `PUT` recebeu HTTP 501, mas a tentativa automática seguinte concluiu o envio. O teste de restore local em banco descartável está registrado separadamente no runbook da API; **não foi realizado restore desse objeto de produção**. Esta implantação também não configurou agendamento/retention do backup nem alterou Nginx/firewall/Cloudflare.

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

No checkout do backend, execute [`deploy/scripts/backup-postgres.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/backup-postgres.sh) com env file protegido ou secret manager. O backup custom-format (`pg_dump`) recebe permissão 0600. Agende-o pelo serviço de backup/host aprovado; o repositório backend não instala um agendamento. Armazene-o criptografado fora da VM e separado das credenciais do banco. Política inicial recomendada: 30 pontos diários e 12 mensais, ajustada a RPO/RTO aprovados e regras de retenção de dados. O script não exclui backups antigos; retenção deve ficar no sistema de armazenamento aprovado, com alerta de falhas.

Para ensaio, crie banco **novo, vazio e descartável**. No mesmo checkout do backend, consulte [`deploy/scripts/restore-postgres-empty-db.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/restore-postgres-empty-db.sh) e execute:

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
