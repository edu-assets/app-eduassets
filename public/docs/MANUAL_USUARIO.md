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
| **Administrador** | Tudo que o Editor faz, além de operar **Cadastros**, gerenciar usuários e cartões RFID e excluir registros de **Controle**. | Continua sujeito às validações de estoque, formato e campos obrigatórios. |

> **Importante:** os indicadores, menus e bloqueios da UI ajudam na usabilidade, mas **não são o controle de segurança**. A fronteira de segurança é o backend, que exige autenticação/JWT e aplica as permissões nas rotas. Não trate a ocultação de um botão como prova de autorização.

### Login e Modo Convidado

1. Na tela de entrada, preencha **E-mail / Login** e **Senha**; para leitura limitada, selecione **Continuar como convidado**.
2. Clique em **Entrar**. Após o login, o menu mostra o nome e o papel da conta. No Modo Convidado, uma faixa **Modo convidado — somente leitura** com o botão **Entrar** fica no topo (você pode dispensá-la durante a sessão); ações indisponíveis são anunciadas como tal, com a dica "Faça login para registrar alterações."
3. Para encerrar a sessão, abra o menu do usuário e clique em **Sair**. O sistema solicita a revogação ao backend, remove a inscrição de notificações deste dispositivo (se houver) e retorna à tela de login.

**Privacidade e cookies:** a tela de entrada tem links para os **Termos de Uso** e a **Política de Privacidade**, que explica quais dados o eduAssets trata, com quem os compartilha, por quanto tempo os guarda e como exercer seus direitos. Na primeira visita, um aviso pergunta se você aceita **cookies de estatísticas** (Google Analytics); escolha **Aceitar** ou **Recusar**. Sem aceite, nada do Google é carregado e o sistema funciona normalmente. Para mudar a escolha, abra a Política de Privacidade e clique em **Preferências de cookies**.

**Recuperação de senha:** se você esqueceu a senha e seu login é um e-mail, clique em **Esqueci minha senha** na tela de entrada, informe o e-mail e selecione **Enviar link**. Por segurança, a mensagem exibida é a mesma exista ou não a conta. O e-mail chega do remetente `nao-responda@eduassets.tech` com o assunto **Redefinição de senha do eduAssets** (confira a caixa de spam se não aparecer em alguns minutos) e traz o botão **Definir nova senha**, o link por extenso e os detalhes do pedido; o link vale por 30 minutos e uma única vez, e só o pedido mais recente é válido. Na tela aberta pelo link, preencha **Nova senha** e **Confirmar nova senha** (12+ caracteres, com maiúscula, minúscula, número e símbolo) e clique em **Salvar nova senha**: todas as sessões abertas da conta são encerradas e você entra com a nova senha. Se você não pediu a redefinição, ignore o e-mail: a senha atual continua valendo. Se o link não aparecer na tela de entrada (instalação sem e-mail configurado) ou se o seu login não for um e-mail, peça a um **Administrador** que redefina a senha em **Cadastros → Usuários** (seção 8).

O navegador usa exclusivamente sessão por cookie `HttpOnly`, com validade do JWT de até 8 horas; JavaScript da página não pode ler o cookie. Em produção HTTPS, ele também usa `Secure`. Se a API não confirmar suporte a cookie, o login falha fechado, sem token Bearer de fallback e sem gravar JWT em `localStorage`. Sessões de **Administrador** expiram após 30 minutos de inatividade; 2 minutos antes, um aviso com contagem regressiva oferece **Continuar conectado** ou **Sair agora**. A atividade em uma aba vale para todas as abas abertas. Ao expirar, você volta à tela de login e, depois de entrar de novo, retorna ao painel em que estava. Sessões de **Editor** não expiram por padrão; o Editor pode ativar um limite opcional em **Configurações → Sessão** (seção 10). O controle de atividade do backend está em memória e pressupõe uma única instância; escala horizontal exige estado compartilhado.

**Endereços dos painéis:** cada painel tem seu próprio endereço (por exemplo, `#app/devolucoes` ou `#app/dashboard/historico`). Recarregar a página mantém o painel aberto, os botões voltar e avançar do navegador funcionam e o título da aba mostra o painel atual. Painéis exclusivos de administrador (como **Cadastros**) redirecionam quem não tem acesso. Ao sair com **Sair**, o próximo usuário começa no **Início** e as outras abas também são desconectadas.

**Nota de segurança:** **Sair** solicita ao servidor a revogação da versão de sessão da conta e a remoção do cookie. A troca de senha também revoga sessões anteriores e mantém este navegador conectado com uma sessão renovada. Se a API estiver indisponível durante o logout, o navegador registra a saída como pendente: a sessão não é restaurada ao reabrir o app, e a revogação no servidor é repetida automaticamente quando a conexão volta ou na próxima abertura do app. Use dispositivos confiáveis e informe o administrador da instalação se suspeitar que sua conta foi exposta. O app atual não oferece fallback Bearer no navegador.

### RFID (opcional)

O RFID é um caminho alternativo de login, não um requisito do sistema nem um substituto do login por senha.

1. Um **Administrador** abre **Cadastros → Usuários** e seleciona **Vincular cartão** ao lado da conta.
2. No modal **Cartão RFID**, use **Gerar token e vincular cartão**. O backend envia a credencial ao bridge para gravação e retorna somente uma confirmação; a resposta da API não expõe o token RFID.
3. Com a ponte e o leitor preparados, siga o procedimento do README e aproxime o cartão dentro dos próximos 30 segundos para gravá-lo.
4. Quando o cartão estiver vinculado, o modal mostra **Cartão vinculado**. **Gerar novo token** substitui o atual; **Revogar cartão** invalida o cartão para login automático.
5. Para o login por aproximação no navegador, a instalação também precisa habilitar o listener RFID. Em uma sessão de convidado, aproxime o cartão; o bridge encaminha um código de uso único e o navegador o troca por uma sessão em cookie `HttpOnly`, sem receber JWT bruto.

O fluxo só funciona quando a configuração, a rede, a ponte local, as dependências e o hardware compatível estão corretos. O backend exige comunicação de loopback para `/auth/rfid` e `/ws/rfid`; um Raspberry Pi na mesma LAN não é automaticamente suficiente. Se algo falhar, use **Login** com **E-mail / Login** e **Senha**.

## 3. Início

Em **Início**, use os atalhos **Novo empréstimo**, **Devoluções**, **Dashboard** e **Controle**. O botão **Começar** abre o painel **Registrar Empréstimo**. A tela também oferece **Ver documentação**.

**Atualização automática:** a tela se atualiza sozinha a cada 30 segundos enquanto está aberta, assim que você volta para o app ou para a aba e, para administradores, imediatamente quando chega uma notificação. Não é preciso recarregar a página.

## 4. Registrar Empréstimo

O painel aparece no menu como **Novo empréstimo** e tem o título **Registrar Empréstimo**. Requer **Editor** ou **Administrador**; convidados veem o aviso "Faça login para registrar alterações." antes do formulário.

1. Em **Dados do Empréstimo**, preencha **Solicitante** (para usuários logados, o campo sugere nomes já usados) e selecione o **Responsável**.
2. Confira **Data e Hora**. O campo é preenchido automaticamente; clique nele se precisar selecionar outra data de retirada.
3. Em **Itens do Empréstimo**, escolha **Equipamento**, informe **Qtd.** e clique em **Adicionar**. Repita para cada modelo; os itens aparecem em **Itens adicionados**.
4. Se necessário, preencha **Observação (opcional)**.
5. Clique em **Registrar Empréstimo**.

Na lista **Equipamento**, cada modelo mostra "(N disponíveis)" e os indisponíveis ficam desabilitados; a **Qtd.** é limitada ao disponível, com mensagem de erro no próprio campo. A **Observação** tem contador de caracteres (0/250).

O formulário exige pelo menos um item. A UI e o backend verificam a quantidade disponível em uma operação transacional; se o estoque não comportar a quantidade, o empréstimo não é registrado. Ao concluir, a quantidade disponível é reduzida.

Enquanto **Data e Hora** não for alterada, o campo acompanha o relógio do servidor e o registro usa a hora do servidor no momento do salvamento. Se você alterar o campo, o horário escolhido é mantido. Datas com mais de 5 minutos no futuro não são aceitas.

## 5. Devoluções

1. Abra **Devoluções**. A lista mostra os empréstimos com status aberto.
2. Clique em uma linha/cartão para abrir **Detalhes do Empréstimo**. Confira **Responsável**, **Solicitante**, itens e eventual observação.
3. Para corrigir os itens antes da devolução, use **Editar itens**. Selecione **Equipamento**, informe **Quantidade**, clique em **Adicionar**, remova itens quando necessário e conclua com **Salvar Alterações**. Use **Cancelar** para abandonar a edição. Deve permanecer pelo menos um item.
4. Clique em **Devolver** na lista ou em **Confirmar Devolução** no painel.
5. Revise o modal **Confirmar Devolução** e clique em **Confirmar Devolução**; **Cancelar** fecha sem concluir.

O cartão de cada empréstimo tem o botão **Detalhes** (também acessível pelo teclado). Usuários autenticados veem em **Detalhes** quem registrou e quem devolveu o empréstimo. Use o campo de busca (solicitante, responsável, equipamento e quem registrou) e a ordenação **Mais antigos primeiro** / **Mais recentes primeiro** para localizar um empréstimo. Sem resultados, a tela diz "Nenhum resultado para x" e oferece **Limpar busca** ou **Limpar filtros**.

Os itens retornam à quantidade disponível depois da confirmação. **Data e Hora da Devolução** é preenchido automaticamente e pode ser editado; ao confirmar, a UI envia o timestamp ISO com offset selecionado, que o backend valida e persiste. Clientes antigos que não enviem esse campo continuam usando o horário atual do servidor.

Se **Data e Hora da Devolução** não for alterada, o registro usa a hora do servidor no momento da confirmação. A devolução não pode ser anterior à retirada do empréstimo, e datas com mais de 5 minutos no futuro não são aceitas.

## 6. Dashboard

O **Dashboard** apresenta os cartões **Total de equipamentos**, **Disponíveis**, **Emprestados**, **Em Manutenção** e **Quebrados**.

- Na aba **Estoque**, consulte os totais por categoria; o selo **Esgotado** aparece quando não há unidade disponível e **Estoque baixo** quando 10% ou menos do total (no mínimo 1 unidade) está disponível. Clique em uma linha para abrir os detalhes somente leitura da categoria.
- Na aba **Histórico**, veja empréstimos registrados, datas, itens e status. No Modo Convidado, os campos de identificação/observação ficam mascarados ou indisponíveis; usuários autenticados veem os dados conforme sua autorização. Clique em **Detalhes** quando disponível. Usuários autenticados também veem a autoria (quem registrou e quem devolveu); Convidados nunca recebem esses dados. Os detalhes do estoque mostram quem cadastrou e alterou o equipamento. Na primeira carga, o Dashboard exibe esqueletos de carregamento e contadores "—"; se a carga falhar, aparece um erro no painel com **Tentar novamente**.
- Use o campo **Buscar por informações...**. Em **Estoque**, a busca considera a categoria; em **Histórico**, considera número, solicitante e responsável.
- **Filtros do Histórico:** o Histórico carrega 50 empréstimos por vez; use **Carregar mais** e acompanhe **Mostrando N empréstimos** (vale também para Convidados). Os chips de status (**Todos**, **Abertos**, **Devolvidos**) e de período (**Hoje**, **7 dias**, **Este mês**, **Tudo**) combinam com a busca, que para usuários logados é feita no servidor sobre todo o histórico. **Limpar filtros** volta à visão completa.
- Na aba **Estoque**, o botão **Exportar** baixa imediatamente um CSV do estoque atual. Na aba **Histórico**, **Exportar** leva ao painel **Exportar**, onde há mais opções.

O estoque exibido é derivado de empréstimos abertos e ocorrências de manutenção/quebra. Consulte **Controle** para registrar ou resolver uma ocorrência antes de interpretar os números.

## 7. Controle

O painel **Controle** separa os registros nas abas **Observação**, **Manutenção**, **Quebrado** e **Resolvidos**. Os cartões de resumo mostram registros em aberto. Usuários autenticados veem quem criou, alterou e resolveu cada registro. **Saiba mais** abre este manual. Se a carga falhar, o painel mostra um erro com **Tentar novamente**.

### Criar ou editar um registro

1. Clique em **Novo** e escolha **Observação**, **Manutenção** ou **Quebrado**.
2. No formulário, selecione **Categoria** e **Modelo**, informe **Número**, escolha o **Problema** e, se quiser, preencha **Descrição**; se ficar vazia, o sistema registra “—”. Os tipos de problema disponíveis incluem **Tela**, **Áudio**, **Bateria**, **Cabo**, **Touch**, **Teclado**, **Botão**, **Carcaça** e **Outro**.
3. Clique em **Salvar**. Para uma linha existente, selecione-a, clique em **Editar**, ajuste os campos e salve. Os campos obrigatórios mostram o erro no próprio campo, e salvar, resolver e excluir ignoram cliques duplos.

As abas e os menus de **Controle** funcionam pelo teclado: setas e Home/End para navegar e Esc para fechar.

**Observação** é uma anotação e não altera o estoque. **Manutenção** retira a quantidade afetada de disponíveis até a resolução. **Quebrado** também retira de disponíveis e incrementa a contagem de quebrados.

### Resolver e excluir

1. Selecione uma ocorrência em **Manutenção** ou **Quebrado** e clique em **Resolver**.
2. Preencha **Medidas tomadas** e clique em **Confirmar resolução**. O registro passa para **Resolvidos** e a quantidade volta a ficar disponível; para **Quebrado**, a contagem de quebrados também é ajustada.
3. Para remover definitivamente uma ocorrência, selecione-a, clique em **Deletar** e confirme. Essa ação é irreversível e restrita a **Administrador**.

Criar, editar e resolver exigem autenticação (**Editor** ou **Administrador**). O backend também aplica essas regras; a UI não deve ser usada como mecanismo de segurança.

## 8. Cadastros (Administrador)

**Cadastros** é administrativo. Abra um cartão, preencha os campos e clique em **Salvar**; **Cancelar** fecha o modal. A lista **Cadastrados** mostra os registros carregados pela API.

- **Equipamentos:** **Categoria**, **Modelo** e **Quantidade**. **Ajustar total** altera a quantidade total de um modelo, sem poder ficar abaixo dos itens em uso.
- **Responsáveis:** **Nome** e **Cargo**. Podem ser editados, desativados e reativados; responsáveis inativos não aparecem no formulário de **Registrar Empréstimo**, mas os empréstimos antigos continuam no histórico.
- **Usuários:** **Nome**, **E-mail / Login** (deve ser um e-mail), **Senha** e **Nível de acesso** (**Administrador** ou **Editor**). Nome, nível de acesso e login podem ser editados, e o usuário pode ser desativado ou reativado (com confirmação); usuários desativados mostram o selo **Inativo**, e logins que não são e-mails válidos mostram um aviso. Você não pode desativar nem rebaixar a própria conta, nem remover o último administrador ativo. A recuperação de senha só funciona se a caixa de e-mail do login realmente existir.
- **Categorias:** **Nome da categoria**; é possível renomear uma categoria existente (o nome não pode repetir o de outra).

No cartão de um usuário, **Vincular cartão** abre **Cartão RFID**. Depois do vínculo, use **Gerar novo token** (substitui o atual), **Copiar token** quando disponível ou **Revogar cartão**. O token é sensível: não o publique nem o inclua em relatórios.

O botão **Redefinir senha** (ícone de cadeado) ao lado de cada usuário abre um modal para definir uma senha temporária. Preencha **Nova senha** e **Confirmar nova senha**: são exigidos pelo menos 12 caracteres, com letra maiúscula, letra minúscula, número e símbolo (máximo de 72 bytes). Ao confirmar, todas as sessões abertas do usuário são encerradas e a ação é registrada na auditoria como `PASSWORD_RESET`. Entregue a senha temporária por um canal seguro e oriente o usuário a trocá-la em **Segurança**. Para a sua própria conta, use **Segurança** (o botão avisa e não abre o modal).

As listas de **Cadastros** têm busca e, para quem está autenticado, mostram quem criou cada registro. A interface atual é voltada a consultar/listar, criar e, para usuários, responsáveis, categorias e totais de equipamento, ajustar os registros mostrados. Não presuma que uma ação de edição ou exclusão exibida em outro painel exista para cada cadastro.

## 9. Exportar

Abra **Exportar** e escolha um dos cartões:

| Tipo de dados na UI | Workflow confirmado |
| --- | --- |
| **Empréstimos e devoluções** | Informe **Data inicial** e **Data final**; o mês atual vem selecionado por padrão. O período filtra os registros pela data de retirada do empréstimo e a exportação inclui todos os empréstimos do período, mesmo que sejam mais de 50. |
| **Equipamentos** | O relatório representa o estado atual do inventário. Use **Selecionar todos** ou marque equipamentos individualmente; selecione pelo menos um. |

Depois:

1. Escolha em **Formato de exportação**: **CSV**, **Excel** ou **PDF**.
2. Opcionalmente, escreva uma nota em **Observação**; ela aparece no relatório.
3. Revise **Resumo da exportação** e clique em **Exportar Dados**.

Com login, as exportações incluem **Registrado por** e **Devolvido por** (empréstimos) e **Criada por** (ocorrências).

Formatos confirmados: `.csv`, `.xlsx` (Excel) e `.pdf`. O CSV e o Excel usam a tabela principal e, quando aplicável, seções de ocorrências; o PDF gera o relatório equivalente. Se nenhum registro atender aos filtros, a exportação é recusada com uma mensagem em vez de criar um arquivo vazio.

## 10. Configurações

Em **Configurações**:

- **Aparência → Tema:** escolha **Claro**, **Escuro** ou **Sistema**.
- **Idioma / Language:** escolha **Português** ou **English**; a interface troca de idioma imediatamente.
- **Notificações:** ativação por dispositivo, com interruptores para empréstimos, devoluções e ocorrências (veja a subseção abaixo).

Tema e idioma são aplicados imediatamente e salvos como preferências deste navegador; não há botão de salvar.

### Sessão (Editores)

Em **Configurações → Sessão**, o Editor pode ativar **Encerrar sessão por inatividade** e escolher o tempo (15, 30 ou 60 minutos). Vem desligado por padrão, vale só neste navegador e, antes de sair, um aviso permite **Continuar conectado**. Para Administradores, o limite de 30 minutos é sempre aplicado.

### Notificações push para administradores

Administradores recebem uma notificação do sistema, no computador ou no celular, sempre que outro usuário registra um **empréstimo**, uma **devolução** ou uma **ocorrência**. A notificação chega mesmo com o app fechado ou com o celular bloqueado. Ela é enviada apenas a contas **Administrador** ativas que ativaram o recurso naquele dispositivo; contas **Editor** nunca recebem, e quem registrou a operação não recebe o próprio alerta.

Para ativar:

1. Clique em **Ativar notificações** no banner no topo do app ou, em **Configurações**, no cartão **Notificações**, em **Ativar notificações neste dispositivo**. O banner aparece para administradores sem notificações neste dispositivo; **Agora não** o oculta por 7 dias naquele dispositivo.
2. Quando o navegador pedir, clique em **Permitir**.
3. Clique em **Enviar notificação de teste** para confirmar o recebimento.
4. Use os interruptores de **empréstimos**, **devoluções** e **ocorrências** para escolher o que chega neste dispositivo. Eles são aplicados imediatamente.

Para desativar neste dispositivo, clique em **Desativar neste dispositivo**.

- **Android:** o Chrome funciona diretamente.
- **iPhone e iPad:** exigem iOS 16.4 ou superior e o app instalado na tela de início. No Safari, toque em **Compartilhar → Adicionar à Tela de Início**, abra o app pelo ícone, entre como administrador e então ative as notificações.
- **Aviso de permissão não aparece:** clique no ícone ao lado do endereço do site (sino riscado, cadeado ou configurações do site) › **Notificações** › **Permitir**. O app conclui a ativação sozinho, desde que você a tenha pedido nesta sessão ou o banner esteja visível.
- **Bloqueio do navegador:** no mesmo lugar, altere para **Permitir** e recarregue a página.
- **Brave:** ative **Usar serviços do Google para mensagens push** em `brave://settings/privacy`.
- **Só aparece dentro do app:** a notificação é do sistema e aparece mesmo com a aba do eduAssets em segundo plano, com outro programa à frente ou com a aba fechada (navegador aberto). Se ela só aparece dentro do app, confira o sistema operacional: no Windows, **Configurações › Sistema › Notificações** (notificações ativadas, navegador permitido e **Não incomodar** desligado); no macOS, **Ajustes do Sistema › Notificações › o navegador**.

**Conteúdo:** o título é **Novo empréstimo**, **Devolução registrada** ou **Nova ocorrência**. Empréstimos e devoluções mostram o solicitante, os equipamentos e quem registrou, por exemplo: *João Silva · Notebook Dell ×2, Projetor Epson ×1 · por Ana Souza*. Ocorrências mostram os equipamentos, o tipo (**Observação**, **Manutenção** ou **Quebrado**) e quem registrou. Os equipamentos aparecem como "Categoria Modelo", até três itens e depois "e mais N". A notificação nunca mostra observações, descrições, problemas, medidas tomadas nem números de patrimônio, e um pedido de ocorrência gera uma única notificação, mesmo com vários números de patrimônio. O texto está em português nesta versão e pode aparecer na tela de bloqueio. Ao tocar em uma notificação de empréstimo ou devolução, o app abre o **Dashboard** na aba **Histórico**; uma notificação de ocorrência abre o painel **Controle**.

**Som e alerta:** a notificação do sistema usa o som e a vibração padrão do dispositivo, pois os navegadores não permitem som personalizado. Com o app aberto e visível, ele também exibe um aviso destacado e toca um som próprio, que pode ser desligado no interruptor **Som dentro do app**. No computador a notificação permanece até ser dispensada; no Android, ela vibra.

**Inscrições:** clicar em **Sair** remove a inscrição daquele dispositivo, para que um computador compartilhado deixe de receber alertas; a expiração por inatividade não remove. Alterar a senha, ou ter a senha redefinida por um administrador, remove todas as inscrições da conta: ative as notificações novamente depois.

## 11. Segurança da conta

Abra **Segurança** pelo menu do usuário e clique em **Alterar senha**. Preencha **Senha atual**, **Nova senha** e **Confirmar nova senha**; a nova senha precisa ter pelo menos 12 caracteres, com letra maiúscula, letra minúscula, número e símbolo (máximo de 72 bytes), ser diferente da senha atual, e a confirmação deve coincidir. Os campos de senha têm um botão para mostrar ou ocultar o texto e uma lista que marca os requisitos atendidos enquanto você digita (o mesmo vale ao redefinir senha, recuperar o acesso e criar usuários); o formulário também é enviado com Enter. Clique em **Atualizar senha** ou **Cancelar**. **Última alteração** mostra a data da última troca de senha (**Sem registro** se não houver).

A troca é permitida somente para a conta autenticada e exige a senha atual. Se a senha for perdida, use **Esqueci minha senha** na tela de entrada (seção 2) ou **Contate o administrador**, que pode redefini-la em **Cadastros → Usuários** (seção 8).

**Avisos na tela:** as notificações do app são lidas por leitores de tela, têm botão de fechar, pausam ao passar o mouse e ficam na parte inferior central no celular; as de erro permanecem até serem fechadas.

## 12. Meu Perfil

No menu do usuário, abra **Meu perfil**. O painel **Meu Perfil** mostra, em modo somente leitura, **Nome completo**, **E-mail** (o login da conta) e **Nível de acesso**. Para sair, use **Sair**. O subtítulo do painel é neutro para Editores. No Modo Convidado, ações bloqueadas mostram "Faça login para registrar alterações."

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
- **Implantação:** a instância oficial roda em `app.eduassets.tech` com a API em `api.eduassets.tech` (registros datados no [Guia de Hospedagem](Hospedagem.md)). Backup criptografado diário com retenção, monitoramento externo e ensaio de restauração estão descritos no mesmo guia; a ativação de cada item na VM é registrada pelo operador.
- **Senha:** cada usuário altera a própria em **Segurança** e pode recuperá-la por e-mail em **Esqueci minha senha** (quando a instalação tem e-mail configurado); o administrador também redefine senhas em **Cadastros → Usuários**.
- **Segurança da UI:** guestGate, permissions e os atributos `data-requires-*` orientam a interface. As permissões efetivas são as das rotas/controllers do backend.
- **Notificações push:** o texto é exibido em português nesta versão, e o som é o padrão do dispositivo, pois o navegador não permite som personalizado.
- **Granularidade do inventário:** o sistema controla quantidades por modelo/categoria, não números de série individuais.
- **Dados:** este manual não contém dados reais; use somente contas, pessoas, equipamentos e tokens autorizados pela sua instalação.

## 15. Solução rápida de problemas

**Não consigo criar, editar ou devolver.** Confira o papel em **Meu Perfil**, confirme que a sessão ainda está ativa e tente novamente. **Convidado** é somente leitura.

**O empréstimo é recusado.** Verifique **Disponíveis** no **Dashboard**; itens já emprestados ou em **Manutenção** não podem ser emprestados. Confirme também que há pelo menos um item no formulário.

**O cartão RFID não funciona.** Confirme as duas flags, o segredo compartilhado, o processo da ponte, a conexão loopback, o leitor e o cartão vinculado. Enquanto isso, use login por senha.

**A exportação não é gerada.** Revise o tipo, o período, os equipamentos marcados e o formato. A aplicação não cria arquivo quando não encontra registros para os filtros.

**Não recebo notificações push.** Confirme que sua conta é **Administrador** e que as notificações estão ativadas neste dispositivo em **Configurações → Notificações**; use **Enviar notificação de teste**. No iPhone ou iPad, o app precisa estar instalado na tela de início (iOS 16.4 ou superior). Se o navegador bloqueou o aviso, libere as notificações nas configurações do site e recarregue a página.
