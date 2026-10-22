# Data Model — eduAssets

> **Source and scope:** this document is derived from `backend/prisma/schema.prisma`. Business behavior is included only where it was verified in `emprestimo.service.ts`, `estoque.service.ts`, `ocorrencia.service.ts`, and `usuario.service.ts`.

The Prisma datasource is PostgreSQL. Scalar fields are non-nullable unless their schema type ends in `?`; relation fields below are Prisma relations, not persisted columns.

## Entities and fields

### Categoria (Category)

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `nome` | `String` | No | `@unique` |
| `equipamentos` | `Equipamento[]` | No | Prisma relation, 1:N |

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

### Responsavel (Responsible party)

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `nome` | `String` | No | — |
| `cargo` | `String` | No | — |
| `emprestimos` | `Emprestimo[]` | No | Prisma relation, 1:N |

`Responsavel` is a domain entity referenced by loans. The schema does not give it a system access level; access is represented separately by `Usuario`.

### Usuario (User)

| Field | Type | Nullable | Default / constraint |
|---|---|---:|---|
| `id` | `Int` | No | Primary key; `autoincrement()` |
| `nome` | `String` | No | — |
| `login` | `String` | No | `@unique` |
| `passwordHash` | `String` | No | — |
| `nivelAcesso` | `NivelAcesso` | No | No schema default |
| `rfidTokenHash` | `String` | Yes | `@unique`; `null` when no card is provisioned |
| `createdAt` | `DateTime` | No | `@default(now())` |

`Usuario` has no relation field to the other models in the schema.

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
Usuario (independent; no direct relation to the domain entities)
```

The declared foreign-key relations are `Equipamento.categoriaId → Categoria.id`, `Emprestimo.responsavelId → Responsavel.id`, `ItemEmprestimo.emprestimoId → Emprestimo.id`, `ItemEmprestimo.equipamentoId → Equipamento.id`, and `Ocorrencia.equipamentoId → Equipamento.id`. The schema does not specify `onDelete` or `onUpdate` actions; no cascade or restriction is inferred here.

## Defaults, keys, uniqueness, and indexes

- All `@id` fields are integer primary keys with `autoincrement()`.
- `Equipamento.quantidadeQuebrada`, `Emprestimo.status`, and `Ocorrencia.status` have schema defaults (`0`, `ABERTO`, and `ABERTO`, respectively).
- `createdAt` on `Equipamento`, `Usuario`, `Emprestimo`, and `Ocorrencia` uses `@default(now())`.
- `Equipamento.updatedAt` uses Prisma's `@updatedAt`; it is not declared as a user-supplied nullable field.
- Unique declarations are `Categoria.nome`, `Usuario.login`, and nullable `Usuario.rfidTokenHash`. These produce uniqueness enforcement/indexes for those fields.
- Explicit secondary indexes are `@@index([Emprestimo.status])` and `@@index([Ocorrencia.status])`.
- No other explicit `@@index`, `@@unique`, or composite index is declared. Primary-key indexes are implicit in the primary keys; foreign-key fields have no additional index declaration in this schema.

## Business rules verified in backend services

### Loans and stock

- `criarEmprestimo` accepts an optional service input for `dataRetirada`; when omitted, the service stores the current time. The Prisma field itself remains required and has no schema default.
- Loan creation runs in a transaction. Requested item quantities are aggregated by `equipamentoId`, availability is checked, the loan and its items are created, and available stock is decremented atomically.
- The stock check treats a missing equipment record as insufficient stock and raises an `EstoqueInsuficienteError` when any requested quantity exceeds effective availability.
- `atualizarItensEmprestimo` only edits a loan whose status is `ABERTO`. It returns the old item quantities to the effective availability, replaces the item rows, and decrements the new aggregated quantities in one transaction.
- `devolverEmprestimo` changes an open loan to `DEVOLVIDO`, stores the validated offset-aware timestamp sent by the UI (or current server time when legacy clients omit it), and increments available stock for every item. A repeated return is rejected; the loan row and item history are retained rather than deleted.
- Stock decrements use an atomic `where quantidadeDisponivel >= quantidade` update, so a failed concurrent decrement aborts the transaction instead of silently reducing stock below the checked amount.

### Occurrences

- `criarOcorrencias` receives an array of `numeros` and creates one `Ocorrencia` row per number. The number of supplied entries controls the stock adjustment quantity.
- For `MANUTENCAO` and `QUEBRADO`, creation decrements `Equipamento.quantidadeDisponivel` by the number of supplied entries. For `QUEBRADO`, it also increments `quantidadeQuebrada` by that amount. `OBSERVACAO` does not adjust stock on creation.
- `resolverOcorrencia` rejects an already resolved occurrence, sets `status = RESOLVIDO`, records `resolvidoEm`, and stores `medidasTomadas`. For `MANUTENCAO` and `QUEBRADO`, it increments available stock by one; for `QUEBRADO`, it also decrements broken stock by one.
- Updating an occurrence's descriptive fields does not resolve it or adjust stock.
- Deleting an open `MANUTENCAO` or `QUEBRADO` occurrence returns one unit to available stock and, for `QUEBRADO`, removes one unit from broken stock. Deleting a resolved occurrence does not reverse the resolution adjustment. `OBSERVACAO` deletion does not adjust stock.

### Users and RFID

- `criarUsuario` rejects an existing `login`, hashes the supplied password with bcrypt (cost `12`), and stores the hash in `passwordHash`; the plaintext password is not a model field.
- User listing exposes `possuiCartaoRfid` as a boolean derived from `rfidTokenHash`, rather than returning the stored hash. The schema stores only the hash value, which is nullable.
- RFID provisioning first requires the bridge to be enabled and the user to exist, then sends a generated token to the local bridge. Only after a successful bridge response does it store `hashRfidToken(token)` in `rfidTokenHash`; the generated token is returned by that service operation. A disabled bridge returns a service error, and bridge failures/timeouts return service errors.
- Revoking an RFID card sets `rfidTokenHash` to `null`.

## Guest Mode public projections

Anonymous `GET /equipamentos`, `/emprestimos`, and `/ocorrencias` responses use explicit backend allowlist serializers. Loans omit requester, responsible party, and note; occurrences omit serial number, issue, description, and remediation; equipment exposes only dashboard-required fields (no foreign-key/audit fields). `GET /responsaveis` and `/usuarios` require authentication. These application projections minimize payloads but are not equivalent to database-provider grants or RLS policies.

## Constraints and audit boundaries

The inspected Prisma schema declares no `CHECK` constraints for quantity ranges, stock arithmetic, dates, or status/date consistency. The inspected services perform transactional stock adjustments, but this document does not promote those operations to database-level constraints. Grants, RLS policies, PostgREST policies, and other external database/security controls are not represented by this schema or these services; **the real grants/RLS configuration requires a separate audit**.
