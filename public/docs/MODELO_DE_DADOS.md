# Modelo de Dados — eduAssets

> **Fonte e escopo:** este documento é derivado de `backend/prisma/schema.prisma`. O comportamento de negócio só é incluído quando verificado em `emprestimo.service.ts`, `estoque.service.ts`, `ocorrencia.service.ts` e `usuario.service.ts`.

O datasource do Prisma é PostgreSQL. Os campos escalares são não nulos, salvo quando o tipo do schema termina em `?`; os campos de relação abaixo são relações do Prisma, não colunas persistidas.

## Entidades e campos

### Categoria

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `nome` | `String` | Não | `@unique` |
| `equipamentos` | `Equipamento[]` | Não | Relação Prisma, 1:N |

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

### Responsavel

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `nome` | `String` | Não | — |
| `cargo` | `String` | Não | — |
| `emprestimos` | `Emprestimo[]` | Não | Relação Prisma, 1:N |

`Responsavel` é uma entidade de domínio referenciada pelos empréstimos. O schema não lhe atribui nível de acesso ao sistema; o acesso é representado separadamente por `Usuario`.

### Usuario

| Campo | Tipo | Nulo? | Padrão / constraint |
|---|---|---:|---|
| `id` | `Int` | Não | Chave primária; `autoincrement()` |
| `nome` | `String` | Não | — |
| `login` | `String` | Não | `@unique` |
| `passwordHash` | `String` | Não | — |
| `nivelAcesso` | `NivelAcesso` | Não | Sem padrão no schema |
| `rfidTokenHash` | `String` | Sim | `@unique`; `null` quando não há cartão provisionado |
| `createdAt` | `DateTime` | Não | `@default(now())` |

`Usuario` não possui campo de relação com os demais modelos no schema.

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
Usuario (independente; sem relação direta com as entidades de domínio)
```

As relações com chave estrangeira declaradas são `Equipamento.categoriaId → Categoria.id`, `Emprestimo.responsavelId → Responsavel.id`, `ItemEmprestimo.emprestimoId → Emprestimo.id`, `ItemEmprestimo.equipamentoId → Equipamento.id` e `Ocorrencia.equipamentoId → Equipamento.id`. O schema não especifica ações `onDelete` ou `onUpdate`; não se infere cascata nem restrição de exclusão.

## Padrões, chaves, unicidade e índices

- Todos os campos `@id` são chaves primárias inteiras com `autoincrement()`.
- `Equipamento.quantidadeQuebrada`, `Emprestimo.status` e `Ocorrencia.status` possuem padrões no schema (`0`, `ABERTO` e `ABERTO`, respectivamente).
- `createdAt` de `Equipamento`, `Usuario`, `Emprestimo` e `Ocorrencia` usa `@default(now())`.
- `Equipamento.updatedAt` usa `@updatedAt` do Prisma; não é declarado como campo nulo fornecido pelo usuário.
- As declarações únicas são `Categoria.nome`, `Usuario.login` e `Usuario.rfidTokenHash` (nulo). Elas geram enforcement/índices de unicidade para esses campos.
- Os índices secundários explícitos são `@@index([Emprestimo.status])` e `@@index([Ocorrencia.status])`.
- Nenhum outro `@@index`, `@@unique` ou índice composto explícito é declarado. Os índices de chave primária são implícitos; os campos de chave estrangeira não possuem declaração adicional de índice neste schema.

## Regras de negócio verificadas nos serviços do backend

### Empréstimos e estoque

- `criarEmprestimo` recebe `dataRetirada` opcional na entrada do serviço; quando omitida, o serviço grava o instante atual. O campo do Prisma continua obrigatório e sem padrão no schema.
- A criação do empréstimo ocorre em transação. As quantidades dos itens são agrupadas por `equipamentoId`, o estoque disponível é validado, o empréstimo e seus itens são criados e o estoque disponível é decrementado atomicamente.
- A validação considera equipamento inexistente como estoque insuficiente e lança `EstoqueInsuficienteError` quando alguma quantidade solicitada excede o estoque efetivo.
- `atualizarItensEmprestimo` só edita empréstimo com status `ABERTO`. Ela devolve as quantidades antigas ao estoque efetivo, substitui as linhas de itens e decrementa as novas quantidades agrupadas em uma única transação.
- `devolverEmprestimo` muda um empréstimo aberto para `DEVOLVIDO`, grava `dataDevolucao` com o instante atual e incrementa o estoque disponível para cada item. Uma segunda devolução é rejeitada; a linha do empréstimo e o histórico dos itens são mantidos, não excluídos.
- Os decrementos de estoque usam update atômico com condição `quantidadeDisponivel >= quantidade`; uma falha de concorrência aborta a transação em vez de reduzir o estoque abaixo da quantidade verificada.

### Ocorrências

- `criarOcorrencias` recebe um vetor `numeros` e cria uma linha de `Ocorrencia` por número. A quantidade de entradas fornecidas controla o ajuste de estoque.
- Para `MANUTENCAO` e `QUEBRADO`, a criação decrementa `Equipamento.quantidadeDisponivel` pela quantidade de entradas fornecidas. Para `QUEBRADO`, também incrementa `quantidadeQuebrada` nesse valor. `OBSERVACAO` não ajusta estoque na criação.
- `resolverOcorrencia` rejeita ocorrência já resolvida, define `status = RESOLVIDO`, registra `resolvidoEm` e grava `medidasTomadas`. Para `MANUTENCAO` e `QUEBRADO`, incrementa o estoque disponível em um; para `QUEBRADO`, também decrementa o estoque quebrado em um.
- Atualizar os campos descritivos de uma ocorrência não a resolve nem ajusta o estoque.
- Excluir ocorrência aberta de `MANUTENCAO` ou `QUEBRADO` devolve uma unidade ao estoque disponível e, para `QUEBRADO`, remove uma unidade do estoque quebrado. Excluir ocorrência resolvida não desfaz o ajuste feito na resolução. A exclusão de `OBSERVACAO` não ajusta estoque.

### Usuários e RFID

- `criarUsuario` rejeita `login` já existente, aplica hash bcrypt à senha informada (custo `12`) e armazena o resultado em `passwordHash`; a senha em texto puro não é um campo do modelo.
- A listagem de usuários expõe `possuiCartaoRfid` como booleano derivado de `rfidTokenHash`, em vez de retornar o hash armazenado. O schema armazena apenas o hash, que é nulo quando não há cartão.
- O provisionamento RFID exige que a bridge esteja habilitada e que o usuário exista; depois envia um token gerado à bridge local. Somente após resposta bem-sucedida da bridge o serviço grava `hashRfidToken(token)` em `rfidTokenHash`; o token gerado é retornado nessa operação. Bridge desabilitada, falhas e timeouts resultam em erros do serviço.
- Revogar um cartão RFID define `rfidTokenHash` como `null`.

## Limites de constraints e auditoria

O schema Prisma inspecionado não declara constraints `CHECK` para faixas de quantidade, aritmética de estoque, datas ou consistência entre status e datas. Os serviços inspecionados realizam ajustes transacionais de estoque, mas este documento não os promove a constraints no banco. Grants, políticas RLS, políticas PostgREST e outros controles externos de banco/segurança não são representados por este schema ou por estes serviços; **os grants/RLS reais exigem auditoria separada**.
