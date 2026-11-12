# Hospedagem e operação do EduAssets

> **Versão do produto: oficial 1.2.0 (12/11/2026).** O registro abaixo descreve a topologia observada em 23/10/2026; não é uma verificação da infraestrutura remota no momento desta leitura.

## 1. Topologia implantada

A implantação usa três hostnames distintos:

- `eduassets.tech`: landing page independente, publicada em outro projeto Cloudflare;
- `app.eduassets.tech`: frontend estático do EduAssets, publicado no Cloudflare Pages;
- `api.eduassets.tech`: backend Node.js/Express, executado em um container Docker na VM Ubuntu da Oracle Cloud;
- `docs.eduassets.tech`: documentação Markdown pública servida pelo projeto Cloudflare Pages dedicado.

O PostgreSQL permanece remoto no Neon. A VM tem somente 1 GB de RAM, portanto não hospeda o banco localmente.

```text
Navegador
  ├─ https://eduassets.tech       → landing page Cloudflare
  └─ https://app.eduassets.tech   → Cloudflare Pages
                                      │ HTTPS/API
                                      ▼
                            https://api.eduassets.tech
                                      │ Cloudflare proxy
                                      ▼
                         VM Oracle Cloud / Nginx :443
                                      │ proxy local
                                      ▼
                      Docker API em 127.0.0.1:3000
                                      │ TLS PostgreSQL
                                      ▼
                                  Neon
```

A porta `3000` não deve ser publicada na Internet. O Docker publica a API somente em `127.0.0.1:3000`; o Nginx é o único serviço público da VM.

## 2. Pré-requisitos

Na VM são necessários Ubuntu, Docker Engine com Docker Compose, Nginx, UFW e acesso administrativo por SSH. No Cloudflare são necessários a zona `eduassets.tech`, o projeto Pages do frontend e o DNS do hostname da API.

Use um arquivo protegido na VM:

```bash
cd /opt/api-eduassets
chmod 600 .env.production
```

Os valores essenciais de produção são:

```env
NODE_ENV=production
DATABASE_URL=<URL do Neon, sem documentar o valor real>
JWT_SECRET=<segredo forte, somente na VM>
CORS_ORIGIN=https://app.eduassets.tech
TRUST_PROXY=1
RFID_BRIDGE_ENABLED=false
```

`CORS_ORIGIN` deve ser exatamente a origem do frontend, sem barra final. Nunca copie `DATABASE_URL`, `JWT_SECRET`, senhas, tokens ou chaves para Git, documentação ou variáveis `VITE_*`.

## 3. Configuração do Cloudflare Pages

No projeto Pages do frontend:

1. Repositório: `edu-assets/app-eduassets`.
2. Branch de produção: `main`.
3. Diretório-raiz: `/` (raiz do repositório).
4. Comando de build: `npm run build`.
5. Diretório de saída: `dist`.
6. Variáveis públicas de build:

```env
VITE_API_BASE_URL=https://api.eduassets.tech
VITE_RFID_BRIDGE_ENABLED=false
```

7. Domínio personalizado: `app.eduassets.tech`.

O navegador carrega o Markdown por um commit imutável fixado em `src/core/docs/docsService.ts`, via `raw.githubusercontent.com`. `docs.eduassets.tech` continua como site público dos guias, mas não é a origem de busca padrão do app. O arquivo `public/_headers` é copiado para `dist/_headers`. A CSP de produção deve permitir a API, a origem fixada dos guias, o beacon oficial do Cloudflare Web Analytics e o Google Analytics:

```text
script-src 'self' https://static.cloudflareinsights.com https://*.googletagmanager.com
img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com
connect-src 'self' https://api.eduassets.tech https://docs.eduassets.tech https://raw.githubusercontent.com https://cloudflareinsights.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com
```

O beacon do Analytics era bloqueado quando a política continha apenas `script-src 'self'`. A política não permite scripts inline: o Google Analytics (`G-9LJ1MQRCEV`) é carregado por um módulo do próprio app (`src/core/analytics/analyticsConsent.ts`) **somente depois do aceite** no banner de cookies; sem aceite, nenhum script do Google é requisitado. O endereço enviado ao Google nunca inclui fragmentos com valores, como o link de recuperação de senha. O site `eduassets.tech` usa o mesmo mecanismo (`src/scripts/analytics-consent.ts`) e uma CSP equivalente. A CI do app falha se a CSP deixar de permitir o Google Analytics ou passar a aceitar `'unsafe-inline'`. As políticas de privacidade e de cookies descrevem esse tratamento (§16). Depois de alterar `_headers`, é necessário aguardar um novo deploy do Pages e fazer um recarregamento completo no navegador.

## 4. DNS e TLS

O registro canônico da API é:

```text
Type: A
Name: api
Content: <IP público atual da VM Oracle>
Proxy status: Proxied
```

O IP público de origem da VM foi intencionalmente omitido deste guia. Consulte o inventário de infraestrutura autorizado para obter o valor atual quando uma alteração de DNS aprovada exigir; não inclua o endereço de origem em documentação pública.

Mantenha um único registro para `api.eduassets.tech`; registros duplicados para o mesmo hostname devem ser removidos. `app` e o domínio raiz podem continuar apontando para seus projetos Cloudflare respectivos.

No Cloudflare, use **Full (strict)** quando o certificado de origem correspondente a `api.eduassets.tech` estiver instalado no Nginx. Nunca publique a chave privada do certificado.

## 5. Subir e atualizar a API

A API de produção é gerenciada pelo Compose, e não por `npm run dev`:

```bash
cd /opt/api-eduassets

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  ps
```

Para iniciar um container parado:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d api
```

O comando abreviado abaixo serve apenas para alteração de código/configuração **sem migration de banco**. Se a release incluir migration de schema, siga o [Guia de Implantação](GUIA_IMPLANTACAO.md): backup verificado, execução explícita do serviço `migrate` e só então inicialização/atualização da API. A CI valida código e executa smoke em ambiente descartável; não publica no Cloudflare nem faz deploy na VM Oracle.

Após `git pull` ou alteração do ambiente sem migration:

```bash
git pull --ff-only origin main

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d --build --force-recreate api
```

Após mudar somente `.env.production`, a recriação também é obrigatória:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  up -d --force-recreate api
```

Confirme que o container recebeu a origem correta:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  exec api printenv CORS_ORIGIN
```

A saída esperada é:

```text
https://app.eduassets.tech
```

Migrações e seed são operações explícitas. Não execute seed contra um banco desconhecido ou de produção sem backup e revisão. A API não deve aplicar migrações automaticamente no startup.

### 5.1 Deploy automático da API (pull na VM)

A partir da v1.2.0, a própria VM pode implantar a API: [`auto-deploy.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/auto-deploy.sh), acionado a cada 5 minutos por `eduassets-deploy.timer`, faz `git fetch` do `main` e só age quando o `origin/main` avançou **e** os jobs `verify` e `production-smoke` da CI passaram para aquele commit exato (consulta pública à API do GitHub; nenhuma porta de entrada é aberta e nenhuma chave da VM fica no GitHub). A sequência é:

1. avanço *fast-forward* do checkout (recusa histórico divergente ou alterações locais);
2. build da imagem com a tag `git rev-parse --short=12` do commit;
3. somente se o release trouxer novas migrations: backup criptografado (`run-scheduled-backup.sh`) e execução explícita do serviço `migrate` — se qualquer um falhar, a API não é tocada;
4. `up -d --no-build --force-recreate api` e espera de até 180 s por `healthy` + `/ready`;
5. sucesso: registra o commit em `/var/lib/eduassets-deploy/history` e remove imagens antigas, mantendo a atual e a anterior;
6. falha: volta o checkout e o container para o commit/imagem anteriores e grava o commit em `/var/lib/eduassets-deploy/failed-sha`, que não é tentado de novo (o `vm-health-check.sh` passa a reportar a falha até um novo push ou a remoção desse arquivo).

O rollback de código/imagem **não desfaz migrations**: mantenha migrations compatíveis com a versão anterior (expand/migrate/contract), como no Guia de Implantação. Ativação (uma vez, como root):

```bash
cd /opt/api-eduassets
git pull --ff-only origin main
install -m 600 deploy/systemd/deploy.env.example /etc/eduassets/deploy.env   # opcional; revise os valores
install -m 644 deploy/systemd/eduassets-deploy.service deploy/systemd/eduassets-deploy.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now eduassets-deploy.timer
journalctl -u eduassets-deploy -n 30 --no-pager
```

Para pausar o deploy automático: `systemctl disable --now eduassets-deploy.timer`. Para forçar uma nova tentativa de um commit que falhou: `rm /var/lib/eduassets-deploy/failed-sha`.

### 5.2 E-mail de recuperação de senha (Brevo)

A recuperação de senha self-service envia o link por SMTP. Sem as quatro variáveis obrigatórias abaixo a funcionalidade fica desativada (o link **Esqueci minha senha** não aparece e o endpoint responde `503`); configuração parcial impede a API de iniciar. A API não depende de um provedor específico: qualquer servidor SMTP com TLS funciona (porta `465` usa TLS implícito; as demais usam STARTTLS obrigatório). Em produção o envio é feito pelo **Brevo** (plano gratuito) e a caixa do domínio continua no **Zoho Mail**, usada só para receber. Em `.env.production`:

```bash
APP_PUBLIC_URL=https://app.eduassets.tech
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587                                   # STARTTLS
SMTP_USER=<login SMTP exibido em Brevo → SMTP e API>
SMTP_PASS=<chave SMTP gerada no Brevo>          # segredo: nunca versionar nem colar em chats
MAIL_FROM="eduAssets <nao-responda@eduassets.tech>"
SUPPORT_EMAIL=dasilva-thiago@eduassets.tech     # opcional: contato no rodapé e Reply-To
PUBLIC_SITE_URL=https://eduassets.tech          # opcional: link do site no rodapé
```

**Configuração do Brevo (uma vez):**

1. **Remetentes, domínios e IPs → Domínios:** autenticar `eduassets.tech` (registro `TXT` `brevo-code:…` na raiz, `CNAME` `brevo1._domainkey` e `brevo2._domainkey` para a DKIM do Brevo e o `_dmarc` descrito em §15).
2. **Subdomínio de marca `em`:** `CNAME` `em`, `r.em` (redirecionamento dos links rastreados) e `img.em` (imagens), todos em **DNS only** no Cloudflare. O Brevo emite sozinho o certificado HTTPS de `r.em.eduassets.tech`; até isso acontecer, os links rastreados do e-mail abrem com erro de certificado (ver o registro em §14).
3. **Remetentes:** cadastrar `nao-responda@eduassets.tech`. A caixa existe no Zoho Mail (plano gratuito, sem SMTP/IMAP), apenas para receber a verificação do Brevo e eventuais respostas.
4. **Segurança → IPs autorizados:** com a lista de IPs ativa, incluir o IP público da VM; sem isso o Brevo recusa a autenticação SMTP.
5. **SMTP e API:** gerar a chave SMTP e gravá-la apenas em `.env.production` (modo `0600`).

O Brevo reescreve os links do e-mail para registrar cliques (`https://r.em.eduassets.tech/tr/cl/…`) e redireciona para o destino original, preservando o fragmento `#redefinir-senha=…`; o painel não oferece opção para desligar esse rastreamento em e-mails transacionais. O plano gratuito também acrescenta o cabeçalho de descadastro, exibido como **Cancelar inscrição** por alguns clientes de e-mail. O plano gratuito tem limite diário de envios; confira o valor atual no painel.

**Conteúdo do e-mail:** HTML responsivo em português ou inglês (conforme o idioma da tela de entrada) com versão em texto puro, assunto **Redefinição de senha do eduAssets** / **Reset your eduAssets password**, banner da marca embutido como anexo inline (`cid`, sem depender de imagens externas), botão **Definir nova senha** com o link por extenso, quadro com conta, data/hora do pedido (horário de Brasília) e validade (30 minutos, uso único), próximos passos, aviso de segurança e rodapé com links do app, do site e do suporte. Com `SUPPORT_EMAIL`, as respostas vão para o suporte (Reply-To) em vez do remetente `nao-responda@`. O banner fica em `backend/assets/email/header.jpg` no repositório da API e é copiado para a imagem Docker.

Depois de editar `.env.production`, recrie o serviço `api` **com a tag da imagem em execução** — sem `EDUASSETS_IMAGE_TAG`, o Compose procura `eduassets-backend:local`, que não existe na VM:

```bash
cd /opt/api-eduassets
TAG=$(docker inspect eduassets-api-1 --format '{{.Config.Image}}' | cut -d: -f2)
sudo EDUASSETS_IMAGE_TAG="$TAG" docker compose -p eduassets -f docker-compose.production.yml \
  --env-file .env.production up -d --no-build --force-recreate api
curl -s https://api.eduassets.tech/auth/session-capabilities   # "passwordRecovery": true
```

A Oracle Cloud bloqueia apenas a porta 25 de saída; 465/587 funcionam.

## 6. Nginx

O Nginx aceita conexões HTTPS na porta TCP 443, conforme o bind da configuração revisada, e encaminha para a API local. Valide antes de recarregar:

```bash
sudo nginx -t
sudo ss -ltnp | grep -E ':(80|443)\b' || true
sudo systemctl status nginx --no-pager
```

Teste localmente sem passar pelo Cloudflare:

```bash
curl -vk --max-time 10 \
  --resolve api.eduassets.tech:443:127.0.0.1 \
  https://api.eduassets.tech/health
```

O teste com `--resolve` força acesso direto à origem e contorna o proxy Cloudflare; ele pode não reproduzir a cadeia de proxy/IP confiável do tráfego normal. Execute-o somente com a configuração Nginx/real-IP revisada e interprete-o como teste de origem, não como teste completo do caminho público. A configuração pública mantém RFID desligado.

## 7. Firewall: falha encontrada e correção

Durante a implantação, a VM recebia os pacotes SYN na interface, mas o cliente externo expirava. A API em `127.0.0.1:3000` e o Nginx local respondiam `200`. A causa era a chain `INPUT` do iptables:

```text
Chain INPUT (policy DROP)
...
REJECT all ... reject-with icmp-host-prohibited
ufw-before-input ...
```

O `REJECT` genérico vinha antes das chains do UFW, portanto as regras `ufw allow 80/tcp` e `ufw allow 443/tcp` não eram alcançadas. A correção segura foi permitir somente novas conexões TCP nas portas públicas antes do bloqueio:

```bash
sudo iptables -I INPUT 5 -p tcp --dport 80 \
  -m conntrack --ctstate NEW -j ACCEPT

sudo iptables -I INPUT 5 -p tcp --dport 443 \
  -m conntrack --ctstate NEW -j ACCEPT
```

Não remova o `REJECT` genérico, não abra a porta `3000` e não altere `FORWARD` sem evidência de que o Docker está sendo bloqueado. Confirme a ordem:

```bash
sudo iptables -L INPUT -n -v --line-numbers
```

As regras de 80/443 precisam estar acima do `REJECT`. Persista somente depois de validar o acesso:

```bash
if command -v netfilter-persistent >/dev/null 2>&1; then
  sudo netfilter-persistent save
else
  sudo mkdir -p /etc/iptables
  sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
fi
```

Além do firewall local, a VCN/NSG ou Security List da Oracle deve permitir TCP 80 e 443 de acordo com a política de origem. O SSH deve permanecer restrito ao IP administrativo. A porta 3000 e o PostgreSQL não devem ser liberados.

## 8. Diagnóstico em camadas

Verifique primeiro o container:

```bash
curl -i --max-time 10 http://127.0.0.1:3000/health
```

Depois o Nginx local:

```bash
curl -vk --max-time 10 \
  --resolve api.eduassets.tech:443:127.0.0.1 \
  https://api.eduassets.tech/health
```

Depois, de um computador externo, force o IP da VM:

```powershell
curl.exe -vk --max-time 15 `
  --resolve api.eduassets.tech:443:<IP-PÚBLICO-DA-VM> `
  https://api.eduassets.tech/health
```

Interpretação:

- Falha em `127.0.0.1:3000`: container/API ou banco na operação `/ready`.
- Nginx local funciona, mas o teste externo expira: firewall, NSG/Security List, rota ou IP público.
- `522`/`523`: Cloudflare não alcança a origem; ainda não é um erro CORS.
- `204` sem `Access-Control-Allow-Origin`: preflight/CORS ainda incorreto.
- `204` com a origem exata: preflight CORS correto.

Para observar se a conexão externa chega à VM:

```bash
sudo tcpdump -ni any 'tcp port 443'
```

## 9. Validação do CORS

Quando HTTPS estiver acessível, execute no PowerShell:

```powershell
curl.exe -i -X OPTIONS https://api.eduassets.tech/ready `
  -H "Origin: https://app.eduassets.tech" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: authorization,content-type"
```

A resposta validada na implantação foi `204 No Content` e incluiu:

```http
access-control-allow-origin: https://app.eduassets.tech
access-control-allow-methods: GET,HEAD,PUT,PATCH,POST,DELETE
access-control-allow-headers: authorization,content-type
```

Esse teste comprova o preflight; login e fluxos de negócio ainda devem ser testados na interface com uma conta autorizada.

## 10. Saúde, logs e operação contínua

```bash
curl -i https://api.eduassets.tech/health
curl -i https://api.eduassets.tech/ready

docker compose \
  --env-file .env.production \
  -f docker-compose.production.yml \
  logs --tail=100 api
```

`/health` verifica liveness e não depende do PostgreSQL. `/ready` verifica a conexão com o Neon e pode retornar `503` quando o banco estiver indisponível. O healthcheck do Compose pode marcar o container como `unhealthy`; `restart: unless-stopped` não reinicia o processo só por esse estado, então configure monitoramento/alerta separado. A política mantém o serviço após reinício do daemon Docker, desde que o Compose tenha sido iniciado e a política de restart preservada.

O monitoramento é feito em duas camadas, ambas versionadas no repositório da API:

- **Externo (GitHub Actions):** o workflow [`uptime.yml`](https://github.com/edu-assets/api-eduassets/blob/main/.github/workflows/uptime.yml) roda a cada 15 minutos e executa [`public-uptime-check.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/public-uptime-check.sh). Ele verifica `/health` e `/ready` da API (o `/ready` cobre a disponibilidade do Neon), o app, a landing page, o host de documentação, a validade TLS dos quatro hosts (alerta com menos de 14 dias) e o campo `Expires` do `security.txt` (alerta com menos de 30 dias). Uma execução com falha fica vermelha e o GitHub notifica por e-mail a conta que alterou o agendamento por último. O GitHub pausa agendamentos após 60 dias sem atividade no repositório; reative em **Actions** se isso ocorrer. O script também pode ser rodado manualmente: `bash deploy/scripts/public-uptime-check.sh`.
- **Na VM (systemd):** [`vm-health-check.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/vm-health-check.sh), acionado a cada 5 minutos por `eduassets-healthcheck.timer`, verifica uso de disco (`/` e `/var/lib/docker`, limite de 85%), memória disponível, o estado de saúde do container da API e a idade do backup local mais recente (limite de 26 h). Se o container permanecer `unhealthy` por 3 verificações seguidas, ele é reiniciado — o que o `restart: unless-stopped` não faz sozinho. Os resultados vão para o journal (`journalctl -u eduassets-healthcheck`); com `HEALTH_PING_URL` configurado, um serviço do tipo dead-man switch (por exemplo, healthchecks.io) alerta quando há falha ou quando a VM para de reportar.

Instalação na VM (uma vez, como root, a partir do checkout revisado):

```bash
cd /opt/api-eduassets
install -d -m 700 /etc/eduassets /var/lib/eduassets-health
install -m 600 deploy/systemd/healthcheck.env.example /etc/eduassets/healthcheck.env   # revise os valores
install -m 644 deploy/systemd/eduassets-healthcheck.service deploy/systemd/eduassets-healthcheck.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now eduassets-healthcheck.timer
systemctl start eduassets-healthcheck.service && journalctl -u eduassets-healthcheck -n 20 --no-pager
```

A cada execução, o `vm-health-check.sh` também lê o log de requisições da API (`docker logs` desde a execução anterior, ignorando o tráfego de healthcheck de `/health` e `/ready`) e acusa problema quando houve **pelo menos 5 respostas 5xx e elas representam pelo menos 5%** das requisições do intervalo (`ERROR_5XX_MIN_COUNT` e `ERROR_5XX_MAX_PERCENT` em `/etc/eduassets/healthcheck.env`). As duas condições juntas evitam alerta por um erro isolado em período de pouco tráfego. Com `HEALTH_PING_URL`, esse problema chega ao dead-man switch como `/fail`. O script também reporta quando o último deploy automático (§5.1) falhou.

## 11. Backup e recuperação

Antes de migrations em banco operacional, execute [backup-postgres.sh](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/backup-postgres.sh) a partir da raiz do checkout do repositório backend, usando uma URL protegida e compatível com `pg_dump`. Para o Neon PostgreSQL 18, use `pg_dump` major 18 ou mais recente; não use um cliente 16 contra o servidor 18.

Quando o `.env` for carregado com `source`, prefira valores sem aspas externas duplicadas. Para operações com `pg_dump`, mantenha uma URL libpq própria se os parâmetros do Prisma forem diferentes. Nunca coloque URLs reais neste documento.

O backup deve ser criptografado, enviado para fora da VM e testado com restauração em um banco novo e vazio. Um arquivo de dump existente, sozinho, não prova que a recuperação funciona.

### 11.1 Backup diário agendado e retenção

[`run-scheduled-backup.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/run-scheduled-backup.sh) executa o `backup-postgres.sh` e, em seguida, [`prune-backups.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/prune-backups.sh). A configuração fica em `/etc/eduassets/backup.env` (modo `0600`; modelo em [`deploy/systemd/backup.env.example`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/systemd/backup.env.example)). A retenção padrão mantém 7 dias de cópias locais e 30 dias no R2 e **nunca apaga nada** se houver menos de 3 backups dentro da janela — assim, um job quebrado não elimina as últimas cópias boas. Opcionalmente, configure no R2 uma regra de ciclo de vida (lifecycle) equivalente como segunda barreira. Com `BACKUP_PING_URL`, um dead-man switch alerta se o backup diário falhar ou não acontecer.

```bash
cd /opt/api-eduassets
sudo install -m 600 -o ubuntu deploy/systemd/backup.env.example /etc/eduassets/backup.env   # preencha com os valores reais
sudo install -m 644 deploy/systemd/eduassets-backup.service deploy/systemd/eduassets-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now eduassets-backup.timer      # todo dia às 03:30 de Brasília (06:30 UTC)
sudo systemctl start eduassets-backup.service && journalctl -u eduassets-backup -n 30 --no-pager
systemctl list-timers 'eduassets-*'
```

Ajuste `User=` em `eduassets-backup.service` se a conta dona de `/etc/eduassets/pgpass` e da configuração do `rclone` não for `ubuntu`.

### 11.2 Ensaio de restauração

[`verify-backup-restore.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/verify-backup-restore.sh) prova que um backup pode ser recuperado. Ele roda **na máquina do operador que guarda a identidade privada `age`** (nunca na VM): baixa o backup mais recente do R2 (ou usa `BACKUP_FILE`), descriptografa localmente, restaura em um PostgreSQL 18 descartável em Docker ligado só a `127.0.0.1`, confere a tabela `_prisma_migrations` (sem migrations inacabadas) e as contagens de linhas e, ao terminar, destrói o container e o dump em texto puro. Ele não se conecta ao banco de produção.

```bash
export AGE_IDENTITY="$HOME/.config/eduassets/age-identity.txt"   # modo 0600
export RCLONE_SOURCE='r2:eduassets-postgres-backups/postgres'
export EXPECTED_MIGRATION='20261028173000_user_management_audit'  # opcional
bash deploy/scripts/verify-backup-restore.sh
```

Requisitos: Docker, `age` e `rclone` configurado com acesso de leitura ao bucket. Rode o ensaio depois de ativar o backup agendado e, a partir daí, mensalmente, registrando data, nome do backup, migration mais recente e contagens (sem valores de dados) no registro de operação.

## 12. Verificações de implantação registradas em 23/10/2026

Na implantação documentada naquela data, foram observados:

- Frontend em `app.eduassets.tech` e landing page separada em `eduassets.tech`.
- API em `api.eduassets.tech`, com PostgreSQL remoto no Neon.
- API em Docker com publicação local na VM e Nginx escutando em 80/443.
- Regras de entrada 80/443 posicionadas antes do `REJECT` genérico.
- HTTPS externo alcançando a API e preflight CORS retornando a origem exata do frontend.
- CSP permitindo a API, a documentação hospedada e o beacon oficial do Cloudflare.

Este registro é datado e não representa uma checagem em tempo real dos serviços.

## 13. Registro de implantação da API em 28/10/2026

O operador relatou a implantação da API v1.0.1 no commit `14b0716110750857daa27d0e979e3bec574e39e0`, com a migration `20261028173000_user_management_audit`. O backup de 328366 bytes foi criado antes da migration, criptografado com `age` e listado no bucket R2 `eduassets-postgres-backups`; a transferência passou após uma repetição automática de HTTP 501. `pg_dump` 18.6 foi usado contra Neon 18.6, com senha via `PGPASSFILE` modo `0600`.

Os comandos do operador retornaram sucesso em `/health` e `/ready` por loopback e por `https://api.eduassets.tech`. O primeiro snapshot do Compose ainda mostrava `health: starting`; não houve registro posterior de estado `healthy`. Não foi realizado restore do objeto de produção, não foi configurado agendamento/retention e não houve alteração de Nginx, firewall ou Cloudflare nessa atualização. Este histórico não substitui monitoramento contínuo nem política de recuperação.

## 14. Verificação externa registrada em 12/11/2026

Uma checagem externa somente leitura, feita pela internet, obteve `{"status":"ok"}` em `/health` e `{"status":"ready"}` em `/ready` (HTTP 200), HTTP 200 no app, na landing page e no host de documentação, certificados TLS válidos por 67 a 73 dias e `security.txt` publicado. Isso confirma que a API v1.0.1 implantada em 28/10 estava saudável e conectada ao banco; não é uma leitura em tempo real. A partir desta data, o monitoramento do §10 passa a fazer essas verificações continuamente. Os itens operacionais que dependem de ação na VM ou na máquina do operador — ativar os timers de backup e de health check, executar o primeiro ensaio de restauração e cadastrar os pings opcionais — devem ser registrados aqui quando concluídos.

**Ativação na VM — 12/11/2026 (12:24–12:30 UTC):**

- Checkout `/opt/api-eduassets` alinhado ao `origin/main` (`a82715d`) após a reescrita do histórico no GitHub: a árvore do commit implantado (`14b0716`) é idêntica à do `cd1b460` da nova história (`49a0870…`), sem alterações locais; o commit antigo foi preservado no branch local `backup/pre-rewrite-14b0716`. A API não foi reconstruída nem reiniciada e segue na imagem `eduassets-backend:14b071611075` (`healthy`).
- `/etc/eduassets/backup.env` criado (modo `0600`, dono `ubuntu`) com a URL *direct* do Neon sem senha e o destino `offsite:eduassets-postgres-backups/postgres`.
- Backup manual e backup pelo systemd concluídos com sucesso (`eduassets-20261112T122849Z.dump.age` e `eduassets-20261112T122938Z.dump.age`, 334393 bytes cada); o R2 passou a ter 3 objetos. A primeira tentativa de envio ao R2 retorna HTTP 501 e a repetição automática do `rclone` conclui o envio, como em 28/10.
- `eduassets-backup.timer` (diário, 06:30 UTC) e `eduassets-healthcheck.timer` (a cada 5 minutos) habilitados. Primeira verificação da VM: disco 24%, 473 MB de memória disponível, API `healthy`, backup com 0 h — `VM health OK`.
- Segurança: o histórico de shell do usuário `ubuntu` continha uma URL do banco com a senha em texto puro (de uma tentativa de backup anterior); as linhas foram removidas. **A senha do papel `neondb_owner` deve ser considerada exposta e precisa ser trocada** no Neon, com atualização do `pgpass` e do `.env.production` e recriação do serviço `api`.
- Ainda pendentes: troca da senha do banco, primeiro ensaio de restauração na máquina do operador (§11.2), pings opcionais de dead-man switch e ajustes do painel Cloudflare (§15).

**Release 1.2.0 e e-mail — 12/11/2026 (tarde):**

- `eduassets-deploy.timer` ativado. O deploy automático implantou o commit `6a3185d` (imagem `eduassets-backend:6a3185d563f2`): como o release trazia a migration `20261112130000_password_reset_tokens`, fez antes o backup criptografado (envio ao R2 concluído após a repetição do HTTP 501), aplicou a migration pelo serviço `migrate` e só então recriou a API, que ficou `healthy`. Os três timers (`eduassets-backup`, `eduassets-healthcheck`, `eduassets-deploy`) estão ativos.
- E-mail configurado com o Brevo (§5.2): domínio autenticado, subdomínio de marca `em`, IP da VM na lista de IPs autorizados e remetente `nao-responda@eduassets.tech`. `/auth/session-capabilities` passou a informar `passwordRecovery: true` e o e-mail de teste chegou à caixa `teste@eduassets.tech` (alias no Zoho Mail).
- O commit `5167d9f` (modelo profissional do e-mail: banner, detalhes do pedido, aviso de segurança, rodapé e Reply-To) foi implantado pelo timer após a CI; `SUPPORT_EMAIL` e `PUBLIC_SITE_URL` foram acrescentados ao `.env.production` e o serviço `api` foi recriado na imagem `eduassets-backend:5167d9f60c84` (`healthy`). Uma primeira tentativa de recriar sem `EDUASSETS_IMAGE_TAG` falhou sem afetar o container em execução; o comando correto está em §5.2.
- O botão do e-mail abria com "Sua conexão não é particular": o host de rastreamento `r.em.eduassets.tech` apresentava o certificado padrão do Brevo (`r.mailin.fr`, vencido em 2024) enquanto o certificado do subdomínio de marca não havia sido emitido. O Brevo emitiu o certificado Let's Encrypt de `r.em.eduassets.tech` às 14:02 UTC e o fluxo completo passou a funcionar. Se o problema voltar, a alternativa é remover o subdomínio de marca no Brevo (os links voltam ao domínio padrão do Brevo).
- Ainda pendentes: troca da senha do banco, primeiro ensaio de restauração (§11.2), pings opcionais de dead-man switch, ajustes restantes do painel Cloudflare (§15) e reinício da VM pedido pelo Ubuntu (*System restart required*).

## 15. Segurança da zona Cloudflare

O relatório Security Insights do Cloudflare de 11/11/2026 apontou, para `eduassets.tech`:

| Item | Situação | Ação |
|---|---|---|
| `security.txt` | Publicado em `https://eduassets.tech/.well-known/security.txt` (RFC 9116, válido até 11/11/2027; o monitoramento alerta 30 dias antes). | Opcionalmente, ative também **Security → Settings → Security.txt** para encerrar o alerta no painel. |
| DMARC | Publicado em 12/11/2026 (o assistente do Brevo consolidou dois registros `_dmarc` conflitantes, `p=none` e `p=quarantine`, que invalidavam a política): `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com,mailto:dasilva-thiago@eduassets.tech; adkim=r; aspf=r`. O SPF (`include:zohomail.com`) cobre o Zoho; nos envios do Brevo o alinhamento vem da DKIM `brevo1`/`brevo2._domainkey` com `d=eduassets.tech`. | Acompanhar os relatórios agregados por algumas semanas; sem falhas legítimas, endurecer para `p=quarantine`. Mantenha um único registro `_dmarc`. |
| Bot Fight Mode | Desligado. | Ativar em **Security → Bots**. Em seguida, rodar o workflow `Uptime` manualmente: se o desafio bloquear o GitHub Actions, mantenha o modo apenas se o monitoramento continuar passando. |
| AI Labyrinth | Desligado. | Ativar em **Security → Bots**. |
| MFA da conta Cloudflare | Desligado. | Ativar a verificação em duas etapas em **My Profile → Authentication** (prioridade alta). |
| Turnstile | Sem widget. | Opcional; só é necessário se surgir formulário público. |

Essas alterações são feitas no painel do Cloudflare pelo dono da conta; registre a data de cada uma nesta seção.

## 16. Privacidade, cookies e Google Analytics

Desde 12/11/2026, o app tem **Política de Privacidade** própria, em `https://app.eduassets.tech/#privacidade`, aberta pelo link na tela de entrada e pelo banner de cookies; o item 9 dos Termos de Uso aponta para ela. O conteúdo fica em `index.html` (modal `#modal-privacy`) e nas chaves `privacy.*` de `src/core/i18n/pt.json`/`en.json`. Ela identifica o responsável, os dados tratados (contas, registros de operação, auditoria, recuperação de senha e dados técnicos), o modo convidado, as bases legais da LGPD, os fornecedores (Cloudflare, Oracle Cloud, Neon, Cloudflare R2, Brevo, Zoho Mail, GitHub e Google Analytics), a retenção, os cookies e o armazenamento do navegador, a segurança e os direitos do titular. O site `eduassets.tech` mantém políticas de privacidade e de cookies próprias, restritas à landing page.

O Google Analytics só é carregado depois do aceite no banner (app e site). A escolha fica em `eduassets_analytics_consent` no armazenamento local, com versão (`CONSENT_VERSION`); ao recusar, os cookies `_ga*` são apagados. O botão **Preferências de cookies** (rodapé da política no app; rodapé e política de cookies no site) reabre o banner.

Ao mudar a forma de tratar dados, atualize a política e a data de "Última atualização" no app e no site; se mudarem as finalidades das estatísticas, incremente `CONSENT_VERSION` nos dois módulos para que o banner peça a escolha de novo. Ao trocar de fornecedor (por exemplo, o provedor de e-mail), atualize a seção 5 da política do app.
