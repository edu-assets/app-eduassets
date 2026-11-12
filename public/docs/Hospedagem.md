# Hospedagem e operação do EduAssets

> **Versão do produto: oficial 1.0.0 (28/10/2026).** O registro abaixo descreve a topologia observada em 23/10/2026; não é uma verificação da infraestrutura remota no momento desta leitura.

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

O navegador carrega o Markdown por um commit imutável fixado em `src/core/docs/docsService.ts`, via `raw.githubusercontent.com`. `docs.eduassets.tech` continua como site público dos guias, mas não é a origem de busca padrão do app. O arquivo `public/_headers` é copiado para `dist/_headers`. A CSP de produção deve permitir a API, a origem fixada dos guias e o beacon oficial do Cloudflare Web Analytics:

```text
script-src 'self' https://static.cloudflareinsights.com
connect-src 'self' https://api.eduassets.tech https://docs.eduassets.tech https://raw.githubusercontent.com https://cloudflareinsights.com
```

O beacon do Analytics era bloqueado quando a política continha apenas `script-src 'self'`. Depois de alterar `_headers`, é necessário aguardar um novo deploy do Pages e fazer um recarregamento completo no navegador.

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

Respostas 5xx isoladas ainda não geram alerta próprio: elas aparecem como falha do `/ready` quando afetam a API e podem ser acompanhadas em **Cloudflare → Analytics**.

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
export RCLONE_SOURCE='r2:eduassets-postgres-backups'
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

## 15. Segurança da zona Cloudflare

O relatório Security Insights do Cloudflare de 11/11/2026 apontou, para `eduassets.tech`:

| Item | Situação | Ação |
|---|---|---|
| `security.txt` | Publicado em `https://eduassets.tech/.well-known/security.txt` (RFC 9116, válido até 11/11/2027; o monitoramento alerta 30 dias antes). | Opcionalmente, ative também **Security → Settings → Security.txt** para encerrar o alerta no painel. |
| DMARC | Ausente. SPF (`include:zohomail.com`) e DKIM (`zmail._domainkey`) já existem. | Criar o registro `TXT` `_dmarc` com `v=DMARC1; p=none; rua=mailto:<caixa de relatórios>`; após algumas semanas sem falhas legítimas, endurecer para `p=quarantine`. |
| Bot Fight Mode | Desligado. | Ativar em **Security → Bots**. Em seguida, rodar o workflow `Uptime` manualmente: se o desafio bloquear o GitHub Actions, mantenha o modo apenas se o monitoramento continuar passando. |
| AI Labyrinth | Desligado. | Ativar em **Security → Bots**. |
| MFA da conta Cloudflare | Desligado. | Ativar a verificação em duas etapas em **My Profile → Authentication** (prioridade alta). |
| Turnstile | Sem widget. | Opcional; só é necessário se surgir formulário público. |

Essas alterações são feitas no painel do Cloudflare pelo dono da conta; registre a data de cada uma nesta seção.
