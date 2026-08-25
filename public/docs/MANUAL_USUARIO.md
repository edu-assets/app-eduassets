# Manual do Usuário — eduAssets

## 1. Introdução

O eduAssets é um sistema de controle de empréstimos e inventário de equipamentos escolares (notebooks, tablets, fones, carregadores etc). Este manual descreve como usar cada painel do sistema no dia a dia.

O sistema funciona em três níveis de acesso:

- **Convidado** — qualquer pessoa que abra o sistema, sem login. Pode visualizar tudo, mas não pode criar, editar ou excluir nada.
- **Editor** — usuário autenticado. Pode registrar empréstimos, processar devoluções e criar/editar registros de Controle.
- **Administrador** — acesso total, incluindo Cadastros, exclusão de registros e gerenciamento de cartões RFID.

---

## 2. Início

Tela inicial com atalhos para as ações mais comuns (Novo Empréstimo, Devoluções, Dashboard, Controle) e o botão de Login.

## 3. Novo Empréstimo

1. Preencha o **Solicitante** (aluno ou pessoa que está retirando o equipamento).
2. Selecione o **Responsável** (professor/funcionário autorizado).
3. Ajuste a **Data e Hora**, se necessário (vem preenchida automaticamente com o momento atual).
4. Selecione o **Equipamento** e a **Quantidade**, e clique em **Adicionar** — repita para cada item.
5. Adicione uma **Observação**, se quiser.
6. Clique em **Registrar Empréstimo**.

> Requer login (Editor ou Administrador). O sistema impede o registro se não houver estoque disponível suficiente.

## 4. Devoluções

- A lista mostra todos os empréstimos em aberto.
- Clique em um card para ver os detalhes no painel lateral (responsável, aluno, itens, observação).
- No painel de detalhes é possível **editar os itens** do empréstimo (adicionar/remover/alterar quantidade) antes de devolver.
- Clique em **Devolver** (no card ou no painel) para abrir a confirmação, ajustar a data/hora da devolução e confirmar.

## 5. Dashboard

- **Cards de resumo**: total de equipamentos, disponíveis, emprestados, em manutenção e quebrados.
- **Aba Estoque**: lista por categoria com total, disponível e quebrado. Clique em uma linha para ver o resumo detalhado da categoria.
- **Aba Histórico**: todos os empréstimos já registrados, com status (Aberto/Devolvido). Clique em "Detalhes" para ver os itens completos.
- Use a busca para filtrar por categoria, solicitante, responsável ou número.
- **Exportar** gera um CSV do estoque atual (ou leva à aba Exportar quando no Histórico).

## 6. Controle

Usado para registrar ocorrências com os equipamentos:

- **Observação** — anotação geral, sem afetar o estoque.
- **Manutenção** — retira o equipamento do estoque disponível até ser resolvido.
- **Quebrado** — retira do estoque disponível e soma à contagem de quebrados.
- **Resolvidos** — histórico de registros de manutenção/quebra já resolvidos, com as medidas tomadas.

Para resolver um registro em aberto, selecione-o e clique em **Resolver**, descrevendo a solução aplicada — o item volta a ficar disponível automaticamente.

> Criar/editar é permitido para Editores e Administradores. Excluir é restrito a Administradores.

## 7. Cadastros (somente Administrador)

Gerencie os dados-base do sistema:

- **Equipamentos** — categoria, modelo e quantidade total.
- **Responsáveis** — professores/funcionários autorizados a retirar equipamentos.
- **Usuários** — contas de acesso ao sistema (nome, login, senha, nível de acesso), incluindo vínculo de cartão RFID.
- **Categorias** — agrupamento dos equipamentos.

### Cartão RFID (Usuários)

Clique em "Vincular cartão" ao lado de um usuário para gerar um token único. Grave o token no cartão físico usando `provision_card.py` (veja a seção Hardware do README). O cartão pode ser regenerado ou revogado a qualquer momento.

## 8. Exportar

Escolha entre exportar **Empréstimos e devoluções** (por período) ou **Equipamentos** (estado atual do inventário, com seleção individual de itens). Formatos disponíveis: CSV, Excel e PDF. É possível adicionar uma observação que aparece no relatório gerado.

## 9. Configurações

- **Aparência** — alterna entre tema Claro, Escuro ou Sistema (segue o SO automaticamente).
- **Notificações** — preferências de alerta (interface pronta; salvar restrito a Administradores).

## 10. Segurança

Qualquer usuário autenticado pode alterar sua própria senha, informando a senha atual e a nova (mínimo 8 caracteres).

## 11. Meu Perfil

Resumo somente leitura da conta logada: nome, e-mail/login e nível de acesso.

## 12. Login e Modo Convidado

- Clique em **Login** na barra lateral ou na tela inicial.
- Sessões de **Administrador** expiram automaticamente após 30 minutos de inatividade.
- Sessões de **Editor** não possuem esse limite.
- Se um cartão RFID estiver vinculado, aproximar o cartão do leitor (Raspberry Pi/Arduino) realiza o login automaticamente, sem senha.

## 13. Dúvidas frequentes

**Não consigo editar nada, mesmo logado.**
Verifique seu nível de acesso em "Meu Perfil" — algumas ações (Cadastros, exclusão, configurações) são exclusivas de Administrador.

**O sistema recusa o empréstimo mesmo o equipamento aparecendo no cadastro.**
A quantidade disponível pode estar zerada (itens emprestados ou em manutenção). Consulte o Dashboard para ver o estoque atualizado.
