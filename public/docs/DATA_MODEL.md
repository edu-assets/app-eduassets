# Data Model — eduAssets

> **Source and scope:** this document is derived from `backend/prisma/schema.prisma`. Business behavior is included only where it was verified in `emprestimo.service.ts`, `estoque.service.ts`, `ocorrencia.service.ts`, `usuario.service.ts`, and `equipamento.service.ts`.

The Prisma datasource is PostgreSQL. Scalar fields are non-nullable unless their schema type ends in `?`; relation fields below are Prisma relations, not persisted columns.

## Entities and fields

### Categoria (Category)

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `nome` | `String` | No | `@unique` |
| `equipamentos` | `Equipamento[]` | No | Prisma relation, 1:N |
| `criadoPorId` | `Int` | Yes | Foreign-key scalar to `Usuario.id`; `ON DELETE SET NULL` |
| `criadoPor` | `Usuario` | Yes | Prisma relation, N:1 |

### Equipamento (Equipment)

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `categoriaId` | `Int` | No | Foreign-key scalar to `Categoria.id` |
| `modelo` | `String` | No | — |
| `quantidadeTotal` | `Int` | No | — |
| `quantidadeDisponivel` | `Int` | No | — |
| `quantidadeQuebrada` | `Int` | No | `@default(0)` |
| `createdAt` | `DateTime` | No | `@default(now())` |
| `updatedAt` | `DateTime` | No | Prisma `@updatedAt` behavior |
| `categoria` | `Categoria` | No | Prisma relation, N:1 |
| `itensEmprestimo` | `ItemEmprestimo[]` | No | Prisma relation, 1:N |
| `ocorrencias` | `Ocorrencia[]` | No | Prisma relation, 1:N |
| `criadoPorId` | `Int` | Yes | Foreign-key scalar to `Usuario.id`; `ON DELETE SET NULL` |
| `atualizadoPorId` | `Int` | Yes | Foreign-key scalar to `Usuario.id`; `ON DELETE SET NULL` |
| `criadoPor` | `Usuario` | Yes | Prisma relation, N:1 |
| `atualizadoPor` | `Usuario` | Yes | Prisma relation, N:1 |

### Responsavel (Responsible party)

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `nome` | `String` | No | — |
| `cargo` | `String` | No | — |
| `emprestimos` | `Emprestimo[]` | No | Prisma relation, 1:N |
| `criadoPorId` | `Int` | Yes | Foreign-key scalar to `Usuario.id`; `ON DELETE SET NULL` |
| `criadoPor` | `Usuario` | Yes | Prisma relation, N:1 |

`Responsavel` is a domain entity referenced by loans. The schema does not give it a system access level; access is represented separately by `Usuario`.

### Usuario (User)

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `nome` | `String` | No | — |
| `login` | `String` | No | `@unique` |
| `passwordHash` | `String` | No | — |
| `nivelAcesso` | `NivelAcesso` | No | No schema default |
| `sessionVersion` | `Int` | No | `@default(0)`; incremented on logout/password change to revoke earlier JWTs |
| `rfidTokenHash` | `String` | Yes | `@unique`; `null` when no card is provisioned |
| `createdAt` | `DateTime` | No | `@default(now())` |
| `pushSubscriptions` | `PushSubscription[]` | No | Prisma relation, 1:N |

`Usuario` is referenced by the nullable authorship fields of the domain entities (`criadoPorId`, `atualizadoPorId`, `devolvidoPorId`, `resolvidoPorId`); the `pushSubscriptions` relation links the user to their push notification subscriptions.

### Emprestimo (Loan)

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `solicitanteNome` | `String` | No | — |
| `responsavelId` | `Int` | No | Foreign-key scalar to `Responsavel.id` |
| `status` | `StatusEmprestimo` | No | `@default(ABERTO)` |
| `dataRetirada` | `DateTime` | No | No schema default |
| `dataDevolucao` | `DateTime` | Yes | — |
| `observacao` | `String` | Yes | — |
| `createdAt` | `DateTime` | No | `@default(now())` |
| `responsavel` | `Responsavel` | No | Prisma relation, N:1 |
| `itens` | `ItemEmprestimo[]` | No | Prisma relation, 1:N |
| `criadoPorId` | `Int` | Yes | Foreign-key scalar to `Usuario.id`; `ON DELETE SET NULL` |
| `atualizadoPorId` | `Int` | Yes | Foreign-key scalar to `Usuario.id`; `ON DELETE SET NULL` |
| `atualizadoEm` | `DateTime` | Yes | Timestamp of the last change |
| `devolvidoPorId` | `Int` | Yes | Foreign-key scalar to `Usuario.id`; `ON DELETE SET NULL` |
| `criadoPor` | `Usuario` | Yes | Prisma relation, N:1 |
| `atualizadoPor` | `Usuario` | Yes | Prisma relation, N:1 |
| `devolvidoPor` | `Usuario` | Yes | Prisma relation, N:1 |

### ItemEmprestimo (Loan item)

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `emprestimoId` | `Int` | No | Foreign-key scalar to `Emprestimo.id` |
| `equipamentoId` | `Int` | No | Foreign-key scalar to `Equipamento.id` |
| `quantidade` | `Int` | No | — |
| `emprestimo` | `Emprestimo` | No | Prisma relation, N:1 |
| `equipamento` | `Equipamento` | No | Prisma relation, N:1 |

`ItemEmprestimo` is the association entity between a loan and an equipment record. The schema does not declare a composite uniqueness constraint for `(emprestimoId, equipamentoId)`.

### Ocorrencia (Occurrence)

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `equipamentoId` | `Int` | No | Foreign-key scalar to `Equipamento.id` |
| `numero` | `String` | Yes | — |
| `tipo` | `TipoOcorrencia` | No | No schema default |
| `status` | `StatusOcorrencia` | No | `@default(ABERTO)` |
| `problema` | `String` | No | — |
| `descricao` | `String` | No | — |
| `resolvidoEm` | `DateTime` | Yes | — |
| `medidasTomadas` | `String` | Yes | — |
| `createdAt` | `DateTime` | No | `@default(now())` |
| `equipamento` | `Equipamento` | No | Prisma relation, N:1 |
| `criadoPorId` | `Int` | Yes | Foreign-key scalar to `Usuario.id`; `ON DELETE SET NULL` |
| `atualizadoPorId` | `Int` | Yes | Foreign-key scalar to `Usuario.id`; `ON DELETE SET NULL` |
| `atualizadoEm` | `DateTime` | Yes | Timestamp of the last change |
| `resolvidoPorId` | `Int` | Yes | Foreign-key scalar to `Usuario.id`; `ON DELETE SET NULL` |
| `criadoPor` | `Usuario` | Yes | Prisma relation, N:1 |
| `atualizadoPor` | `Usuario` | Yes | Prisma relation, N:1 |
| `resolvidoPor` | `Usuario` | Yes | Prisma relation, N:1 |

### PushSubscription

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `usuarioId` | `Int` | No | Foreign-key scalar to `Usuario.id`; `ON DELETE CASCADE` |
| `endpoint` | `String` | No | `@unique` |
| `p256dh` | `String` | No | — |
| `auth` | `String` | No | — |
| `notificarEmprestimo` | `Boolean` | No | `@default(true)` |
| `notificarDevolucao` | `Boolean` | No | `@default(true)` |
| `notificarOcorrencia` | `Boolean` | No | `@default(true)` |
| `createdAt` | `DateTime` | No | `@default(now())` |
| `updatedAt` | `DateTime` | No | Prisma `@updatedAt` behavior |
| `lastSuccessAt` | `DateTime` | Yes | — |
| `usuario` | `Usuario` | No | Prisma relation, N:1 |

Created by the `20261113090000_push_subscriptions` migration, with an index on `usuarioId`. It stores no IP address or user agent.

## Enums

| Enum | Values |
|---|---|
| `NivelAcesso` | `ADMINISTRADOR`, `EDITOR` |
| `StatusEmprestimo` | `ABERTO`, `DEVOLVIDO` |
| `TipoOcorrencia` | `OBSERVACAO`, `MANUTENCAO`, `QUEBRADO` |
| `StatusOcorrencia` | `ABERTO`, `RESOLVIDO` |

## Relationships

```text
Categoria 1───N Equipamento
Responsavel 1───N Emprestimo
Emprestimo 1───N ItemEmprestimo N───1 Equipamento
Equipamento 1───N Ocorrencia
Usuario 1───N PushSubscription
Usuario (independent; no relation to the domain entities)
```

The foreign-key relations are `Equipamento.categoriaId → Categoria.id`, `Emprestimo.responsavelId → Responsavel.id`, `ItemEmprestimo.emprestimoId → Emprestimo.id`, `ItemEmprestimo.equipamentoId → Equipamento.id`, and `Ocorrencia.equipamentoId → Equipamento.id`. The Prisma schema does not declare `onDelete`/`onUpdate` actions; however, the versioned initial SQL migration creates all five FKs with `ON DELETE RESTRICT` and `ON UPDATE CASCADE`. The authorship fields (`criadoPorId`, `atualizadoPorId`, `devolvidoPorId`, `resolvidoPorId`) are FKs to `Usuario.id` with `ON DELETE SET NULL`, created by the additive migration `20261113150000_record_authorship`, which backfills existing records from `AuditLog`; records without audit rows keep a null author. The FK `PushSubscription.usuarioId → Usuario.id` is created by the `20261113090000_push_subscriptions` migration with `ON DELETE CASCADE`. Inspect SQL migrations together with the Prisma schema to determine the behavior of a migrated database.

## Defaults, keys, uniqueness, and indexes

- All `@id` fields are integer primary keys with `autoincrement()`.
- `Equipamento.quantidadeQuebrada`, `Emprestimo.status`, and `Ocorrencia.status` have schema defaults (`0`, `ABERTO`, and `ABERTO`, respectively).
- `createdAt` on `Equipamento`, `Usuario`, `Emprestimo`, and `Ocorrencia` uses `@default(now())`.
- `Equipamento.updatedAt` uses Prisma's `@updatedAt`; it is not declared as a user-supplied nullable field.
- Unique declarations are `Categoria.nome`, `Usuario.login`, nullable `Usuario.rfidTokenHash`, and `PushSubscription.endpoint`. These produce uniqueness enforcement/indexes for those fields.
- Explicit secondary indexes cover `Emprestimo.status`, `Ocorrencia.status`, equipment availability/broken counts, `ItemEmprestimo.emprestimoId`, the composite `ItemEmprestimo(equipamentoId, emprestimoId)`, `Ocorrencia(equipamentoId, status, tipo)`, and `PushSubscription.usuarioId`.
- `ItemEmprestimo.emprestimoId` and `Ocorrencia.equipamentoId` therefore have explicit query-supporting indexes; the former also has a composite index for equipment-to-open-loan lookup.

## Business rules verified in backend services

### Loans and stock

- `criarEmprestimo` accepts an optional service input for `dataRetirada`; when omitted, the service stores the current time. The Prisma field itself remains required and has no schema default.
- Loan creation runs in a transaction. Requested item quantities are aggregated by `equipamentoId`, availability is checked, the loan and its items are created, and available stock is decremented atomically.
- The stock check treats a missing equipment record as insufficient stock and raises an `EstoqueInsuficienteError` when any requested quantity exceeds effective availability.
- `atualizarItensEmprestimo` only edits a loan whose status is `ABERTO`. It returns the old item quantities to the effective availability, replaces the item rows, and decrements the new aggregated quantities in one transaction.
- `devolverEmprestimo` changes an open loan to `DEVOLVIDO`, stores the validated offset-aware timestamp sent by the UI (or current server time when legacy clients omit it), and increments available stock for every item. A repeated return is rejected; the loan row and item history are retained rather than deleted.
- Stock decrements use an atomic `where quantidadeDisponivel >= quantidade` update, so a failed concurrent decrement aborts the transaction instead of silently reducing stock below the checked amount.
- Administrator equipment updates lock the equipment row, include active-loan item quantities and open maintenance incidents in the capacity check, and reject a new total/available/broken combination that would be below committed stock. Open broken incidents must also remain represented in `quantidadeQuebrada`.

### Occurrences

- `criarOcorrencias` receives an array of `numeros` and creates one `Ocorrencia` row per number. The number of supplied entries controls the stock adjustment quantity.
- For `MANUTENCAO` and `QUEBRADO`, creation decrements `Equipamento.quantidadeDisponivel` by the number of supplied entries. For `QUEBRADO`, it also increments `quantidadeQuebrada` by that amount. `OBSERVACAO` does not adjust stock on creation.
- `resolverOcorrencia` rejects an already resolved occurrence, sets `status = RESOLVIDO`, records `resolvidoEm`, and stores `medidasTomadas`. For `MANUTENCAO` and `QUEBRADO`, it increments available stock by one; for `QUEBRADO`, it also decrements broken stock by one.
- Updating an occurrence's descriptive fields does not resolve it or adjust stock.
- Deleting an open `MANUTENCAO` or `QUEBRADO` occurrence returns one unit to available stock and, for `QUEBRADO`, removes one unit from broken stock. Deleting a resolved occurrence does not reverse the resolution adjustment. `OBSERVACAO` deletion does not adjust stock.

### Users and RFID

- `criarUsuario` and user editing require an email-format `login` (older accounts with another format can still sign in). The API prevents deactivating or demoting yourself and leaving the system without an active administrator.
- `criarUsuario` rejects an existing `login`, hashes the supplied password with bcrypt (cost `12`), and stores the hash in `passwordHash`; the plaintext password is not a model field.
- User listing exposes `possuiCartaoRfid` as a boolean derived from `rfidTokenHash`, rather than returning the stored hash. The schema stores only the hash value, which is nullable.
- RFID provisioning first requires the bridge to be enabled and the user to exist, then sends a generated token to the local bridge. Only after a successful bridge response does it store `hashRfidToken(token)` in `rfidTokenHash`; the generated token is returned by that service operation. A disabled bridge returns a service error, and bridge failures/timeouts return service errors.
- Revoking an RFID card sets `rfidTokenHash` to `null`.

### Push notifications

- Loans, returns and occurrences trigger notifications only after the transaction commits; sending never delays or fails the original operation.
- Recipients: active accounts with `nivelAcesso = ADMINISTRADOR` that have a subscription with the matching preference enabled (`notificarEmprestimo`, `notificarDevolucao` or `notificarOcorrencia`), checked at send time. `EDITOR` accounts never receive notifications, and the user who registered the operation does not receive their own notification.
- An occurrence request produces a single notification, even with several patrimony numbers.
- `PUT` upserts the subscription by `endpoint`; `DELETE` removes only the caller's own subscription. Logout removes the device's subscription, and changing or resetting the password removes all of the user's subscriptions.
- A `404` or `410` response from the push service removes the affected subscription.

## Guest Mode public projections

Anonymous `GET /equipamentos`, `/emprestimos`, and `/ocorrencias` responses use explicit backend allowlist serializers. Loans omit requester, responsible party, and note; occurrences omit serial number, issue, description, and remediation; equipment exposes only dashboard-required fields (no foreign-key/audit fields). `GET /responsaveis` and `/usuarios` require authentication. These application projections minimize payloads but are not equivalent to database-provider grants or RLS policies.

## Constraints and audit boundaries

Migration `20261022090000_stock_checks_and_fk_indexes` adds database `CHECK` constraints for non-negative equipment counts, `quantidadeDisponivel + quantidadeQuebrada <= quantidadeTotal`, and positive loan-item quantities. Migration `20261022110000_user_session_version` adds `Usuario.sessionVersion` with default `0`; authentication compares it on each request and logout/password change increments it to revoke prior sessions. The session-version change preserves existing users but requires re-login for JWTs issued before it. Migration `20260725225116_add_password_hash_to_usuario` adds required `passwordHash` without a default, so it cannot be applied to an already-populated `Usuario` table without a reviewed backfill strategy. Check constraints are maintained in SQL because the installed Prisma 6 schema language does not support a `CHECK` attribute. The stock migration intentionally fails rather than rewriting legacy rows that violate a check; validate migrations against a disposable/staging database before any production release. Cross-table checks for open loans/incidents remain enforced by transactional services. No check was added for dates or status/date consistency. Grants, RLS policies, PostgREST policies, and other external database/security controls are not represented in the Prisma schema; the actual verification is recorded below.

## Database grants and RLS (verified)

Verified on 2026-11-12 in the Neon SQL Editor (primary branch, `neondb` database) by querying `information_schema.role_table_grants` and `pg_class.relrowsecurity` for the `public` schema:

- **Grants:** only the `neondb_owner` role holds privileges on the 10 tables (`AuditLog`, `Categoria`, `Emprestimo`, `Equipamento`, `ItemEmprestimo`, `Ocorrencia`, `PasswordResetToken`, `Responsavel`, `Usuario`, and `_prisma_migrations`): `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER`. There are no grants to `PUBLIC`, to data-API roles (`anonymous`, `authenticated`), or to any other role.
- **RLS:** disabled (`relrowsecurity = false`) on every table. This is expected: the database is not exposed directly to clients and authorization is enforced by the API.
- **Consequence:** since only `neondb_owner` can access the tables, the API connects as the schema owner, which can also run DDL (`DROP`, `ALTER`). Optional least-privilege improvement: create an application role limited to `SELECT/INSERT/UPDATE/DELETE` and reserve `neondb_owner` for migrations.

Repeat the check after role changes or after enabling Neon features that create roles (such as the Data API). The `PushSubscription` table was created after this check, by the migration applied with the same schema-owner role; include it in the next review.
