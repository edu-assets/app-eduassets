# Roadmap — eduAssets

> **Status do checkout (22/10/2026): Beta.** Correções de código, testes e templates foram implementados. Nesta execução, testes unitários, builds, `prisma validate` e asserts estáticos passaram; PostgreSQL/migrations/seed, production smoke, builds de imagem e CI hospedado passaram no run `39875293195`; Nginx runtime local ainda não foi executado. Nenhum recurso público/infraestrutura foi implantado ou validado.

## Concluído no código e verificado localmente

- [x] Frontend TypeScript/Vite: 36 testes em 9 arquivos e build local aprovados; testes cobrem readiness, sincronização Guest/Editor/Administrador, revogação de logout e limpeza local imediata.
- [x] Backend Prisma/Express: sem fallback in-memory, segredo JWT obrigatório, configuração validada, build TypeScript, `prisma validate` com `DIRECT_URL` omitido/vazio e 30 testes unitários aprovados.
- [x] JWT/roles e estado atual de usuário verificados na autorização; timeout de administrador por jti fail-closed; `sessionVersion` persistida revoga tokens no logout/troca de senha; 401 limpa a sessão e erros 403/rede continuam distintos.
- [x] Guest Mode preservado com projeções server-side allowlisted e minimizadas; `/responsaveis` e `/usuarios` exigem auth; mutações exigem autorização no backend.
- [ ] Transações e locking de empréstimos/devoluções e resolução/exclusão de ocorrências, logout e troca de senha: a suíte HTTP/concorrência e as seis migrations passaram no CI hospedado `39875293195` contra PostgreSQL descartável.
- [x] F4 — atualização de stores/formulários após criação; F5 — filtros de datas de calendário local; F6 — 401 sem usuário hidratado; F7 — data escolhida enviada como timestamp offset-aware; revisados com testes locais onde aplicável.
- [x] `/health` liveness e `/ready` readiness PostgreSQL com timeout/sem detalhe sensível; bridge RFID com flag desligada por padrão.
- [x] Templates de ambiente local/produção, Docker multi-stage, Compose, configuração Nginx, backup/restore não destrutivo e GitHub Actions CI foram adicionados. Sua execução em serviço real não foi validada.
- [x] P0/P1 desta remediação: `DIRECT_URL` opcional, CSP da API, entrypoint Node direto, smoke de produção no CI e bloqueio público Nginx para RFID foram implementados; runtime ainda não foi validado.

> Embora PostgreSQL não esteja disponível localmente, o CI hospedado validou migrations e requests HTTP em banco descartável; isso não equivale a homologação do provedor, banco de produção, browser em produção, aprovação de privacidade ou certificação de hardware.

## Próximos passos para v1.0.0

- [ ] Executar workflow CI no GitHub e resolver eventuais incompatibilidades específicas do runner.
- [x] Executar testes de integração/race em PostgreSQL descartável no workflow de produção; o run `39875293195` passou.
- [ ] Fazer QA manual de browser para CORS/CSP, guest anonymization/exports, login/timeout, fluxos de empréstimo/ocorrência e responsividade/acessibilidade.
- [ ] Validar `docker build`, compose e Nginx no host-alvo; `nginx -t`, firewall, real-IP Cloudflare e rate limit com ranges Cloudflare atuais; sem isso, o IP do edge pode agrupar usuários.
- [ ] Obter e validar domínio/DNS, projeto Vercel, origem API, certificado TLS Full (strict), rotação de segredo, monitoramento e disponibilidade.
- [ ] Testar backup em armazenamento externo e restaurá-lo em banco novo vazio; aprovar RPO/RTO, retenção e resposta a incidentes.
- [ ] Completar review de acessibilidade, casos de UI, ameaças de privacidade, isolamento do banco e política de dados sintéticos.

## Bloqueios e escopo externo

- [ ] **Banco:** nenhum PostgreSQL local/remoto foi usado nesta execução; nenhuma URL/credencial remota foi fornecida e nenhuma migration/seed foi aplicada. Antes da produção: DB dedicado, backup, migration `deploy` primeiro em homologação e evidência de restauração.
- [ ] **Host/domínio:** Oracle Cloud/VM, Vercel, DNS, Cloudflare, firewall, certificado e `CORS_ORIGIN` real não foram verificados nem alterados. O guia descreve templates apenas.
- [ ] **Privacidade/acesso:** Guest DTOs do backend foram testados por unitários; validação ponta-a-ponta com demo sintética e revisão de políticas/grants do provedor continuam necessárias. Não há PostgREST direto no app atual; se o provedor expuser esse serviço, bloquear acesso anônimo não pretendido e revisar grants/RLS separadamente.
- [ ] **Hardware:** sem Raspberry Pi/leitor GPIO, leitor serial, OS-alvo ou instalação systemd; RFID permanece opcional/desligado na implantação pública. Cartões são identificadores clonáveis no plano físico, portanto a ponte permanece local e protegida.
- [ ] **Escala:** timer de inatividade admin usa estado em memória e pressupõe uma instância; se escalar horizontalmente, implementar sessão/atividade compartilhada antes de ampliar.
- [ ] **Release:** domínio e URLs nos templates são placeholders/propostas, não endpoints operacionais.

## v1.0.0 — Release estável

Ainda não atingido. Exige execução do smoke CI com PostgreSQL/Docker, testes de integração, smoke tests em staging, restore drill, QA manual, configuração externa revisada e evidência de privacidade/segurança. Até então o status é **Beta**.

## Pós-1.0 (v2 — médio/longo prazo)

- [ ] Migração para React (frontend atual é TypeScript com DOM nativo).
- [ ] Rastrear unidade individual por número de série (atualmente estoque agregado).
- [ ] Recuperação de senha (atualmente apenas troca autenticada).
- [ ] Permissões mais granulares que Administrador/Editor.
- [ ] Temas adicionais e notificações funcionais (interface atual de notificações não persiste/entrega alertas).

## Ideias sem cronograma

- Relatórios periódicos automáticos.
- Aplicativo mobile e QR code como alternativa à integração RFID.
