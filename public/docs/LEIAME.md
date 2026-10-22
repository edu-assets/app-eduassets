# eduAssets

<div align="center">
  <a href="../../../README.md">
    <img src="../assets/img/eduAssets_banner.png" alt="Banner do eduAssets" width="100%">
  </a>
</div>

[README raiz](../../../README.md) · [English](README.md)

> **Status: Beta.** O eduAssets é uma aplicação em TypeScript para empréstimos e inventário de equipamentos escolares. O checkout atual inclui autenticação, acesso de convidado somente leitura, empréstimos/devoluções, ocorrências, exportações e uma integração RFID opcional. Esta documentação não pressupõe uma implantação pública operacional.

## O que a aplicação faz

O eduAssets apoia os fluxos diários de uma operação pequena de equipamentos:

- registrar empréstimos e processar devoluções;
- consultar estoque e histórico com busca/filtro;
- registrar observações, manutenções e equipamentos quebrados;
- administrar categorias, equipamentos, responsáveis e usuários;
- exportar dados de empréstimos/devoluções e inventário em CSV, Excel ou PDF; e
- usar autenticação por senha, permissões de Administrador/Editor e Modo Convidado somente leitura.

O frontend atual é TypeScript com renderização DOM nativa e organização feature-first. React é item futuro do roadmap, não uma dependência atual. A seleção de tema Claro / Escuro / Sistema é persistida localmente.

## Execução local

```text
Navegador :5173 ── proxy Vite ── API :3000 ── PostgreSQL
                                      │
                         ponte RFID opcional (somente loopback)
                                      └─ provisionador :3001
```

- O backend usa **3000 por padrão**. `PORT` tem precedência sobre `BACKEND_PORT`; todos os valores fornecidos são validados e um inválido interrompe o startup.
- Quando definida, `HOST` controla o endereço de bind. Sem ela, o servidor usa `127.0.0.1` fora de produção e `0.0.0.0` em produção.
- O Vite escuta em **`0.0.0.0:5173`** e faz proxy das rotas da API e do WebSocket para `127.0.0.1:3000`.
- Com `VITE_API_BASE_URL` vazia, o navegador usa URLs relativas e o proxy do Vite em desenvolvimento. Um build de frontend para produção exige `VITE_API_BASE_URL`.
- A ponte Python opcional expõe o seu provisionador somente em **`127.0.0.1:3001`**. Essa não é uma porta pública da API da aplicação.

## Modelo de acesso

- **Convidado:** leituras minimizadas de categorias, equipamentos, empréstimos e ocorrências por DTOs server-side allowlisted; responsáveis e usuários exigem autenticação. Nomes, notas e texto livre de ocorrência são omitidos/mascarados; nenhum dado pode ser alterado sem autorização.
- **Editor:** ações operacionais autenticadas permitidas pela política das rotas, incluindo fluxos de empréstimo/devolução e criação/edição de ocorrências.
- **Administrador:** CRUD administrativo, ações de conta/senha e provisionamento de tokens RFID, além das ações operacionais.

A autenticação usa JWT em `Authorization: Bearer <token>`. A autorização do backend é a barreira efetiva; controles desabilitados no frontend são apenas uma camada de UX. A atividade de administradores expira após 30 minutos por JWT; o estado é local ao processo, portanto a escala atual pressupõe uma instância. Sair chama `POST /auth/logout`, que incrementa uma versão de sessão por usuário persistida no PostgreSQL e revoga todos os JWTs anteriores da conta; o navegador remove o token imediatamente, então uma falha/offline pode deixar cópias válidas até expirarem. A troca de senha também revoga as sessões anteriores e devolve um token substituto para o navegador atual. Não existe recuperação de senha; um usuário autenticado pode alterar a própria senha por `PATCH /auth/senha`.

## Backend e modelo de dados

A API oferece respostas de saúde/raiz, autenticação, CRUD das entidades e ações administrativas de RFID:

- `/health` (liveness), `/ready` (readiness com banco limitado por timeout), `/`;
- `/auth/login`, `/auth/me`, `/auth/logout`, `/auth/senha`, `/auth/rfid`;
- `/categorias`, `/equipamentos`, `/responsaveis`, `/usuarios`, `/emprestimos`, `/ocorrencias`; e
- `/usuarios/:id/rfid-token` para provisionar/revogar tokens RFID, somente para administradores.

Os modelos Prisma são `Categoria`, `Equipamento`, `Responsavel`, `Usuario`, `Emprestimo`, `ItemEmprestimo` e `Ocorrencia`, usando PostgreSQL. GET de categorias/equipamentos/empréstimos/ocorrências permite auth opcional e respostas anônimas limitadas por DTO; GET de responsáveis/usuários e todas as mutações exigem autorização conforme a rota.

## Requisitos

- Node.js **>=22.12.0** e npm para os dois pacotes;
- PostgreSQL acessível por `DATABASE_URL`;
- `DIRECT_URL` só quando o provedor exigir conexão direta separada (a configuração Prisma usa `DATABASE_URL` se omitida); e
- Linux/Python e hardware RFID compatíveis somente se a ponte opcional for ativada.

O repositório não pressupõe provedor de hospedagem, projeto cloud, domínio público, política RLS ou deployment operacional.

## Instalação e execução

Na raiz do repositório:

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend
cp .env.example backend/.env
```

Edite `backend/.env` com pelo menos `DATABASE_URL`, `JWT_SECRET` exclusivo com 32 ou mais caracteres, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` e `NODE_ENV=development`. A senha do seed deve ter ao menos 16 caracteres e não pode ultrapassar 72 bytes UTF-8. Em produção, também são obrigatórios `CORS_ORIGIN` e `TRUST_PROXY` explícito. Não versionar segredos. Para desenvolvimento local explícito, use `NODE_ENV=development`; fora desse modo, defina `CORS_ORIGIN` com uma lista separada por vírgulas das origens de frontend permitidas.

Crie `frontend/.env` para usar o proxy do Vite:

```env
VITE_API_BASE_URL=
VITE_RFID_BRIDGE_ENABLED=false
```

Inicialize o banco de dados:

```bash
cd backend
npx prisma migrate dev
npm run db:seed
cd ..
```

O seed **exige `SEED_ADMIN_EMAIL` válido e `SEED_ADMIN_PASSWORD` forte**, é idempotente e não substitui conta ou senha existente. Para criar também um editor, informe o par `SEED_EDITOR_EMAIL` e `SEED_EDITOR_PASSWORD`. Mantenha essas variáveis em arquivo protegido e não rastreado; execute `npm run db:seed` explicitamente depois das migrations, verifique o login, altere a senha inicial pelo fluxo autenticado e então limpe as variáveis de seed. A API não cria administrador no startup. Esta documentação não fornece credenciais demo ou senhas prontas.

Inicie os dois processos:

```bash
npm run dev
```

Abra `http://localhost:5173`. Para iniciar apenas um processo, use `cd backend && npm run dev` ou `cd frontend && npm run dev`.

Para um ambiente que já possui as migrações versionadas, o backend também expõe `npm run migrate:deploy`. A sequência de build/início disponível é:

```bash
npm run build
cd backend && npm start
```

Um frontend já compilado pode ser inspecionado com `cd frontend && npm run preview`; isso é apenas um preview local, não um procedimento de deployment.

## Referência de variáveis de ambiente

### Backend

| Variável | Finalidade |
| --- | --- |
| `NODE_ENV` | Controla o comportamento de desenvolvimento/produção. |
| `PORT` / `BACKEND_PORT` | Cada valor fornecido é validado; `PORT` vence; padrão 3000. |
| `HOST` | Endereço de bind; padrão `127.0.0.1`, ou `0.0.0.0` em produção quando ausente. |
| `TRUST_PROXY` | Configuração validada do proxy; obrigatória explicitamente em produção (`0` sem proxy, número exato de saltos ou IP/CIDR confiáveis). |
| `CORS_ORIGIN` | Origens permitidas separadas por vírgulas; obrigatória fora do desenvolvimento local. |
| `DATABASE_URL` | URL PostgreSQL obrigatória. |
| `DIRECT_URL` | Opcional; o `prisma.config.ts` usa `DATABASE_URL` como fallback se omitido. |
| `JWT_SECRET` | Segredo exclusivo de assinatura JWT HS256, com pelo menos 32 caracteres. |
| `SEED_ADMIN_EMAIL` | Email válido obrigatório, usado somente no seed inicial explícito. |
| `SEED_ADMIN_PASSWORD` | Obrigatória no seed explícito; mínimo 16 caracteres e máximo de 72 bytes UTF-8. |
| `SEED_EDITOR_EMAIL` / `SEED_EDITOR_PASSWORD` | Par opcional; ambos devem ser fornecidos para criar um Editor. |
| `LOG_LEVEL` | Nível de log do Winston; o template usa `info`. |

### Frontend

| Variável | Finalidade |
| --- | --- |
| `VITE_API_BASE_URL` | Origem da API. Vazia usa o proxy do Vite em desenvolvimento; obrigatória no build de produção. |
| `VITE_RFID_BRIDGE_ENABLED` | Ativa o listener RFID do navegador; mantenha `false` até toda a integração estar pronta. |

## Integração RFID opcional

O RFID fica **desativado a menos que `RFID_BRIDGE_ENABLED=true`** no backend. Para ativar também o listener do navegador, use `VITE_RFID_BRIDGE_ENABLED=true`. Backend e ponte Python precisam compartilhar um `RFID_BRIDGE_SECRET` aleatório com pelo menos 32 caracteres.

A ponte Python aceita `RFID_BACKEND=spi` (padrão) ou `RFID_BACKEND=serial`; o modo serial usa `RFID_SERIAL_PORT`, com padrão `/dev/ttyUSB0`. `EDUASSETS_BACKEND_URL` usa `http://localhost:3000` por padrão, e `RFID_SOUND_DEVICE` seleciona opcionalmente um dispositivo ALSA.

O backend verifica que as requisições a `/auth/rfid` vêm de loopback e que o upgrade WebSocket para `/ws/rfid` também é loopback-only. Portanto, um Raspberry Pi na mesma rede não é automaticamente suficiente: use uma topologia que preserve essa política ou execute a ponte na mesma máquina do backend. Regras de firewall/reverse proxy e validação do leitor físico são responsabilidade do operador.

Instalação manual da ponte em Linux:

```bash
cd rpi/rfid
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export RFID_BRIDGE_SECRET='mesmo-segredo-forte-do-backend'
export EDUASSETS_BACKEND_URL='http://localhost:3000'
python3 rfid_admin_bridge.py
```

O processo inicia o provisionador local em `127.0.0.1:3001/provision`. A unidade systemd fornecida espera `/opt/eduassets-rfid`, um usuário dedicado `eduassets`, um ambiente virtual e `/etc/eduassets/rfid_bridge.env` com modo 600. O repositório não instala esse serviço nem certifica comportamento de GPIO/hardware em um modelo específico de Raspberry Pi.

## Scripts

| Local | Comando | Finalidade |
| --- | --- | --- |
| raiz | `npm run dev` | Executa backend e frontend em paralelo. |
| raiz | `npm run build` | Compila backend e depois frontend. |
| backend | `npm run dev` | API em modo watch. |
| backend | `npm run build` | Gera Prisma Client e compila TypeScript. |
| backend | `npm start` | Executa `dist/src/server.js`. |
| backend | `npm run migrate:deploy` | Aplica migrações existentes. |
| backend | `npm test` | Suíte unitária sem PostgreSQL. |
| backend | `npm run test:integration` | Testes HTTP/race; exige PostgreSQL de teste isolado e migrado. |
| frontend | `npm run dev` | Vite na porta 5173. |
| frontend | `npm run build` | Gera `dist/`. |
| frontend | `npm run preview` | Faz preview local de `dist/`. |
| frontend | `npm run typecheck` | Executa `tsc --noEmit`. |
| frontend | `npm test` / `npm run test:watch` | Executa Vitest uma vez ou em watch; confirme o resultado e a contagem na saída da execução. |

## Limitações

- Não há deployment público operacional, migração remota, rotação de segredos ou configuração de banco cloud realizada por este repositório.
- A autorização da aplicação usa a API backend. Grants/PostgREST do provedor não fazem parte da rota atual; se o provedor os expuser, revisar permissões e bloquear acesso anônimo indevido.
- Produção exige `CORS_ORIGIN`; deployments atrás de proxy também exigem `TRUST_PROXY` e política de rede intencional.
- RFID depende de hardware real, dependências Linux, alcance por loopback, segredo compartilhado forte e política de rede explícita. Quando desativado, o login por senha continua sendo o caminho suportado.
- O modelo controla quantidades, não unidades serializadas individualmente, e os níveis de acesso não têm permissões mais granulares por painel.
- Não há recuperação de senha. A data offset-aware escolhida no modal de devolução é validada e persistida; clientes antigos podem omitir o campo e usar horário do servidor.
- Migrations, seed e testes de integração em PostgreSQL descartável não foram executados neste sandbox. CI hospedado, Docker/Compose, proxy Nginx/Cloudflare no host-alvo, TLS do provedor gerenciado, backups externos, acessibilidade, QA em navegador de produção e hardware ainda requerem validação externa. Templates e testes unitários/build locais não comprovam deployment.

## Versões por idioma

- Português: este arquivo.
- English: [README.md](README.md).
- A visão geral e as instruções de desenvolvimento local estão nos READMEs da raiz do repositório; eles não são enviados com os assets do frontend.

## Deployment / Implantação

[Guia de implantação e operação](GUIA_IMPLANTACAO.md). O relatório interno de remediação fica na raiz do repositório e não é publicado com os assets do frontend.
