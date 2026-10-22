# Roadmap — eduAssets

> **Status do checkout (22/10/2026): Beta.** Foram implementadas correções de código, cobertura unitária, testes de integração preparados, workflow CI e templates de implantação. Testes PostgreSQL/Docker/CI hospedado ainda não foram executados; nenhum recurso público/infraestrutura foi implantado ou validado.

## Concluído no código e verificado localmente

- [x] Frontend TypeScript/Vite: 29 testes em 6 arquivos, typecheck e build locais aprovados.
- [x] Backend Prisma/Express: sem fallback in-memory, segredo JWT obrigatório, configuração validada, build local sem `DIRECT_URL` e 20 testes unitários.
- [x] JWT/roles e estado atual de usuário verificados na autorização; timeout de administrador por jti com falha fechada quando o estado necessário não está presente; 401 limpa sessão e erros 403/rede continuam distintos.
- [x] Guest Mode preservado com projeções server-side allowlisted e minimizadas; `/responsaveis` e `/usuarios` exigem auth; mutações exigem autorização no backend.
- [x] Transações e locking de empréstimos/devoluções e resolução/exclusão de ocorrências foram revisados para prevenir estados duplicados/estoque duplicado; testes HTTP concorrentes foram escritos para CI, mas precisam de execução em PostgreSQL.
- [x] F4 — atualização de stores/formulários após criação; F5 — filtros de datas de calendário local; F6 — 401 sem usuário hidratado; F7 — data escolhida enviada como timestamp offset-aware; revisados com testes locais onde aplicável.
- [x] `/health` liveness e `/ready` readiness PostgreSQL com timeout/sem detalhe sensível; bridge RFID com flag desligada por padrão.
- [x] Templates de ambiente local/produção, Docker multi-stage, Compose, configuração Nginx, backup/restore não destrutivo e GitHub Actions CI foram adicionados. Sua execução em serviço real não foi validada.

> Conclusões locais não equivalem a testes em banco real, CI hospedado, browser em produção, aprovação de privacidade ou certificação de hardware.

## Próximos passos para v1.0.0

- [ ] Executar workflow CI em GitHub; corrigir eventuais incompatibilidades de PostgreSQL, migrations, Docker ou Compose. O workflow ainda não foi acionado nesta sessão.
- [ ] Executar as cinco verificações da suite integração/race em PostgreSQL descartável isolado. Nenhuma conexão de banco foi iniciada neste sandbox.
- [ ] Fazer QA manual de browser para CORS/CSP, guest anonymization/exports, login/timeout, fluxos de empréstimo/ocorrência e responsividade/acessibilidade.
- [ ] Validar `docker build`, compose e Nginx no host-alvo; `nginx -t`, firewall, real-IP Cloudflare e rate limit com ranges Cloudflare atuais; sem isso, o IP do edge pode agrupar usuários.
- [ ] Obter e validar domínio/DNS, projeto Vercel, origem API, certificado TLS Full (strict), rotação de segredo, monitoramento e disponibilidade.
- [ ] Testar backup em armazenamento externo e restaurá-lo em banco novo vazio; aprovar RPO/RTO, retenção e resposta a incidentes.
- [ ] Completar review de acessibilidade, casos de UI, ameaças de privacidade, isolamento do banco e política de dados sintéticos.

## Bloqueios e escopo externo

- [ ] **Banco:** nenhuma URL/credencial foi fornecida nem foi conectada; migrations ou seed não foram aplicados. Antes da produção: DB dedicado, backup, migration `deploy` primeiro em homologação e evidência de restauração.
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
