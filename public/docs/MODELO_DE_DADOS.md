# Modelo de Dados — eduAssets

Veja o diagrama entidade-relacionamento completo nas imagens desta seção. Resumo das entidades:

## Categoria
| Campo | Tipo |
|---|---|
| id | Int (PK) |
| nome | String (único) |

Agrupa equipamentos (ex: "Notebook", "Tablet", "Fone de ouvido").

## Equipamento
| Campo | Tipo |
|---|---|
| id | Int (PK) |
| categoriaId | Int (FK → Categoria) |
| modelo | String |
| quantidadeTotal | Int |
| quantidadeDisponivel | Int |
| quantidadeQuebrada | Int (padrão 0) |
| createdAt / updatedAt | DateTime |

Invariante garantida no nível de aplicação (e reforçada por checagens antes de update): `quantidadeDisponivel + quantidadeQuebrada <= quantidadeTotal`.

## Responsavel
| Campo | Tipo |
|---|---|
| id | Int (PK) |
| nome | String |
| cargo | String |

Professor ou funcionário autorizado a autorizar/retirar um empréstimo. Não possui nível de acesso ao sistema (diferente de `Usuario`).

## Usuario
| Campo | Tipo |
|---|---|
| id | Int (PK) |
| nome | String |
| login | String (único) |
| passwordHash | String |
| nivelAcesso | Enum: ADMINISTRADOR \| EDITOR |
| rfidTokenHash | String? (único, SHA-256 do token do cartão) |
| createdAt | DateTime |

Conta de acesso ao sistema. O token RFID nunca é armazenado em texto puro — apenas seu hash.

## Emprestimo
| Campo | Tipo |
|---|---|
| id | Int (PK) |
| solicitanteNome | String |
| responsavelId | Int (FK → Responsavel) |
| status | Enum: ABERTO \| DEVOLVIDO |
| dataRetirada | DateTime |
| dataDevolucao | DateTime? |
| observacao | String? |
| createdAt | DateTime |

Usa **soft delete via status** — devoluções não apagam o registro, preservando histórico completo.

## ItemEmprestimo
| Campo | Tipo |
|---|---|
| id | Int (PK) |
| emprestimoId | Int (FK → Emprestimo) |
| equipamentoId | Int (FK → Equipamento) |
| quantidade | Int |

Tabela de junção — um empréstimo pode conter múltiplos equipamentos, em quantidades diferentes.

## Ocorrencia
| Campo | Tipo |
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

Registros do painel Controle. `MANUTENCAO` e `QUEBRADO` afetam o estoque disponível do equipamento (decremento na criação, incremento na resolução).

## Relacionamentos

```
Categoria 1───N Equipamento
Responsavel 1───N Emprestimo
Emprestimo 1───N ItemEmprestimo N───1 Equipamento
Equipamento 1───N Ocorrencia
Usuario (independente — apenas controla acesso, não referencia as demais entidades diretamente)
```

> Nota: `Usuario` não possui relação direta com `Emprestimo` — quem "registra" no sentido de dono do dado é sempre o `Responsavel`, não o `Usuario` logado. Isso é intencional: várias contas de Administrador/Editor podem operar o sistema em nome do mesmo responsável físico (professor).
