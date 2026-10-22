# Roadmap — eduAssets

> **Status do checkout (22/10/2026): Beta.** Correções de código, testes e templates foram implementados. Suíte PostgreSQL foi executada em banco local descartável; Docker/Compose e CI hospedado não foram executados. Nenhum recurso público/infraestrutura foi implantado ou validado.

## Concluído no código e verificado localmente

- [x] Frontend TypeScript/Vite: 35 testes em 9 arquivos e build local aprovados; testes cobrem sincronização Guest/Editor/Administrador, revogação de logout e limpeza local imediata.
- [x] Backend Prisma/Express: sem fallback in-memory, segredo JWT obrigatório, configuração validada, build TypeScript, `prisma validate` e 24 testes unitários aprovados.
- [x] JWT/roles e estado atual de usuário verificados na autorização; timeout de administrador por jti fail-closed; `sessionVersion` persistida revoga tokens no logout/troca de senha; 401 limpa a sessão e erros 403/rede continuam distintos.
- [x] Guest Mode preservado com projeções server-side allowlisted e minimizadas; `/responsaveis` e `/usuarios` exigem auth; mutações exigem autorização no backend.
- [x] Transações e locking de empréstimos/devoluções e resolução/exclusão de ocorrências, logout e troca de senha passaram em nove testes HTTP/concorrência contra PostgreSQL 16 local descartável; as seis migrations foram aplicadas a banco de teste vazio.
- [x] F4 — atualização de stores/formulários após criação; F5 — filtros de datas de calendário local; F6 — 401 sem usuário hidratado; F7 — data escolhida enviada como timestamp offset-aware; revisados com testes locais onde aplicável.
- [x] `/health` liveness e `/ready` readiness PostgreSQL com timeout/sem detalhe sensível; bridge RFID com flag desligada por padrão.
- [x] Templates de ambiente local/produção, Docker multi-stage, Compose, configuração Nginx, backup/restore não destrutivo e GitHub Actions CI foram adicionados. Sua execução em serviço real não foi validada.

> O PostgreSQL local descartável valida o código e migrations, mas não equivale a homologação do provedor, banco de produção, CI hospedado, browser em produção, aprovação de privacidade ou certificação de hardware.

## Próximos passos para v1.0.0

- [ ] Executar workflow CI no GitHub e resolver eventuais incompatibilidades específicas do runner.
- [x] Executar nove testes de integração/race em PostgreSQL 16 local descartável; repetir no runner hospedado após workflow.
- [ ] Fazer QA manual de browser para CORS/CSP, guest anonymization/exports, login/timeout, fluxos de empréstimo/ocorrência e responsividade/acessibilidade.
- [ ] Validar `docker build`, compose e Nginx no host-alvo; `nginx -t`, firewall, real-IP Cloudflare e rate limit com ranges Cloudflare atuais; sem isso, o IP do edge pode agrupar usuários.
- [ ] Obter e validar domínio/DNS, projeto Vercel, origem API, certificado TLS Full (strict), rotação de segredo, monitoramento e disponibilidade.
- [ ] Testar backup em armazenamento externo e restaurá-lo em banco novo vazio; aprovar RPO/RTO, retenção e resposta a incidentes.
- [ ] Completar review de acessibilidade, casos de UI, ameaças de privacidade, isolamento do banco e política de dados sintéticos.

## Bloqueios e escopo externo

- [ ] **Banco:** somente um PostgreSQL local e descartável foi usado; nenhuma URL/credencial remota foi fornecida, e nenhuma migration/seed foi aplicada a banco remoto. Antes da produção: DB dedicado, backup, migration `deploy` primeiro em homologação e evidência de restauração.
- [ ] **Host/domínio:** Oracle Cloud/VM, Vercel, DNS, Cloudflare, firewall, certificado e `CORS_ORIGIN` real não foram verificados nem alterados. O guia descreve templates apenas.
- [ ] **Privacidade/acesso:** Guest DTOs do backend foram testados por unitários; validação ponta-a-ponta com demo sintética e revisão de políticas/grants do provedor continuam necessárias. Não há PostgREST direto no app atual; se o provedor expuser esse serviço, bloquear acesso anônimo não pretendido e revisar grants/RLS separadamente.
- [ ] **Hardware:** sem Raspberry Pi/leitor GPIO, leitor serial, OS-alvo ou instalação systemd; RFID permanece opcional/desligado na implantação pública. Cartões são identificadores clonáveis no plano físico, portanto a ponte permanece local e protegida.
- [ ] **Escala:** timer de inatividade admin usa estado em memória e pressupõe uma instância; se escalar horizontalmente, implementar sessão/atividade compartilhada antes de ampliar.
- [ ] **Release:** domínio e URLs nos templates são placeholders/propostas, não endpoints operacionais.

## v1.0.0 — Release estável

Ainda não atingido. Exige CI verde, testes de integração PostgreSQL e Docker, smoke tests em staging, restore drill, QA manual, configuração externa revisada e evidência de privacidade/segurança. Até então o status é **Beta**.

## Pós-1.0 (v2 — médio/longo prazo)

- [ ] Migração para React (frontend atual é TypeScript com DOM nativo).
- [ ] Rastrear unidade individual por número de série (atualmente estoque agregado).
- [ ] Recuperação de senha (atualmente apenas troca autenticada).
- [ ] Permissões mais granulares que Administrador/Editor.
- [ ] Temas adicionais e notificações funcionais (interface atual de notificações não persiste/entrega alertas).

## Ideias sem cronograma

- Relatórios periódicos automáticos.
- Aplicativo mobile e QR code como alternativa à integração RFID.
