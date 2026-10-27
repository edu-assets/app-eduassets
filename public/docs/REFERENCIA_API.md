# Referência da API — eduAssets

> Esta referência descreve os routers e middlewares presentes no código. O contrato exato dos corpos JSON é definido pelos schemas Zod em `backend/src/schemas/`; nenhuma rota substitui as regras de autorização implementadas no backend.

## Base e transporte

A API Express é publicada na raiz do host configurado. Não existe prefixo `/api` na montagem atual. Em desenvolvimento, o proxy do Vite encaminha as rotas para `http://127.0.0.1:3000`. Para builds de produção, `VITE_API_BASE_URL` deve conter a origem da API, sem acrescentar um prefixo que não esteja configurado no servidor.

As rotas JSON usam `Content-Type: application/json`. A API valida os corpos com Zod, limita requisições e centraliza erros. As respostas de erro usam um objeto JSON com a chave `erro`; erros de validação podem incluir `detalhes`. Os códigos HTTP devem ser interpretados em conjunto com essa resposta.

## Sessão, credenciais e CSRF

O fluxo atual prefere sessão em cookie quando `GET /auth/session-capabilities` retorna `{"cookieSession":true}`. Esse endpoint usa `Cache-Control: no-store`. O frontend então envia requisições com `credentials: include`; o login solicita `X-Auth-Mode: cookie` e recebe o perfil sem expor o JWT na resposta. O cookie é `HttpOnly`, `SameSite=Lax`, limitado ao caminho `/`, e expira junto com o JWT. Em HTTPS de produção é `Secure` e usa o nome `__Host-eduassets_session`.

Em requisições mutáveis autenticadas por cookie (`POST`, `PUT`, `PATCH` ou `DELETE`), o backend exige um cabeçalho `Origin` permitido pela configuração CORS. Não remova essa validação para resolver erros de CORS. Navegadores devem usar a origem web autorizada no servidor e uma configuração proxy/TLS que preserve corretamente a informação de HTTPS.

O middleware também aceita `Authorization: Bearer <JWT>` para compatibilidade com clientes antigos e modos de fallback. O frontend usa essa opção somente quando a API não anuncia suporte a cookie; evite persistir tokens em armazenamento acessível a JavaScript quando cookie HttpOnly estiver disponível. Não inclua cookies, JWTs, senhas ou segredos em logs ou exemplos reais.

## Autenticação e saúde

| Método | Caminho | Acesso | Finalidade |
|---|---|---|---|
| `GET` | `/` | Público | Resposta básica de status. |
| `GET` | `/health` | Público | Liveness do processo. |
| `GET` | `/ready` | Público | Readiness com verificação limitada do PostgreSQL. |
| `GET` | `/auth/session-capabilities` | Público | Informa se o servidor suporta sessão de navegador via cookie. |
| `POST` | `/auth/login` | Público; rate limited e Origin validado ao solicitar modo cookie | Autentica com `login` e `password`; grava cookie e retorna o perfil no modo cookie. |
| `GET` | `/auth/me` | Sessão autenticada | Retorna o perfil da sessão atual. |
| `POST` | `/auth/logout` | Sessão autenticada | Revoga a versão de sessão do usuário e remove o cookie. Retorna `204`. |
| `PATCH` | `/auth/senha` | Sessão autenticada | Altera a senha usando `senhaAtual` e `novaSenha`; reemite a sessão atual quando a alteração tem sucesso. |
| `POST` | `/auth/rfid` | Somente quando `RFID_BRIDGE_ENABLED=true`; bridge autorizada | Recebe leitura RFID do processo bridge e não é um endpoint de login de navegador. |
| `POST` | `/auth/rfid/session` | Somente com bridge RFID habilitada; código curto de uso único | Troca o código de login RFID pelo cookie de sessão do navegador. |

## Inventário e operações

`optionalAuth` permite leitura pública em Modo Convidado, mas aplica autenticação se a requisição fornecer cookie ou token. Cookies presentes são validados; uma sessão inválida não deve ser tratada como anônima. Respostas públicas são projeções minimizadas definidas no servidor.

| Método | Caminho | Acesso |
|---|---|---|
| `GET` | `/categorias` | Público/convidado ou autenticado. |
| `POST` | `/categorias` | Administrador. |
| `GET` | `/equipamentos` | Público/convidado ou autenticado. |
| `POST`, `PATCH` | `/equipamentos`, `/equipamentos/:id` | Administrador. |
| `GET` | `/emprestimos` | Público/convidado ou autenticado; projeção pública reduzida. |
| `POST` | `/emprestimos` | Usuário autenticado (editor ou administrador). |
| `PATCH` | `/emprestimos/:id` | Usuário autenticado; atualização dos itens de empréstimo. |
| `PATCH` | `/emprestimos/:id/devolver` | Usuário autenticado; registro de devolução. |
| `GET` | `/ocorrencias` | Público/convidado ou autenticado; projeção pública reduzida. |
| `POST`, `PATCH` | `/ocorrencias`, `/ocorrencias/:id` | Usuário autenticado. |
| `PATCH` | `/ocorrencias/:id/resolver` | Usuário autenticado. |
| `DELETE` | `/ocorrencias/:id` | Administrador. |
| `GET` | `/responsaveis` | Sessão autenticada. |
| `POST` | `/responsaveis` | Administrador. |
| `GET`, `POST` | `/usuarios` | Administrador. |
| `POST`, `DELETE` | `/usuarios/:id/rfid-token` | Administrador; provisiona ou revoga token RFID. |

## Validação e regras

- Parâmetros `:id` são validados como inteiros positivos pelas rotas que os recebem.
- Os corpos são validados por schemas em `backend/src/schemas/`; consulte esses arquivos antes de criar ou integrar um cliente.
- `requireAuth` confirma token, usuário existente, versão de sessão e papel atual no banco.
- `requireAdmin` verifica o nível de acesso atualizado no banco. Ocultar ou desabilitar uma ação no frontend não substitui essa proteção.
- Requisições mutáveis com cookie são bloqueadas com `403` quando a origem não é confiável. `401` indica ausência ou invalidez de autenticação; `403` indica origem ou permissão insuficiente.
- `GET /responsaveis` e `/usuarios` não são endpoints públicos. Não amplie respostas anônimas sem revisar minimização de dados.
- Os endpoints RFID só existem quando habilitados por configuração; a instalação de referência mantém o fluxo desativado/publicamente inacessível.

## Referências no código

- Montagem: `backend/src/routes/index.ts` e `backend/src/app.ts`.
- Autenticação e cookies: `backend/src/routes/auth.ts`, `backend/src/middlewares/auth.ts`, `backend/src/middlewares/csrf.ts` e `backend/src/lib/sessionCookie.ts`.
- Schemas: `backend/src/schemas/`.
- Cliente do navegador: `frontend/src/core/api/apiClient.ts` e `frontend/src/core/api/auth.ts`.
