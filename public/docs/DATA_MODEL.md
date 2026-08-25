# Data Model — eduAssets

See the full entity-relationship diagram in this section's images. Summary of the entities:

## Categoria (Category)
| Field | Type |
|---|---|
| id | Int (PK) |
| nome | String (unique) |

Groups equipment (e.g. "Notebook", "Tablet", "Headphones").

## Equipamento (Equipment)
| Field | Type |
|---|---|
| id | Int (PK) |
| categoriaId | Int (FK → Categoria) |
| modelo | String |
| quantidadeTotal | Int |
| quantidadeDisponivel | Int |
| quantidadeQuebrada | Int (default 0) |
| createdAt / updatedAt | DateTime |

Invariant enforced at the application level (checked before every update): `quantidadeDisponivel + quantidadeQuebrada <= quantidadeTotal`.

## Responsavel (Responsible party)
| Field | Type |
|---|---|
| id | Int (PK) |
| nome | String |
| cargo | String |

A teacher or staff member authorized to authorize/pick up a loan. Does not have a system access level (unlike `Usuario`).

## Usuario (User)
| Field | Type |
|---|---|
| id | Int (PK) |
| nome | String |
| login | String (unique) |
| passwordHash | String |
| nivelAcesso | Enum: ADMINISTRADOR \| EDITOR |
| rfidTokenHash | String? (unique, SHA-256 hash of the card token) |
| createdAt | DateTime |

A system access account. The RFID token is never stored in plain text — only its hash.

## Emprestimo (Loan)
| Field | Type |
|---|---|
| id | Int (PK) |
| solicitanteNome | String |
| responsavelId | Int (FK → Responsavel) |
| status | Enum: ABERTO \| DEVOLVIDO |
| dataRetirada | DateTime |
| dataDevolucao | DateTime? |
| observacao | String? |
| createdAt | DateTime |

Uses a **status-based soft delete** — returns don't delete the record, preserving full history.

## ItemEmprestimo (Loan item)
| Field | Type |
|---|---|
| id | Int (PK) |
| emprestimoId | Int (FK → Emprestimo) |
| equipamentoId | Int (FK → Equipamento) |
| quantidade | Int |

Join table — a single loan can contain multiple pieces of equipment, in different quantities.

## Ocorrencia (Occurrence)
| Field | Type |
|---|---|
| id | Int (PK) |
| equipamentoId | Int (FK → Equipamento) |
| numero | String? |
| tipo | Enum: OBSERVACAO \| MANUTENCAO \| QUEBRADO |
| status | Enum: ABERTO \| RESOLVIDO |
| problema | String |
| descricao | String |
| resolvidoEm | DateTime? |
| medidasTomadas | String? |
| createdAt | DateTime |

Records from the Control panel. `MANUTENCAO` and `QUEBRADO` affect the equipment's available stock (decrement on creation, increment on resolution).

## Relationships

```
Categoria 1───N Equipamento
Responsavel 1───N Emprestimo
Emprestimo 1───N ItemEmprestimo N───1 Equipamento
Equipamento 1───N Ocorrencia
Usuario (independent — only controls access, doesn't directly reference the other entities)
```

> Note: `Usuario` has no direct relationship with `Emprestimo` — the data "owner" in the domain sense is always the `Responsavel`, not the logged-in `Usuario`. This is intentional: multiple Administrator/Editor accounts can operate the system on behalf of the same physical responsible party (teacher).
