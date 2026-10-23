# Hospedagem e operação do EduAssets

> **Status:** Beta, com implantação operacional validada pelo operador em 23/10/2026. A validação cobriu a API na VM Oracle, o proxy HTTPS do Nginx, o DNS proxied da Cloudflare, o frontend no Cloudflare Pages e o preflight CORS. Backups externos, restore drill, monitoramento e revisão de segurança para uso com dados reais continuam sendo tarefas operacionais separadas.

## 1. Topologia implantada

A implantação usa três hostnames distintos:

- `eduassets.tech`: landing page independente, publicada em outro projeto Cloudflare;
- `app.eduassets.tech`: frontend estático do EduAssets, publicado no Cloudflare Pages;
- `api.eduassets.tech`: backend Node.js/Express, executado em um container Docker na VM Ubuntu da Oracle Cloud.

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
cd /opt/eduassets
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

1. Repositório: `edu-assets/eduAssets`.
2. Branch de produção: `main`.
3. Diretório-raiz: `frontend`.
4. Comando de build: `npm run build`.
5. Diretório de saída: `dist`.
6. Variáveis públicas de build:

```env
VITE_API_BASE_URL=https://api.eduassets.tech
VITE_RFID_BRIDGE_ENABLED=false
```

7. Domínio personalizado: `app.eduassets.tech`.

O arquivo `frontend/public/_headers` é copiado para `dist/_headers`. A CSP permite a API e o beacon oficial do Cloudflare Web Analytics:

```text
script-src 'self' https://static.cloudflareinsights.com
connect-src 'self' https://api.eduassets.tech https://cloudflareinsights.com
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

Na implantação validada, o IP público da VM era `137.131.185.105`. Se o IP mudar, atualize o registro DNS e não documente o novo valor junto com segredos.

Mantenha um único registro para `api.eduassets.tech`; registros duplicados para o mesmo hostname devem ser removidos. `app` e o domínio raiz podem continuar apontando para seus projetos Cloudflare respectivos.

No Cloudflare, use **Full (strict)** quando o certificado de origem correspondente a `api.eduassets.tech` estiver instalado no Nginx. Nunca publique a chave privada do certificado.

## 5. Subir e atualizar a API

A API de produção é gerenciada pelo Compose, e não por `npm run dev`:

```bash
cd /opt/eduassets

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

Após `git pull` ou alteração do ambiente:

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

O Nginx recebe HTTPS em `0.0.0.0:443` e encaminha para a API local. Valide antes de recarregar:

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

A configuração pública mantém RFID desligado. `/auth/rfid` e `/ws/rfid` devem continuar bloqueados no Nginx e no backend. O quiosque RFID é uma implantação separada e local.

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

`/health` verifica liveness e não depende do PostgreSQL. `/ready` verifica a conexão com o Neon e pode retornar `503` quando o banco estiver indisponível. O container usa `restart: unless-stopped`, portanto permanece ativo após reinício do daemon Docker, desde que o Compose tenha sido iniciado e a política de restart esteja preservada.

Configure separadamente monitoramento externo para `/health`, `/ready`, respostas 5xx, expiração TLS, espaço em disco, memória, disponibilidade do Neon e falha de backup. Essa configuração não é criada automaticamente pelo repositório.

## 11. Backup e recuperação

Antes de migrations em banco operacional, faça backup com `deploy/scripts/backup-postgres.sh`, usando uma URL protegida e compatível com `pg_dump`. Para o Neon PostgreSQL 18, use `pg_dump` major 18 ou mais recente; não use um cliente 16 contra o servidor 18.

Quando o `.env` for carregado com `source`, prefira valores sem aspas externas duplicadas. Para operações com `pg_dump`, mantenha uma URL libpq própria se os parâmetros do Prisma forem diferentes. Nunca coloque URLs reais neste documento.

O backup deve ser criptografado, enviado para fora da VM e testado com restauração em um banco novo e vazio. Um arquivo de dump existente, sozinho, não prova que a recuperação funciona.

## 12. Checklist pós-deploy

- [x] Frontend em `app.eduassets.tech`.
- [x] Landing page separada em `eduassets.tech`.
- [x] API em `api.eduassets.tech`.
- [x] PostgreSQL remoto no Neon.
- [x] API em Docker com publicação local na VM.
- [x] Nginx escutando em 80/443.
- [x] Regras de entrada 80/443 corrigidas antes do `REJECT` genérico.
- [x] HTTPS externo alcança a API.
- [x] Preflight CORS retorna a origem exata do frontend.
- [x] CSP permite API e beacon oficial do Cloudflare.
- [ ] Backup externo e restore drill documentados com evidência operacional.
- [ ] Monitoramento externo e alertas configurados.
- [ ] Revisão final de privacidade, grants do banco e política de retenção para dados reais.

O estado do produto continua **Beta** até concluir os itens operacionais pendentes e o QA funcional completo.
