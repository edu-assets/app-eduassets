# Manual do Usuário — eduAssets

> **Escopo:** este manual descreve a interface e os fluxos confirmados no código atual do eduAssets. Use nomes exatamente como aparecem na UI; não há credenciais, registros ou outros dados reais neste documento.

## 1. Visão geral

O eduAssets organiza o inventário e o empréstimo de equipamentos escolares. A interface cobre **Novo empréstimo**, **Devoluções**, **Dashboard**, **Controle**, **Cadastros**, **Exportar**, **Configurações**, **Segurança** e **Meu Perfil**.

O modelo atual acompanha quantidades por **categoria/modelo**. Ele não faz rastreamento individual por número de série; o campo **Número** em Controle é uma identificação informada pelo operador para a ocorrência.

## 2. Acesso, papéis e limites de segurança

| Papel | O que pode fazer na operação | O que é restrito |
| --- | --- | --- |
| **Convidado** | Consultar estoque, categorias, histórico e ocorrências anonimizados; usar consultas/exportações derivadas desses dados. | Não cria, altera, resolve, devolve ou exclui registros. Identificação do solicitante, responsável, observações e detalhes da ocorrência são omitidos/mascarados. Listagem de responsáveis, **Cadastros**, **Segurança** e **Meu Perfil** exigem autenticação. |
| **Editor** | Fazer login, registrar empréstimos, editar itens de empréstimos abertos, confirmar devoluções e criar/editar/resolver registros em **Controle**; alterar a própria senha. | Não acessa a gestão de **Cadastros**, não provisiona/revoga RFID e não exclui ocorrências. |
| **Administrador** | Tudo que o Editor faz, além de operar **Cadastros**, gerenciar usuários e cartões RFID, salvar **Configurações** e excluir registros de **Controle**. | Continua sujeito às validações de estoque, formato e campos obrigatórios. |

> **Importante:** os indicadores, menus e bloqueios da UI ajudam na usabilidade, mas **não são o controle de segurança**. A fronteira de segurança é o backend, que exige autenticação/JWT e aplica as permissões nas rotas. Não trate a ocultação de um botão como prova de autorização.

### Login e Modo Convidado

1. Clique em **Login** na tela inicial ou no rodapé do menu lateral.
2. No modal **Login de Administrador**, preencha **E-mail / Login** e **Senha**.
3. Clique em **Entrar**. Após o login, o menu mostra o nome e o papel da conta.
4. Para encerrar, abra o menu do usuário e clique em **Sair**. A interface volta ao **Modo Convidado**.
5. **Contate o administrador** não recupera senha: é apenas a orientação exibida quando a conta não tem uma senha disponível.

Sessões de **Administrador** expiram após 30 minutos de inatividade e retornam ao login. O código atual não aplica esse limite às sessões de **Editor**. O controle de atividade do backend está em memória e pressupõe uma única instância; escala horizontal exige estado compartilhado.

**Nota de segurança:** **Sair** limpa imediatamente o token do navegador atual e solicita ao servidor a revogação de todos os tokens anteriores daquela conta. A troca de senha também revoga as demais sessões e mantém este navegador conectado com um token substituto. Se o navegador estiver offline ou a solicitação de revogação falhar, um token copiado pode continuar válido até expirar em 8 horas (sujeito às verificações da conta e ao timeout de inatividade do Administrador). Use somente dispositivos confiáveis e avise o administrador da instalação imediatamente se houver suspeita de exposição do token.

### RFID (opcional)

O RFID é um caminho alternativo de login, não um requisito do sistema nem um substituto do login por senha.

1. Um **Administrador** abre **Cadastros → Usuários** e seleciona **Vincular cartão** ao lado da conta.
2. No modal **Cartão RFID**, use **Gerar token e vincular cartão**. O token é exibido uma única vez; copie-o se necessário.
3. Com a ponte e o leitor preparados, siga o procedimento do README para gravar o cartão. A UI pode mostrar **Modo de gravação ativo** e pedir que o cartão seja aproximado nos próximos 30 segundos.
4. Quando o cartão estiver vinculado, o modal mostra **Cartão vinculado**. **Gerar novo token** substitui o atual; **Revogar cartão** invalida o cartão para login automático.
5. Para o login por aproximação no navegador, a instalação também precisa habilitar o listener RFID. Em uma sessão de convidado, aproxime o cartão; o navegador valida o token e recarrega a sessão da conta vinculada.

O fluxo só funciona quando a configuração, a rede, a ponte local, as dependências e o hardware compatível estão corretos. O backend exige comunicação de loopback para `/auth/rfid` e `/ws/rfid`; um Raspberry Pi na mesma LAN não é automaticamente suficiente. Se algo falhar, use **Login** com **E-mail / Login** e **Senha**.

## 3. Início

Em **Início**, use os atalhos **Novo empréstimo**, **Devoluções**, **Dashboard** e **Controle**. O botão **Começar** abre o painel **Registrar Empréstimo**. A tela também oferece **Ver documentação**.

## 4. Registrar Empréstimo

O painel aparece no menu como **Novo empréstimo** e tem o título **Registrar Empréstimo**. Requer **Editor** ou **Administrador**.

1. Em **Dados do Empréstimo**, preencha **Solicitante** e selecione o **Responsável**.
2. Confira **Data e Hora**. O campo é preenchido automaticamente; clique nele se precisar selecionar outra data de retirada.
3. Em **Itens do Empréstimo**, escolha **Equipamento**, informe **Qtd.** e clique em **Adicionar**. Repita para cada modelo; os itens aparecem em **Itens adicionados**.
4. Se necessário, preencha **Observação (opcional)**.
5. Clique em **Registrar Empréstimo**.

O formulário exige pelo menos um item. A UI e o backend verificam a quantidade disponível em uma operação transacional; se o estoque não comportar a quantidade, o empréstimo não é registrado. Ao concluir, a quantidade disponível é reduzida.

## 5. Devoluções

1. Abra **Devoluções**. A lista mostra os empréstimos com status aberto.
2. Clique em uma linha/cartão para abrir **Detalhes do Empréstimo**. Confira **Responsável**, **Solicitante**, itens e eventual observação.
3. Para corrigir os itens antes da devolução, use **Editar itens**. Selecione **Equipamento**, informe **Quantidade**, clique em **Adicionar**, remova itens quando necessário e conclua com **Salvar Alterações**. Use **Cancelar** para abandonar a edição. Deve permanecer pelo menos um item.
4. Clique em **Devolver** na lista ou em **Confirmar Devolução** no painel.
5. Revise o modal **Confirmar Devolução** e clique em **Confirmar Devolução**; **Cancelar** fecha sem concluir.

Os itens retornam à quantidade disponível depois da confirmação. **Data e Hora da Devolução** é preenchido automaticamente e pode ser editado; ao confirmar, a UI envia o timestamp ISO com offset selecionado, que o backend valida e persiste. Clientes antigos que não enviem esse campo continuam usando o horário atual do servidor.

## 6. Dashboard

O **Dashboard** apresenta os cartões **Total de equipamentos**, **Disponíveis**, **Emprestados**, **Em Manutenção** e **Quebrados**.

- Na aba **Estoque**, consulte os totais por categoria. Clique em uma linha para abrir os detalhes somente leitura da categoria.
- Na aba **Histórico**, veja empréstimos registrados, datas, itens e status. No Modo Convidado, os campos de identificação/observação ficam mascarados ou indisponíveis; usuários autenticados veem os dados conforme sua autorização. Clique em **Detalhes** quando disponível.
- Use o campo **Buscar por informações...**. Em **Estoque**, a busca considera a categoria; em **Histórico**, considera número, solicitante e responsável.
- Na aba **Estoque**, o botão **Exportar** baixa imediatamente um CSV do estoque atual. Na aba **Histórico**, **Exportar** leva ao painel **Exportar**, onde há mais opções.

O estoque exibido é derivado de empréstimos abertos e ocorrências de manutenção/quebra. Consulte **Controle** para registrar ou resolver uma ocorrência antes de interpretar os números.

## 7. Controle

O painel **Controle** separa os registros nas abas **Observação**, **Manutenção**, **Quebrado** e **Resolvidos**. Os cartões de resumo mostram registros em aberto.

### Criar ou editar um registro

1. Clique em **Novo** e escolha **Observação**, **Manutenção** ou **Quebrado**.
2. No formulário, selecione **Categoria** e **Modelo**, informe **Número**, escolha o **Problema** e preencha **Descrição**. Os tipos de problema disponíveis incluem **Tela**, **Áudio**, **Bateria**, **Cabo**, **Touch**, **Teclado**, **Botão**, **Carcaça** e **Outro**.
3. Clique em **Salvar**. Para uma linha existente, selecione-a, clique em **Editar**, ajuste os campos e salve.

**Observação** é uma anotação e não altera o estoque. **Manutenção** retira a quantidade afetada de disponíveis até a resolução. **Quebrado** também retira de disponíveis e incrementa a contagem de quebrados.

### Resolver e excluir

1. Selecione uma ocorrência em **Manutenção** ou **Quebrado** e clique em **Resolver**.
2. Preencha **Medidas tomadas** e clique em **Confirmar resolução**. O registro passa para **Resolvidos** e a quantidade volta a ficar disponível; para **Quebrado**, a contagem de quebrados também é ajustada.
3. Para remover definitivamente uma ocorrência, selecione-a, clique em **Deletar** e confirme. Essa ação é irreversível e restrita a **Administrador**.

Criar, editar e resolver exigem autenticação (**Editor** ou **Administrador**). O backend também aplica essas regras; a UI não deve ser usada como mecanismo de segurança.

## 8. Cadastros (Administrador)

**Cadastros** é administrativo. Abra um cartão, preencha os campos e clique em **Salvar**; **Cancelar** fecha o modal. A lista **Cadastrados** mostra os registros carregados pela API.

- **Equipamentos:** **Categoria**, **Modelo** e **Quantidade**.
- **Responsáveis:** **Nome** e **Cargo**.
- **Usuários:** **Nome**, **E-mail / Login**, **Senha** e **Nível de acesso** (**Administrador** ou **Editor**).
- **Categorias:** **Nome da categoria**.

No cartão de um usuário, **Vincular cartão** abre **Cartão RFID**. Depois do vínculo, use **Gerar novo token** (substitui o atual), **Copiar token** quando disponível ou **Revogar cartão**. O token é sensível: não o publique nem o inclua em relatórios.

A interface atual de **Cadastros** é voltada a consultar/listar e criar os registros mostrados. Não presuma que uma ação de edição ou exclusão exibida em outro painel exista para cada cadastro.

## 9. Exportar

Abra **Exportar** e escolha um dos cartões:

| Tipo de dados na UI | Workflow confirmado |
| --- | --- |
| **Empréstimos e devoluções** | Informe **Data inicial** e **Data final**; o mês atual vem selecionado por padrão. O período filtra os registros pela data de criação do empréstimo. |
| **Equipamentos** | O relatório representa o estado atual do inventário. Use **Selecionar todos** ou marque equipamentos individualmente; selecione pelo menos um. |

Depois:

1. Escolha em **Formato de exportação**: **CSV**, **Excel** ou **PDF**.
2. Opcionalmente, escreva uma nota em **Observação**; ela aparece no relatório.
3. Revise **Resumo da exportação** e clique em **Exportar Dados**.

Formatos confirmados: `.csv`, `.xlsx` (Excel) e `.pdf`. O CSV e o Excel usam a tabela principal e, quando aplicável, seções de ocorrências; o PDF gera o relatório equivalente. Se nenhum registro atender aos filtros, a exportação é recusada com uma mensagem em vez de criar um arquivo vazio.

## 10. Configurações

Em **Configurações**:

- **Aparência → Tema:** escolha **Claro**, **Escuro** ou **Sistema**.
- **Idioma / Language:** escolha **Português** ou **English**; a interface troca de idioma imediatamente.
- **Notificações:** altere **Alertas de empréstimo** e **Alertas de devolução** entre **Ativado** e **Desativado**.
- Clique em **Salvar Configurações** quando a UI oferecer essa ação. O salvamento é restrito a **Administrador**.

O tema e o idioma são preferências do navegador. A interface de notificações está presente, mas o código inspecionado não expõe uma rota de backend para persistir alertas; não trate o estado visual como prova de entrega de notificações.

## 11. Segurança da conta

Abra **Segurança** pelo menu do usuário e clique em **Alterar senha**. Preencha **Senha atual**, **Nova senha** e **Confirmar nova senha**; a nova senha precisa ter pelo menos 8 caracteres e a confirmação deve coincidir. Clique em **Atualizar senha** ou **Cancelar**.

A troca é permitida somente para a conta autenticada e exige a senha atual. **Não há recuperação de senha implementada**: se a senha for perdida, **Contate o administrador**.

## 12. Meu Perfil

No menu do usuário, abra **Meu perfil**. O painel **Meu Perfil** mostra, em modo somente leitura, **Nome completo**, **E-mail** (o login da conta) e **Nível de acesso**. Para sair, use **Sair**.

## 13. Referência de dados e operação da instalação

O schema atual relaciona:

- **Categoria** e **Equipamento** (modelo, total disponível e quebrado);
- **Responsável**;
- **Usuário**, com nível **Administrador** ou **Editor** e token RFID opcional;
- **Empréstimo** e seus itens, com status aberto/devolvido;
- **Ocorrência**, com tipo observação/manutenção/quebrado e status aberto/resolvido.

Quem prepara uma instância deve seguir o README e preencher valores próprios no `.env`: PostgreSQL em `DATABASE_URL`, `DIRECT_URL` quando necessário, `JWT_SECRET` forte (mínimo de 32 caracteres), `CORS_ORIGIN` fora do modo local e `VITE_API_BASE_URL` no build que não usa o proxy do Vite. Nunca coloque senhas, tokens ou segredos reais neste manual ou no repositório.

## 14. Limitações confirmadas

- **Data de devolução:** timestamp offset-aware selecionado é persistido; clientes antigos podem omitir o campo e usar o horário do servidor. Alteração da data não reescreve o histórico dos registros já existentes.
- **RFID:** é opcional e depende de configuração (`RFID_BRIDGE_ENABLED`/`VITE_RFID_BRIDGE_ENABLED`), rede/loopback, ponte, dependências e hardware compatível. A mesma LAN, sozinha, não garante funcionamento.
- **Deployment:** um deployment real, domínio público, proxy, banco hospedado ou política de backup não foi validado por este trabalho. O README descreve desenvolvimento local e preparação técnica.
- **Senha:** não há recuperação de senha; somente a troca autenticada em **Segurança**.
- **Segurança da UI:** guestGate, permissions e os atributos `data-requires-*` orientam a interface. As permissões efetivas são as das rotas/controllers do backend.
- **Granularidade do inventário:** o sistema controla quantidades por modelo/categoria, não números de série individuais.
- **Dados:** este manual não contém dados reais; use somente contas, pessoas, equipamentos e tokens autorizados pela sua instalação.

## 15. Solução rápida de problemas

**Não consigo criar, editar ou devolver.** Confira o papel em **Meu Perfil**, confirme que a sessão ainda está ativa e tente novamente. **Convidado** é somente leitura.

**O empréstimo é recusado.** Verifique **Disponíveis** no **Dashboard**; itens já emprestados ou em **Manutenção** não podem ser emprestados. Confirme também que há pelo menos um item no formulário.

**O cartão RFID não funciona.** Confirme as duas flags, o segredo compartilhado, o processo da ponte, a conexão loopback, o leitor e o cartão vinculado. Enquanto isso, use login por senha.

**A exportação não é gerada.** Revise o tipo, o período, os equipamentos marcados e o formato. A aplicação não cria arquivo quando não encontra registros para os filtros.
