# Referência da API — eduAssets

> Esta referência descreve os routers e middlewares presentes no código. O contrato exato dos corpos JSON é definido pelos schemas Zod em `backend/src/schemas/`; nenhuma rota substitui as regras de autorização implementadas no backend.

## Base e transporte

A API Express é publicada na raiz do host configurado. Não existe prefixo `/api` na montagem atual. Em desenvolvimento, o proxy do Vite encaminha as rotas para `http://127.0.0.1:3000`. Para builds de produção, `VITE_API_BASE_URL` deve conter a origem da API, sem acrescentar um prefixo que não esteja configurado no servidor.

As rotas JSON usam `Content-Type: application/json`. A API valida os corpos com Zod, limita requisições e centraliza erros. As respostas de erro usam um objeto JSON com a chave `erro`; erros de validação podem incluir `detalhes`. Os códigos HTTP devem ser interpretados em conjunto com essa resposta.

## Sessão, credenciais e CSRF

O navegador usa somente sessão por cookie. O frontend consulta `GET /auth/session-capabilities` (`Cache-Control: no-store`); o login solicita `X-Auth-Mode: cookie`, envia `credentials: include` e recebe o perfil sem expor JWT. Se a capability falhar ou retornar `cookieSession` diferente de `true`, o login falha fechado, sem fallback Bearer e sem gravar token em `localStorage`. O cookie é `HttpOnly`, `SameSite=Lax`, limitado a `/`, expira junto com o JWT e, em HTTPS de produção, usa `Secure` e o nome `__Host-eduassets_session`.

Em requisições mutáveis autenticadas por cookie (`POST`, `PUT`, `PATCH` ou `DELETE`), o backend exige um cabeçalho `Origin` permitido pela configuração CORS. Não remova essa validação para resolver erros de CORS. Navegadores devem usar a origem web autorizada no servidor e uma configuração proxy/TLS que preserve corretamente a informação de HTTPS.

O middleware da API ainda aceita `Authorization: Bearer <JWT>` para integrações legadas não-browser. O app atual no navegador não envia esse cabeçalho, não mantém token de fallback e não persiste JWT em `localStorage`; quando o cookie é usado, mutações exigem `Origin` permitido. Não inclua cookies, JWTs, senhas ou segredos reais em logs ou exemplos.

## Autenticação e saúde

| Método | Caminho | Acesso | Finalidade |
|---|---|---|---|
| `GET` | `/` | Público | Resposta básica de status. |
| `GET` | `/health` | Público | Liveness do processo. |
| `GET` | `/ready` | Público | Readiness com verificação limitada do PostgreSQL. |
| `GET` | `/auth/session-capabilities` | Público | Informa se o servidor suporta sessão de navegador via cookie (`cookieSession`), se a recuperação de senha por e-mail está configurada (`passwordRecovery`) e se as notificações push estão disponíveis (`pushNotifications`). |
| `POST` | `/auth/login` | Público; rate limited e Origin validado ao solicitar modo cookie | Autentica com `login` e `password`; grava cookie e retorna o perfil no modo cookie, incluindo `senhaAlteradaEm` (ISO 8601 ou `null`) como em `GET /auth/me`. |
| `GET` | `/auth/me` | Sessão autenticada | Retorna o perfil da sessão atual, incluindo `senhaAlteradaEm` (ISO 8601 ou `null`), derivado da auditoria (`PASSWORD_CHANGE`, `PASSWORD_RESET`, `PASSWORD_RESET_SELF`). |
| `POST` | `/auth/logout` | Sessão autenticada | Revoga a versão de sessão do usuário e remove o cookie. Retorna `204`. |
| `PATCH` | `/auth/senha` | Sessão autenticada | Altera a senha usando `senhaAtual` e `novaSenha`; reemite a sessão atual quando a alteração tem sucesso. |
| `POST` | `/auth/senha/recuperar` | Público; 10 pedidos por IP a cada 15 min e 3 por e-mail por hora; Origin validado no modo cookie | Corpo `{ "login": "...", "idioma": "pt" \| "en" }`. Responde sempre `202` com o mesmo corpo, antes de qualquer consulta, para não revelar se a conta existe. Se o login for um e-mail de conta ativa, invalida links anteriores, grava apenas o hash SHA-256 de um token aleatório de 256 bits válido por 30 minutos, registra `PASSWORD_RESET_REQUEST` e envia o link `APP_PUBLIC_URL/#redefinir-senha=<token>` no idioma pedido (HTML com banner inline e texto puro; Reply-To em `SUPPORT_EMAIL`, quando configurado). Retorna `503` quando o SMTP não está configurado. |
| `POST` | `/auth/senha/redefinir` | Público; 10 tentativas por IP a cada 15 min; Origin validado no modo cookie | Corpo `{ "token": "...", "senha": "..." }` com a política forte. Consome o token (uso único), grava o novo hash, incrementa `sessionVersion` (encerra todas as sessões), apaga outros tokens da conta e registra `PASSWORD_RESET_SELF`. Token inválido, expirado ou usado retorna `400` `backend.auth.link_recuperacao_invalido`. Retorna `204`. |
| `POST` | `/auth/rfid` | Somente quando `RFID_BRIDGE_ENABLED=true`; bridge autorizada | Recebe leitura RFID do processo bridge e não é um endpoint de login de navegador. |
| `POST` | `/auth/rfid/session` | Somente com bridge RFID habilitada; código curto de uso único | Troca o código de login RFID pelo cookie de sessão do navegador. |

## Inventário e operações

`optionalAuth` permite leitura pública em Modo Convidado, mas aplica autenticação se a requisição fornecer cookie ou token. Cookies presentes são validados; uma sessão inválida não deve ser tratada como anônima. Respostas públicas são projeções minimizadas definidas no servidor.

| Método | Caminho | Acesso |
|---|---|---|
| `GET` | `/categorias` | Público/convidado ou autenticado. |
| `POST` | `/categorias` | Administrador. |
| `GET` | `/equipamentos` | Público/convidado ou autenticado. |
| `POST`, `PATCH` | `/equipamentos`, `/equipamentos/:id` | Administrador. Quando o `PATCH` envia `quantidadeTotal` sem `quantidadeDisponivel`, o servidor aplica a diferença em `quantidadeDisponivel` de forma atômica sob bloqueio de linha e responde `409` `backend.equipamentos.quantidade_em_uso` se o novo total ficar abaixo das unidades em uso; enviando os dois campos, os valores explícitos são mantidos. |
| `GET` | `/emprestimos` | Público/convidado ou autenticado. Sem sessão, aceita `limit` (padrão 50, máximo 100) e `cursor` positivo; retorna `{ items, nextCursor, limit }` em ordem de ID decrescente, com projeção pública reduzida. |
| `POST` | `/emprestimos` | Usuário autenticado (editor ou administrador). `dataRetirada` com mais de 5 minutos no futuro retorna `400` `backend.emprestimos.data_retirada_futura`. |
| `PATCH` | `/emprestimos/:id` | Usuário autenticado; atualização dos itens de empréstimo. |
| `PATCH` | `/emprestimos/:id/devolver` | Usuário autenticado; registro de devolução. `dataDevolucao` é opcional (omitida = horário do servidor). Mais de 5 minutos no futuro retorna `400` `backend.emprestimos.data_devolucao_futura`; anterior à retirada, comparada por minuto, retorna `400` `backend.emprestimos.data_devolucao_anterior`. |
| `GET` | `/ocorrencias` | Público/convidado ou autenticado; projeção pública reduzida. |
| `POST`, `PATCH` | `/ocorrencias`, `/ocorrencias/:id` | Usuário autenticado. |
| `PATCH` | `/ocorrencias/:id/resolver` | Usuário autenticado. |
| `DELETE` | `/ocorrencias/:id` | Administrador. |
| `GET` | `/responsaveis` | Sessão autenticada. |
| `POST` | `/responsaveis` | Administrador. |
| `GET`, `POST` | `/usuarios` | Administrador. `POST` e `PATCH /usuarios/:id` exigem `login` em formato de e-mail (o login por senha não mudou e contas existentes continuam funcionando). A recuperação de senha só funciona se a caixa de e-mail existir. `GET` inclui `criadoPor` e `atualizadoPor`. |
| `PATCH` | `/usuarios/:id` | Administrador; altera nome, login, nível de acesso ou status `ativo`. Erros: `400` `backend.usuarios.nao_pode_desativar_a_si_mesmo`, `400` `backend.usuarios.nao_pode_rebaixar_a_si_mesmo` e `409` `backend.usuarios.ultimo_administrador` (deve restar ao menos um administrador ativo). |
| `POST` | `/usuarios/:id/password-reset` | Administrador; corpo `{ "senha": "..." }` com a política forte (12+ caracteres, maiúscula, minúscula, número, símbolo, máx. 72 bytes). Grava o novo hash, incrementa `sessionVersion` (encerra as sessões do usuário) e registra `PASSWORD_RESET` na auditoria na mesma transação. Retorna `204`. Usado pela ação **Redefinir senha** em **Cadastros → Usuários**. |
| `POST`, `DELETE` | `/usuarios/:id/rfid-token` | Administrador; provisiona ou revoga token RFID. |

## Sincronização de dados

| Método | Caminho | Acesso | Finalidade |
|---|---|---|---|
| `GET` | `/sync/estado?desde=<int opcional>` | Usuário autenticado (editor ou administrador). | Feed leve de mudanças usado pelo app para atualizar os dados automaticamente. |

Resposta `200`: `{ "serverTime": "<ISO 8601>", "cursor": "<string>", "entidades": ["Emprestimo", "Equipamento", ...] }`.

- `cursor` marca a posição no histórico de mudanças (fica alguns segundos atrás da mudança mais recente, para não perder transações confirmadas fora de ordem); envie-o como `desde` na próxima chamada. `entidades` lista os tipos de registro alterados desde `desde` — apenas `Categoria`, `Emprestimo`, `Equipamento`, `Ocorrencia` e `Responsavel` (vazio na primeira chamada sem `desde`). Uma mudança recente pode aparecer em duas consultas seguidas.
- Só nomes de entidades são retornados, nunca o conteúdo dos registros nem quem os alterou. `serverTime` é o relógio do servidor, usado pelo app nos campos de data e hora automáticos.
- A rota nunca renova o timeout de inatividade de 30 minutos do administrador.
- Erros: `400` `backend.validacao.dados_invalidos` para `desde` inválido ou parâmetro desconhecido; `401` sem autenticação ou sessão expirada; `429` `backend.seguranca.muitas_requisicoes` (limite próprio de 900 requisições a cada 15 min por IP, separado do limite global).
- Cabeçalho opcional `X-EduAssets-Atividade: passiva`: em qualquer requisição autenticada mantém todas as verificações, mas não conta como atividade do administrador (usado pelas atualizações automáticas em segundo plano). Só pode encurtar a sessão, nunca estendê-la.

## Notificações push

Inscrição de dispositivos de administradores em notificações Web Push (Push API + service worker + VAPID). Todas as rotas exigem `requireAdmin`; `PUT`, `DELETE` e `POST /teste` têm limite de 30 requisições a cada 15 minutos por usuário. A disponibilidade é informada por `pushNotifications` em `GET /auth/session-capabilities`.

| Método | Caminho | Acesso | Finalidade |
|---|---|---|---|
| `GET` | `/notificacoes/push/config` | Administrador | Retorna `{ habilitado: boolean, chavePublica: string \| null }`. |
| `PUT` | `/notificacoes/push/inscricao` | Administrador; limite de taxa | Corpo `{ inscricao: { endpoint, keys: { p256dh, auth } }, preferencias: { emprestimo, devolucao, ocorrencia } }`. Faz upsert pelo `endpoint` e retorna `200` com `{ preferencias }`. Um endpoint vinculado anteriormente a outro usuário passa a pertencer ao usuário atual. |
| `DELETE` | `/notificacoes/push/inscricao` | Administrador; limite de taxa | Corpo `{ endpoint }`. Remove apenas a inscrição do próprio chamador. Retorna `204`. |
| `POST` | `/notificacoes/push/teste` | Administrador; limite de taxa | Envia um teste somente aos dispositivos do próprio chamador. Retorna `202`. |

- `endpoint` deve ser `https`, sem credenciais nem porta, e seu host deve estar na lista de serviços de push permitidos: `fcm.googleapis.com`, `*.push.apple.com`, `*.push.services.mozilla.com` e `*.notify.windows.com`. A validação é repetida no envio (proteção contra SSRF).
- `PUT` e `POST /teste` respondem `503` com `{ erro: 'backend.notificacoes.push_indisponivel' }` quando o push não está configurado. Outras chaves de erro: `backend.notificacoes.endpoint_invalido`, `backend.notificacoes.chave_invalida`, `backend.notificacoes.preferencias_invalidas` e `backend.notificacoes.muitas_requisicoes`.
- Payload recebido pelo service worker: `{ v: 1, tipo: 'EMPRESTIMO_CRIADO' | 'DEVOLUCAO_REGISTRADA' | 'OCORRENCIA_REGISTRADA' | 'TESTE', titulo, corpo, url, tag, criadoEm }`.
- O envio ocorre após o commit da operação e nunca atrasa nem faz falhar a requisição original. TTL de 1 hora e urgência `high`. Resposta `404` ou `410` do serviço de push remove a inscrição.
- Alvo do clique na notificação: empréstimo e devolução abrem `/#panel-dashboard` (aba Histórico); ocorrência abre `/#panel-controle`; teste abre `/#panel-inicio`.

## Autoria dos registros

Respostas autenticadas (Administrador ou Editor) de empréstimos, ocorrências, equipamentos, categorias e responsáveis incluem objetos de autor `{ id, nome }` (ou `null`): `criadoPor` e `atualizadoPor` em todos os que os possuem, `devolvidoPor` em empréstimos e `resolvidoPor` em ocorrências; categorias e responsáveis têm apenas `criadoPor`. Convidados nunca recebem dados de autoria; `GET /categorias` para Convidados retorna `{ id, nome }`. Os campos vêm da migration `20261113150000_record_authorship` (veja o Modelo de Dados).

## Validação e regras

- Parâmetros `:id` são validados como inteiros positivos pelas rotas que os recebem.
- Os corpos são validados por schemas em `backend/src/schemas/`; consulte esses arquivos antes de criar ou integrar um cliente.
- `requireAuth` confirma token, usuário existente, versão de sessão e papel atual no banco.
- `requireAdmin` verifica o nível de acesso atualizado no banco. Ocultar ou desabilitar uma ação no frontend não substitui essa proteção.
- Requisições mutáveis com cookie são bloqueadas com `403` quando a origem não é confiável. `401` indica ausência ou invalidez de autenticação; `403` indica origem ou permissão insuficiente.
- `GET /responsaveis` e `/usuarios` não são endpoints públicos. Não amplie respostas anônimas sem revisar minimização de dados.
- Os endpoints RFID só existem quando habilitados por configuração; a instalação de referência mantém o fluxo desativado/publicamente inacessível.

## Referências no código

- Montagem: [`backend/src/routes/index.ts`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/routes/index.ts) e [`backend/src/app.ts`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/app.ts) no repositório do backend.
- Autenticação e cookies: arquivos do backend [`auth.ts`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/routes/auth.ts), [`middleware auth`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/middlewares/auth.ts), [`middleware CSRF`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/middlewares/csrf.ts) e [`sessionCookie.ts`](https://github.com/edu-assets/api-eduassets/blob/main/backend/src/lib/sessionCookie.ts).
- Schemas: [`backend/src/schemas/`](https://github.com/edu-assets/api-eduassets/tree/main/backend/src/schemas) no repositório do backend.
- Cliente do navegador: `src/core/api/apiClient.ts` e `src/core/api/auth.ts` neste repositório frontend.
