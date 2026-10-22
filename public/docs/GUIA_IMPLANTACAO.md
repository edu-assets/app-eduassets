# Implantação e operação

> **Status: apenas preparação.** O repositório contém templates, mas nenhum projeto Vercel, VM Oracle Cloud, nome DNS, origem Cloudflare, banco, certificado, firewall, rotina de backup ou conta de monitoramento foi verificado ou alterado. Nenhum hostname de produção está designado aqui; este guia não prova que exista serviço ativo.

## Topologia escolhida

A arquitetura de referência é frontend estático na Vercel e uma instância Docker do backend em VM dedicada, atrás de Nginx local e Cloudflare em modo Full (strict). O PostgreSQL deve ser dedicado a essa implantação. O container escuta em `0.0.0.0:3000` dentro da rede Docker, mas a VM publica somente `127.0.0.1:3000`. RFID fica desativado na instância pública. Não conectar demo e dados operacionais.

```text
Navegador → frontend estático Vercel → Cloudflare HTTPS → Nginx :443
                                                       → 127.0.0.1:3000 API Docker → PostgreSQL
```

### Pré-requisitos (ações do operador)

1. Escolha e verifique os domínios da aplicação/API; provisionar banco e usuário PostgreSQL dedicados, com privilégios mínimos, backup automático do provedor e destino separado para teste de restauração. Não compartilhar credenciais/banco com escola, quiosque RFID ou demo pública. Em PostgreSQL gerenciado, use o hostname e a CA do provedor e prefira `sslmode=verify-full`, que valida a cadeia de confiança e o hostname; siga os parâmetros específicos do provedor e nunca desative a validação TLS em produção. [Documentação SSL do PostgreSQL](https://www.postgresql.org/docs/current/libpq-ssl.html)
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

Na Vercel, definir raiz do projeto `frontend`, instalar pelo `frontend/package-lock.json`, build `npm run build` e variável pública `VITE_API_BASE_URL` com a origem HTTPS verificada pelo operador. Manter `VITE_RFID_BRIDGE_ENABLED=false`. `frontend/vercel.json` é a configuração de headers escolhida; `frontend/public/_headers` foi removido. A política `connect-src` permite `'self'` e o hostname intencional documentado `https://api.eduassets.tech`; se o operador escolher outra origem verificada, atualizar a CSP e a variável de build. DNS, aplicação Vercel e headers reais continuam checagens externas; parse JSON local não prova que a Vercel aplicou esses headers.

## Nginx, proxy confiável e TLS

Revise `deploy/nginx/eduassets-api.conf.example`, substitua hostname e caminhos de certificado pelos valores verificados e instale apenas após criar o include Cloudflare real-IP. O template retorna 404 para as rotas públicas exatas `/auth/rfid` e `/ws/rfid` e encaminha o restante em `/` para a API; não habilita upgrades WebSocket. O endereço de loopback observado pelo Nginx não prova que o chamador original é local, portanto RFID permanece restrito ao quiosque separado. Define `X-Forwarded-For` com `$remote_addr` saneado pelo Nginx, não com uma cadeia arbitrária enviada pelo cliente, e usa limites razoáveis de corpo/timeout. Rode `nginx -t` e recarregue após revisão do operador. `TRUST_PROXY=1` significa exatamente um salto; nunca usar `true` nem confiar em forwarded headers sem validação. Sem ranges Cloudflare atualizados, Express vê o IP de edge e rate limits podem agrupar clientes; a validação em produção de IP/rate limits permanece pendente externa.

O backend usa loopback como padrão de serviço direto fora de produção; o container escuta na sua rede isolada, publicado só em loopback da VM. RFID público permanece off (`RFID_BRIDGE_ENABLED=false`, `VITE_RFID_BRIDGE_ENABLED=false`); não há rota proxy `/ws`. Não colocar quiosque RFID na instância pública.

## Saúde, logs e monitoramento

- `GET /health` é liveness e deliberadamente não depende do PostgreSQL.
- `GET /ready` executa `SELECT 1` com timeout limitado; retorna só `{status:"ready"}` ou HTTP 503 `{status:"unavailable"}`.
- Docker monitora `/ready`. Configurar monitoramento externo de HTTPS `/health` e `/ready`, alertas para 5xx, disco, banco, expiração TLS, falha/ausência de backup e CPU/memória. Teste local não configura monitoramento.
- Logs vão para stdout/stderr e a rotação Docker está limitada a 10 MB × 5 arquivos por container; consultar `docker compose ... logs --since=1h api`. Não registrar bearer tokens, tokens RFID, segredos da ponte ou dados pessoais brutos.

## Backup, retenção e recuperação

Execute `deploy/scripts/backup-postgres.sh` com env file protegido ou secret manager. O backup custom-format (`pg_dump`) recebe permissão 0600. Agende-o pelo serviço de backup/host aprovado; este repositório não instala um agendamento. Armazene-o criptografado fora da VM e separado das credenciais do banco. Política inicial recomendada: 30 pontos diários e 12 mensais, ajustada a RPO/RTO aprovados e regras de retenção de dados. O script não exclui backups antigos; retenção deve ficar no sistema de armazenamento aprovado, com alerta de falhas.

Para ensaio, crie banco **novo, vazio e descartável** e execute:

```bash
DATABASE_URL='postgresql://...novo-banco-vazio-de-teste...' \
BACKUP_FILE='./backups/eduassets-AAAAMMDDTHHMMSSZ.dump' \
RESTORE_CONFIRM=RESTORE_TO_EMPTY_DATABASE \
./deploy/scripts/restore-postgres-empty-db.sh
```

O script recusa schema público não vazio e nunca usa `pg_restore --clean`. Verifique schema restaurado e smoke test sintético. Não restaurar sobre produção como atalho de rollback.

## Release e rollback

Antes de release: verificar backup/restauração; build/tag de imagens imutáveis; CI verde; revisar SQL de migração; aplicar migração explicitamente; subir uma API; testar `/health`, `/ready`, CORS, login, allowlists de Guest e fluxos principais; então publicar Vercel com a mesma origem de API. Manter tag de imagem anterior para rollback de código.

Rollback Git/imagem **não reverte migração**. Usar migrações compatíveis para frente/trás (expand/migrate/contract). Se uma migração não for compatível, restaurar somente por plano aprovado de incidente, avaliando perda de dados; não executar SQL de rollback às cegas. Primeira migração de produção, backups, TLS, firewall, Vercel e monitoramento continuam tarefas externas não verificadas.

## Diagnóstico

- Falha no startup: revisar `JWT_SECRET`, `DATABASE_URL`, `TRUST_PROXY` explícito, `CORS_ORIGIN`, `PORT` e RFID desativado em produção. As mensagens não devem revelar valores secretos.
- `/health` funciona, `/ready` retorna 503: verificar reachability/credenciais PostgreSQL de forma privada; o endpoint não expõe detalhes.
- Erro CORS/CSP no navegador: conferir URL de build Vercel, CSP `connect-src`, origem CORS exata, DNS/TLS e headers do proxy. Não ampliar CSP para `*`.
- Rate limit agrupa clientes: revisar real-IP Nginx baseado somente em ranges Cloudflare atuais, headers sobrescritos e `TRUST_PROXY=1` coerente com um salto.
- RFID indisponível em deployment público é intencional.
