# Operação e recuperação — eduAssets

Este guia orienta a triagem de incidentes sem substituir o [Guia de Implantação](GUIA_IMPLANTACAO.md) nem o [Guia de Hospedagem](Hospedagem.md). Foi escrito para operadores autorizados. Não contém credenciais, dados pessoais ou comandos para alterar diretamente uma base de produção.

## Limites conhecidos

- O workflow de CI do GitHub Actions executa verificações e smoke tests em ambiente descartável; **não** publica o frontend nem faz deploy/restart na VM Oracle. O deploy da API continua manual e revisado (ver [Guia de Implantação](GUIA_IMPLANTACAO.md)).
- O workflow `Uptime` verifica a cada 15 minutos os endpoints públicos, TLS e `security.txt`; na VM, `eduassets-healthcheck.timer` verifica disco, memória, saúde do container (com reinício após 3 falhas seguidas) e idade do backup. Detalhes no [Guia de Hospedagem §10](Hospedagem.md).
- O run `39875293195` é evidência histórica registrada para `verify` e `production-smoke` no commit `a8cd39b`, não uma prova do estado do checkout atual ou de serviços remotos.
- Deploys que alteram schema exigem backup confirmado, migration explícita e validação de health/readiness; não rode seed ou migrations contra banco operacional sem revisão e janela aprovada.
- A revogação de sessão depende de uma chamada à API. Se a rede estiver indisponível quando o usuário sair, a UI limpa o estado local e marca a saída como pendente: o app não restaura essa sessão ao ser reaberto e repete a revogação quando a conexão volta ou na próxima abertura. Até a repetição ter sucesso, o JWT continua válido no servidor pelo restante das 8 horas.
- Timeout administrativo: 30 minutos; atividade fica na memória de cada processo e pressupõe uma única instância. Após reinício, tokens administrativos sem estado de atividade recuperável falham de forma fechada; JWTs expiram em até 8 horas.
- RFID é opcional, dependente de hardware e flag de configuração; templates de referência o mantêm desligado e o bloqueiam na borda pública.

## Triagem inicial

1. Registre horário, versão/commit e sintomas sem incluir senhas, cookies, JWTs, códigos RFID ou dados de estudantes.
2. Separe falha de browser/frontend, API, banco, proxy/TLS, rede e hardware. Compare `/health` (processo) com `/ready` (dependência PostgreSQL); não interprete liveness como saúde completa do banco.
3. Consulte logs sanitizados do serviço, Nginx e workflow de CI. Redija valores de ambiente e cabeçalhos de autenticação antes de compartilhar qualquer saída.
4. Não tente corrigir CORS removendo validação de `Origin`, não exponha as portas 3000/3001/5432 à Internet e não habilite RFID como alternativa de emergência.
5. Para indisponibilidade, configuração, backup, migrations e rollback, siga a sequência revisada no guia de hospedagem/implantação. Interrompa se o estado do banco ou o backup não puder ser confirmado.

## Conta comprometida ou acesso suspeito

O usuário deve encerrar a sessão e notificar o administrador da instalação por canal institucional. O administrador deve verificar a conta e os eventos disponíveis, revogar/vincular credenciais segundo os procedimentos de acesso aprovados, revisar sessões posteriores e avaliar exposição de dados. A alteração de senha pelo próprio usuário exige uma sessão autenticada; sem ela, o usuário pode usar **Esqueci minha senha** (link de uso único por e-mail, válido por 30 minutos, que encerra todas as sessões e é auditado como `PASSWORD_RESET_SELF`). Se a conta pode ter sido comprometida junto com a caixa de e-mail, o administrador deve desativá-la antes de investigar. Um administrador redefine a senha de outra conta em **Cadastros → Usuários → Redefinir senha**: a ação encerra todas as sessões da conta (`sessionVersion`) e é auditada como `PASSWORD_RESET`. O runbook administrativo de reset manual no banco fica reservado ao caso em que nenhum administrador consegue entrar, deve ser executado por operador autorizado e nunca com SQL improvisado.

Não peça ao usuário que envie senha, cookie, JWT, código de uso único RFID ou dump do banco. Quando houver suspeita de vazamento de segredo de infraestrutura, siga o processo institucional de rotação e registre a alteração sem copiar o novo valor para tickets ou Git.

## Restauração e retorno ao serviço

Backups e migrations são operações de alto impacto. No checkout do backend, [backup-postgres.sh](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/backup-postgres.sh) gera dump `pg_dump` custom-format; [restore-postgres-empty-db.sh](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/restore-postgres-empty-db.sh) exige confirmação e só aceita destino descartável sem objetos em schemas não sistêmicos, sem usar `--clean`. Siga o [procedimento de implantação e restore](GUIA_IMPLANTACAO.md), teste em destino isolado, verifique integridade/contagem sem expor dados e obtenha autorização antes de alterar produção. Este documento não comprova restore real nem estabelece retenção/RPO/RTO.

Após uma intervenção autorizada, registre versão, migrations aplicadas, resultado de `/health` e `/ready`, responsável pela ação e riscos remanescentes. Não declare incidente encerrado somente porque o container iniciou: valide login, uma consulta de leitura apropriada, logs sem erros e disponibilidade do backup.

Para comprovar que os backups são recuperáveis sem tocar na produção, use o ensaio [`verify-backup-restore.sh`](https://github.com/edu-assets/api-eduassets/blob/main/deploy/scripts/verify-backup-restore.sh), descrito no [Guia de Hospedagem §11.2](Hospedagem.md): ele restaura o backup mais recente em um PostgreSQL descartável na máquina do operador e confere migrations e contagens.

**Registro do operador — 28/10/2026:** release API v1.0.1 no commit `14b0716110750857daa27d0e979e3bec574e39e0`; migration `20261028173000_user_management_audit` aplicada; backup age criptografado listado no R2; `/health` e `/ready` responderam localmente e no domínio público. Este registro não comprova restauração do backup de produção, agendamento/retention ou monitoramento contínuo.
## Documentação relacionada

- [Guia de Hospedagem](Hospedagem.md) / [Hosting Guide](Hosting.md)
- [Guia de Implantação](GUIA_IMPLANTACAO.md) / [Deployment Guide](DEPLOYMENT.md)
- [Referência da API](REFERENCIA_API.md) / [API Reference](API_REFERENCE.md)
- [Modelo de Dados](MODELO_DE_DADOS.md) / [Data Model](DATA_MODEL.md)
- Runbook administrativo para operadores autorizados: `operations/backend/ADMIN_PASSWORD_RESET_RUNBOOK.md` (fora do catálogo servido em `public/docs/`; a visibilidade do arquivo no GitHub depende das permissões deste repositório).
