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

- O backend usa **3000 por padrão**. `PORT` tem precedência sobre `BACKEND_PORT`; se nenhum resultar em uma porta utilizável, o fallback é 3000.
- Quando definida, `HOST` controla o endereço de bind. Sem ela, o servidor usa `127.0.0.1` fora de produção e `0.0.0.0` em produção.
- O Vite escuta em **`0.0.0.0:5173`** e faz proxy das rotas da API e do WebSocket para `127.0.0.1:3000`.
- Com `VITE_API_BASE_URL` vazia, o navegador usa URLs relativas e o proxy do Vite em desenvolvimento. Um build de frontend para produção exige `VITE_API_BASE_URL`.
- A ponte Python opcional expõe o seu provisionador somente em **`127.0.0.1:3001`**. Essa não é uma porta pública da API da aplicação.

## Modelo de acesso

- **Convidado:** visualizações públicas de leitura; não pode alterar dados.
- **Editor:** ações operacionais autenticadas permitidas pela política das rotas, incluindo fluxos de empréstimo/devolução e criação/edição de ocorrências.
- **Administrador:** CRUD administrativo, ações de conta/senha e provisionamento de tokens RFID, além das ações operacionais.

A autenticação usa JWT em `Authorization: Bearer <token>`. A autorização do backend é a barreira efetiva; controles desabilitados no frontend são apenas uma camada de UX. A atividade de administradores tem expiração server-side após 30 minutos de inatividade. Não existe recuperação de senha; um usuário autenticado pode alterar a própria senha por `PATCH /auth/senha`.

## Backend e modelo de dados

A API oferece respostas de saúde/raiz, autenticação, CRUD das entidades e ações administrativas de RFID:

- `/health`, `/`;
- `/auth/login`, `/auth/me`, `/auth/senha`, `/auth/rfid`;
- `/categorias`, `/equipamentos`, `/responsaveis`, `/usuarios`, `/emprestimos`, `/ocorrencias`; e
- `/usuarios/:id/rfid-token` para provisionar/revogar tokens RFID, somente para administradores.

Os modelos Prisma são `Categoria`, `Equipamento`, `Responsavel`, `Usuario`, `Emprestimo`, `ItemEmprestimo` e `Ocorrencia`, usando PostgreSQL. Rotas que alteram dados usam middleware de autenticação/administração; rotas de leitura sustentam o Modo Convidado.

## Requisitos

- Node.js **>=22.12.0** e npm para os dois pacotes;
- PostgreSQL acessível por `DATABASE_URL`;
- `DIRECT_URL` quando o provedor exigir uma conexão direta separada (a configuração do Prisma usa `DATABASE_URL` como fallback); e
- Linux/Python e hardware RFID compatíveis somente se a ponte opcional for ativada.

O repositório não pressupõe provedor de hospedagem, projeto cloud, domínio público, política RLS ou deployment operacional.

## Instalação e execução

Na raiz do repositório:

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
cp .env.example backend/.env
```

Edite `backend/.env` com pelo menos `DATABASE_URL`, um `JWT_SECRET` exclusivo com 32 ou mais caracteres e `SEED_ADMIN_PASSWORD`. Não versionar segredos. Para desenvolvimento local explícito, use `NODE_ENV=development`; fora desse modo, defina `CORS_ORIGIN` com uma lista separada por vírgulas das origens de frontend permitidas.

Crie `frontend/.env` para usar o proxy do Vite:

```env
VITE_API_BASE_URL=
VITE_RFID_BRIDGE_ENABLED=false
```

Inicialize o banco de dados:

```bash
cd backend
npx prisma migrate dev
npx prisma db seed
cd ..
```

O seed é idempotente e **exige `SEED_ADMIN_PASSWORD`**. Ele cria o administrador inicial usando a senha dessa variável; nenhuma senha fica no código. `SEED_EDITOR_PASSWORD` é opcional e cria uma conta de editor somente quando definida. Esta documentação não fornece credenciais demo ou senhas prontas.

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
| `PORT` / `BACKEND_PORT` | Seleção da porta; `PORT` vence, padrão 3000. |
| `HOST` | Endereço de bind; padrão `127.0.0.1`, ou `0.0.0.0` em produção quando ausente. |
| `TRUST_PROXY` | Configuração explícita opcional do proxy do Express; ajuste à topologia real. |
| `CORS_ORIGIN` | Origens permitidas separadas por vírgulas; obrigatória fora do desenvolvimento local. |
| `DATABASE_URL` | URL PostgreSQL obrigatória. |
| `DIRECT_URL` | URL direta opcional; usa `DATABASE_URL` como fallback. |
| `JWT_SECRET` | Segredo exclusivo de assinatura JWT HS256, com pelo menos 32 caracteres. |
| `SEED_ADMIN_PASSWORD` | Obrigatória para o seed; define a senha do administrador inicial. |
| `SEED_EDITOR_PASSWORD` | Opcional; define a senha de uma conta de editor criada pelo seed. |
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
| backend | `npm run build` | Build TypeScript. |
| backend | `npm start` | Executa `dist/src/server.js`. |
| backend | `npm run migrate:deploy` | Aplica migrações existentes. |
| backend | `npm test` | Executa o script de testes configurado; nenhum resultado é afirmado aqui. |
| frontend | `npm run dev` | Vite na porta 5173. |
| frontend | `npm run build` | Gera `dist/`. |
| frontend | `npm run preview` | Faz preview local de `dist/`. |
| frontend | `npm run typecheck` | Executa `tsc --noEmit`. |
| frontend | `npm test` / `npm run test:watch` | Executa Vitest uma vez ou em watch; nenhum resultado é afirmado aqui. |

## Limitações

- Não há deployment público operacional, migração remota, rotação de segredos ou configuração de banco cloud realizada por este repositório.
- RLS, grants e exposição anônima via PostgREST do provedor não são estabelecidos nem verificados aqui; exigem revisão separada de privacidade e segurança.
- Produção exige `CORS_ORIGIN`; deployments atrás de proxy também exigem `TRUST_PROXY` e política de rede intencional.
- RFID depende de hardware real, dependências Linux, alcance por loopback, segredo compartilhado forte e política de rede explícita. Quando desativado, o login por senha continua sendo o caminho suportado.
- O modelo controla quantidades, não unidades serializadas individualmente, e os níveis de acesso não têm permissões mais granulares por painel.
- Não há recuperação de senha. O campo de data de devolução não altera atualmente a semântica de horário atual persistida pelo backend.
- A validação manual restante inclui hardware-alvo, comportamento de proxy/deployment e alguns fluxos de navegador; este documento não transforma esses pontos em garantias de teste ou produção.

## Versões por idioma

- Português: este arquivo.
- English: [README.md](README.md).
- Visão geral do repositório: [README raiz](../../../README.md).
