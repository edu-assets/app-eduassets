# Modelo de Dados — eduAssets

> **Fonte e escopo:** este documento é derivado de `backend/prisma/schema.prisma`. O comportamento de negócio só é incluído quando verificado em `emprestimo.service.ts`, `estoque.service.ts`, `ocorrencia.service.ts`, `usuario.service.ts` e `equipamento.service.ts`.

O datasource do Prisma é PostgreSQL. Os campos escalares são não nulos, salvo quando o tipo do schema termina em `?`; os campos de relação abaixo são relações do Prisma, não colunas persistidas.

## Entidades e campos

### Categoria

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `nome` | `String` | Não | `@unique` |
| `equipamentos` | `Equipamento[]` | Não | Relação Prisma, 1:N |
| `criadoPorId` | `Int` | Sim | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE SET NULL` |
| `criadoPor` | `Usuario` | Sim | Relação Prisma, N:1 |

### Equipamento

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `categoriaId` | `Int` | Não | Escalar de chave estrangeira para `Categoria.id` |
| `modelo` | `String` | Não | — |
| `quantidadeTotal` | `Int` | Não | — |
| `quantidadeDisponivel` | `Int` | Não | — |
| `quantidadeQuebrada` | `Int` | Não | `@default(0)` |
| `createdAt` | `DateTime` | Não | `@default(now())` |
| `updatedAt` | `DateTime` | Não | Comportamento Prisma `@updatedAt` |
| `categoria` | `Categoria` | Não | Relação Prisma, N:1 |
| `itensEmprestimo` | `ItemEmprestimo[]` | Não | Relação Prisma, 1:N |
| `ocorrencias` | `Ocorrencia[]` | Não | Relação Prisma, 1:N |
| `criadoPorId` | `Int` | Sim | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE SET NULL` |
| `atualizadoPorId` | `Int` | Sim | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE SET NULL` |
| `criadoPor` | `Usuario` | Sim | Relação Prisma, N:1 |
| `atualizadoPor` | `Usuario` | Sim | Relação Prisma, N:1 |

### Responsavel

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `nome` | `String` | Não | — |
| `cargo` | `String` | Não | — |
| `ativo` | `Boolean` | Não | `@default(true)`; responsáveis inativos não aparecem em `GET /responsaveis` (exceto para admin com `incluirInativos=true`) nem podem receber novos empréstimos |
| `emprestimos` | `Emprestimo[]` | Não | Relação Prisma, 1:N |
| `criadoPorId` | `Int` | Sim | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE SET NULL` |
| `criadoPor` | `Usuario` | Sim | Relação Prisma, N:1 |

`Responsavel` é uma entidade de domínio referenciada pelos empréstimos. O schema não lhe atribui nível de acesso ao sistema; o acesso é representado separadamente por `Usuario`. A migration `20261114100000_loan_history_filters_responsavel_active` (aditiva) adiciona `Responsavel.ativo` (padrão `true`, então os registros existentes continuam ativos) e o índice `Emprestimo(dataRetirada, id)`.

### Usuario

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `nome` | `String` | Não | — |
| `login` | `String` | Não | `@unique` |
| `passwordHash` | `String` | Não | — |
| `nivelAcesso` | `NivelAcesso` | Não | Sem padrão no schema |
| `sessionVersion` | `Int` | Não | `@default(0)`; incrementado em logout/troca de senha para revogar JWTs anteriores |
| `rfidTokenHash` | `String` | Sim | `@unique`; `null` quando não há cartão provisionado |
| `createdAt` | `DateTime` | Não | `@default(now())` |
| `pushSubscriptions` | `PushSubscription[]` | Não | Relação Prisma, 1:N |

`Usuario` é referenciado pelos campos de autoria das entidades de domínio (`criadoPorId`, `atualizadoPorId`, `devolvidoPorId`, `resolvidoPorId`), todos anuláveis; a relação `pushSubscriptions` liga o usuário às inscrições de notificação push.

### Emprestimo

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `solicitanteNome` | `String` | Não | — |
| `responsavelId` | `Int` | Não | Escalar de chave estrangeira para `Responsavel.id` |
| `status` | `StatusEmprestimo` | Não | `@default(ABERTO)` |
| `dataRetirada` | `DateTime` | Não | Sem padrão no schema |
| `dataDevolucao` | `DateTime` | Sim | — |
| `observacao` | `String` | Sim | — |
| `createdAt` | `DateTime` | Não | `@default(now())` |
| `responsavel` | `Responsavel` | Não | Relação Prisma, N:1 |
| `itens` | `ItemEmprestimo[]` | Não | Relação Prisma, 1:N |
| `criadoPorId` | `Int` | Sim | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE SET NULL` |
| `atualizadoPorId` | `Int` | Sim | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE SET NULL` |
| `atualizadoEm` | `DateTime` | Sim | Data da última alteração |
| `devolvidoPorId` | `Int` | Sim | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE SET NULL` |
| `criadoPor` | `Usuario` | Sim | Relação Prisma, N:1 |
| `atualizadoPor` | `Usuario` | Sim | Relação Prisma, N:1 |
| `devolvidoPor` | `Usuario` | Sim | Relação Prisma, N:1 |

### ItemEmprestimo

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `emprestimoId` | `Int` | Não | Escalar de chave estrangeira para `Emprestimo.id` |
| `equipamentoId` | `Int` | Não | Escalar de chave estrangeira para `Equipamento.id` |
| `quantidade` | `Int` | Não | — |
| `emprestimo` | `Emprestimo` | Não | Relação Prisma, N:1 |
| `equipamento` | `Equipamento` | Não | Relação Prisma, N:1 |

`ItemEmprestimo` é a entidade de associação entre um empréstimo e um equipamento. O schema não declara constraint de unicidade composta para `(emprestimoId, equipamentoId)`.

### Ocorrencia

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `equipamentoId` | `Int` | Não | Escalar de chave estrangeira para `Equipamento.id` |
| `numero` | `String` | Sim | — |
| `tipo` | `TipoOcorrencia` | Não | Sem padrão no schema |
| `status` | `StatusOcorrencia` | Não | `@default(ABERTO)` |
| `problema` | `String` | Não | — |
| `descricao` | `String` | Não | — |
| `resolvidoEm` | `DateTime` | Sim | — |
| `medidasTomadas` | `String` | Sim | — |
| `createdAt` | `DateTime` | Não | `@default(now())` |
| `equipamento` | `Equipamento` | Não | Relação Prisma, N:1 |
| `criadoPorId` | `Int` | Sim | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE SET NULL` |
| `atualizadoPorId` | `Int` | Sim | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE SET NULL` |
| `atualizadoEm` | `DateTime` | Sim | Data da última alteração |
| `resolvidoPorId` | `Int` | Sim | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE SET NULL` |
| `criadoPor` | `Usuario` | Sim | Relação Prisma, N:1 |
| `atualizadoPor` | `Usuario` | Sim | Relação Prisma, N:1 |
| `resolvidoPor` | `Usuario` | Sim | Relação Prisma, N:1 |

### PushSubscription

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `usuarioId` | `Int` | Não | Escalar de chave estrangeira para `Usuario.id`; `ON DELETE CASCADE` |
| `endpoint` | `String` | Não | `@unique` |
| `p256dh` | `String` | Não | — |
| `auth` | `String` | Não | — |
| `notificarEmprestimo` | `Boolean` | Não | `@default(true)` |
| `notificarDevolucao` | `Boolean` | Não | `@default(true)` |
| `notificarOcorrencia` | `Boolean` | Não | `@default(true)` |
| `createdAt` | `DateTime` | Não | `@default(now())` |
| `updatedAt` | `DateTime` | Não | Comportamento Prisma `@updatedAt` |
| `lastSuccessAt` | `DateTime` | Sim | — |
| `usuario` | `Usuario` | Não | Relação Prisma, N:1 |

Criada pela migration `20261113090000_push_subscriptions`, com índice em `usuarioId`. Não armazena endereço IP nem user agent.

## Enums

| Enum | Valores |
|---|---|
| `NivelAcesso` | `ADMINISTRADOR`, `EDITOR` |
| `StatusEmprestimo` | `ABERTO`, `DEVOLVIDO` |
| `TipoOcorrencia` | `OBSERVACAO`, `MANUTENCAO`, `QUEBRADO` |
| `StatusOcorrencia` | `ABERTO`, `RESOLVIDO` |

## Relacionamentos

```text
Categoria 1───N Equipamento
Responsavel 1───N Emprestimo
Emprestimo 1───N ItemEmprestimo N───1 Equipamento
Equipamento 1───N Ocorrencia
Usuario 1───N PushSubscription
Usuario (independente; sem relação com as entidades de domínio)
```

As relações com chave estrangeira são `Equipamento.categoriaId → Categoria.id`, `Emprestimo.responsavelId → Responsavel.id`, `ItemEmprestimo.emprestimoId → Emprestimo.id`, `ItemEmprestimo.equipamentoId → Equipamento.id` e `Ocorrencia.equipamentoId → Equipamento.id`. O schema Prisma não declara ações `onDelete`/`onUpdate`; entretanto, a migration inicial versionada cria as cinco FKs com `ON DELETE RESTRICT` e `ON UPDATE CASCADE`. Os campos de autoria (`criadoPorId`, `atualizadoPorId`, `devolvidoPorId`, `resolvidoPorId`) são FKs para `Usuario.id` com `ON DELETE SET NULL`, criadas pela migration aditiva `20261113150000_record_authorship`, que preenche os registros existentes a partir do `AuditLog`; registros sem linhas de auditoria permanecem com autor nulo. A FK `PushSubscription.usuarioId → Usuario.id` é criada pela migration `20261113090000_push_subscriptions` com `ON DELETE CASCADE`. Para conhecer o banco realmente migrado, considere as migrations SQL em conjunto com o schema Prisma.

## Padrões, chaves, unicidade e índices

- Todos os campos `@id` são chaves primárias inteiras com `autoincrement()`.
- `Equipamento.quantidadeQuebrada`, `Emprestimo.status` e `Ocorrencia.status` possuem padrões no schema (`0`, `ABERTO` e `ABERTO`, respectivamente).
- `createdAt` de `Equipamento`, `Usuario`, `Emprestimo` e `Ocorrencia` usa `@default(now())`.
- `Equipamento.updatedAt` usa `@updatedAt` do Prisma; não é declarado como campo nulo fornecido pelo usuário.
- As declarações únicas são `Categoria.nome`, `Usuario.login`, `Usuario.rfidTokenHash` (nulo) e `PushSubscription.endpoint`. Elas geram enforcement/índices de unicidade para esses campos.
- Os índices secundários explícitos cobrem `Emprestimo.status`, `Ocorrencia.status`, quantidades disponível/quebrada do equipamento, `ItemEmprestimo.emprestimoId`, o composto `ItemEmprestimo(equipamentoId, emprestimoId)`, `Ocorrencia(equipamentoId, status, tipo)` e `PushSubscription.usuarioId`. `Emprestimo(dataRetirada, id)` sustenta a paginação do histórico (ordem `dataRetirada` e `id` decrescentes).
- `ItemEmprestimo.emprestimoId` e `Ocorrencia.equipamentoId` agora têm índices explícitos para as consultas e referências usadas; o primeiro também integra índice composto para localizar empréstimos abertos por equipamento.

## Regras de negócio verificadas nos serviços do backend

### Empréstimos e estoque

- `criarEmprestimo` recebe `dataRetirada` opcional na entrada do serviço; quando omitida, o serviço grava o instante atual. O campo do Prisma continua obrigatório e sem padrão no schema.
- A criação do empréstimo ocorre em transação. As quantidades dos itens são agrupadas por `equipamentoId`, o estoque disponível é validado, o empréstimo e seus itens são criados e o estoque disponível é decrementado atomicamente.
- A validação considera equipamento inexistente como estoque insuficiente e lança `EstoqueInsuficienteError` quando alguma quantidade solicitada excede o estoque efetivo.
- `atualizarItensEmprestimo` só edita empréstimo com status `ABERTO`. Ela devolve as quantidades antigas ao estoque efetivo, substitui as linhas de itens e decrementa as novas quantidades agrupadas em uma única transação.
- `devolverEmprestimo` muda um empréstimo aberto para `DEVOLVIDO`, grava o timestamp offset-aware validado enviado pela UI (ou o instante atual quando clientes antigos omitem o campo) e incrementa o estoque disponível para cada item. Uma segunda devolução é rejeitada; a linha do empréstimo e o histórico dos itens são mantidos, não excluídos.
- Os decrementos de estoque usam update atômico com condição `quantidadeDisponivel >= quantidade`; uma falha de concorrência aborta a transação em vez de reduzir o estoque abaixo da quantidade verificada.
- Atualizações administrativas de equipamento bloqueiam a linha, incluem quantidades em empréstimos ativos e ocorrências abertas de manutenção no cálculo de capacidade e rejeitam combinações de total/disponível/quebrado abaixo do estoque comprometido. Ocorrências abertas de quebra também devem continuar representadas em `quantidadeQuebrada`.

### Ocorrências

- `criarOcorrencias` recebe um vetor `numeros` e cria uma linha de `Ocorrencia` por número. A quantidade de entradas fornecidas controla o ajuste de estoque.
- Para `MANUTENCAO` e `QUEBRADO`, a criação decrementa `Equipamento.quantidadeDisponivel` pela quantidade de entradas fornecidas. Para `QUEBRADO`, também incrementa `quantidadeQuebrada` nesse valor. `OBSERVACAO` não ajusta estoque na criação.
- `resolverOcorrencia` rejeita ocorrência já resolvida, define `status = RESOLVIDO`, registra `resolvidoEm` e grava `medidasTomadas`. Para `MANUTENCAO` e `QUEBRADO`, incrementa o estoque disponível em um; para `QUEBRADO`, também decrementa o estoque quebrado em um.
- Atualizar os campos descritivos de uma ocorrência não a resolve nem ajusta o estoque.
- Excluir ocorrência aberta de `MANUTENCAO` ou `QUEBRADO` devolve uma unidade ao estoque disponível e, para `QUEBRADO`, remove uma unidade do estoque quebrado. Excluir ocorrência resolvida não desfaz o ajuste feito na resolução. A exclusão de `OBSERVACAO` não ajusta estoque.

### Usuários e RFID

- `criarUsuario` e a edição de usuários exigem `login` em formato de e-mail (contas antigas com outro formato continuam entrando). A API impede desativar ou rebaixar a si mesmo e deixar o sistema sem administrador ativo.
- `criarUsuario` rejeita `login` já existente, aplica hash bcrypt à senha informada (custo `12`) e armazena o resultado em `passwordHash`; a senha em texto puro não é um campo do modelo.
- A listagem de usuários expõe `possuiCartaoRfid` como booleano derivado de `rfidTokenHash`, em vez de retornar o hash armazenado. O schema armazena apenas o hash, que é nulo quando não há cartão.
- O provisionamento RFID exige que a bridge esteja habilitada e que o usuário exista; depois envia um token gerado à bridge local. Somente após resposta bem-sucedida da bridge o serviço grava `hashRfidToken(token)` em `rfidTokenHash`; o token gerado é retornado nessa operação. Bridge desabilitada, falhas e timeouts resultam em erros do serviço.
- Revogar um cartão RFID define `rfidTokenHash` como `null`.

### Notificações push

- Empréstimos, devoluções e ocorrências disparam notificações somente depois do commit da transação; o envio nunca atrasa nem faz falhar a operação original.
- Destinatários: contas ativas com `nivelAcesso = ADMINISTRADOR` que têm inscrição com a preferência correspondente ativa (`notificarEmprestimo`, `notificarDevolucao` ou `notificarOcorrencia`), verificados no momento do envio. Contas `EDITOR` nunca recebem, e o usuário que registrou a operação não recebe a própria notificação.
- Um pedido de ocorrência gera uma única notificação, mesmo com vários números de patrimônio.
- `PUT` faz upsert da inscrição por `endpoint`; `DELETE` remove apenas a inscrição do próprio usuário. O logout remove a inscrição do dispositivo, e a troca ou a redefinição de senha remove todas as inscrições do usuário.
- Resposta `404` ou `410` do serviço de push remove a inscrição afetada.

## Projeções públicas do Modo Convidado

As respostas anônimas de `GET /equipamentos`, `/emprestimos` e `/ocorrencias` usam serializers allowlist explícitos no backend. Empréstimos ocultam solicitante, responsável e observação; ocorrências ocultam número de patrimônio, problema, descrição e medidas; equipamento expõe somente campos necessários ao painel (sem IDs/campos de auditoria). `GET /responsaveis` e `/usuarios` exigem autenticação. Isso reduz payloads da aplicação, mas não equivale a políticas RLS ou permissões do provedor de banco.

## Limites de constraints e auditoria

As migrations `20261022090000_stock_checks_and_fk_indexes` adicionam respectivamente constraints `CHECK` para contagens/quantidades e `Usuario.sessionVersion`, padrão `0`. A versão de sessão é comparada em cada autenticação; logout/troca de senha incrementam o valor para revogar sessões anteriores. A migration de sessão preserva usuários existentes, mas exige novo login para JWTs emitidos antes dela. A migration `20260725225116_add_password_hash_to_usuario` adiciona `passwordHash` obrigatório sem valor padrão e, portanto, não pode ser aplicada a uma tabela `Usuario` já populada sem uma estratégia de backfill revisada. As checks ficam no SQL porque o schema Prisma 6 não oferece atributo `CHECK`. A migration de estoque falha em vez de reescrever linhas antigas que violem uma constraint; valide migrations em banco descartável/staging antes de produção. Checks entre tabelas para empréstimos/ocorrências abertos permanecem nos serviços transacionais. Não há `CHECK` para datas nem para consistência entre status e datas. Grants, RLS, PostgREST e outros controles externos não são representados no schema Prisma; a verificação real está registrada abaixo.

## Grants e RLS verificados no banco

Verificação feita em 12/11/2026 no SQL Editor do Neon (branch principal, banco `neondb`), consultando `information_schema.role_table_grants` e `pg_class.relrowsecurity` no schema `public`:

- **Grants:** somente o papel `neondb_owner` tem privilégios nas 10 tabelas (`AuditLog`, `Categoria`, `Emprestimo`, `Equipamento`, `ItemEmprestimo`, `Ocorrencia`, `PasswordResetToken`, `Responsavel`, `Usuario` e `_prisma_migrations`): `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` e `TRIGGER`. Não há grants a `PUBLIC` nem a papéis de API de dados (`anonymous`, `authenticated`) ou a outros papéis.
- **RLS:** desativado (`relrowsecurity = false`) em todas as tabelas. É o comportamento esperado: o banco não é exposto diretamente a clientes e a autorização é aplicada pela API.
- **Consequência:** como só o `neondb_owner` tem acesso às tabelas, a API se conecta com o papel dono do schema, que também pode executar DDL (`DROP`, `ALTER`). Melhoria opcional de menor privilégio: criar um papel da aplicação restrito a `SELECT/INSERT/UPDATE/DELETE` e reservar o `neondb_owner` para as migrations.

Repita a verificação depois de mudanças de papéis ou de habilitar recursos do Neon que criem papéis (como a Data API). A tabela `PushSubscription` foi criada depois desta verificação, pela migration aplicada com o mesmo papel dono do schema; inclua-a na próxima conferência.
