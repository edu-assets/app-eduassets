# Roadmap — eduAssets

> **Status do checkout (23/10/2026): Beta.** Correções de código, testes e templates foram implementados. A implantação operacional foi validada pelo operador: frontend no Cloudflare Pages, API na VM Oracle atrás do Nginx, DNS proxied, HTTPS externo e preflight CORS. Backups externos, restore drill, monitoramento e QA funcional completo ainda não encerram o ciclo Beta.

## Concluído no código e verificado localmente

- [x] Frontend TypeScript/Vite: 36 testes em 9 arquivos e build local aprovados; testes cobrem readiness, sincronização Guest/Editor/Administrador, revogação de logout e limpeza local imediata.
- [x] Backend Prisma/Express: sem fallback in-memory, segredo JWT obrigatório, configuração validada, build TypeScript, `prisma validate` com `DIRECT_URL` omitido/vazio e 30 testes unitários aprovados.
- [x] JWT/roles e estado atual de usuário verificados na autorização; timeout de administrador por jti fail-closed; `sessionVersion` persistida revoga tokens no logout/troca de senha; 401 limpa a sessão e erros 403/rede continuam distintos.
- [x] Guest Mode preservado com projeções server-side allowlisted e minimizadas; `/responsaveis` e `/usuarios` exigem auth; mutações exigem autorização no backend.
- [ ] Transações e locking de empréstimos/devoluções e resolução/exclusão de ocorrências, logout e troca de senha: a suíte HTTP/concorrência e as seis migrations passaram no CI hospedado `39875293195` contra PostgreSQL descartável.
- [x] F4 — atualização de stores/formulários após criação; F5 — filtros de datas de calendário local; F6 — 401 sem usuário hidratado; F7 — data escolhida enviada como timestamp offset-aware; revisados com testes locais onde aplicável.
- [x] `/health` liveness e `/ready` readiness PostgreSQL com timeout/sem detalhe sensível; bridge RFID com flag desligada por padrão.
- [x] Templates de ambiente local/produção, Docker multi-stage, Compose, configuração Nginx, backup/restore não destrutivo e GitHub Actions CI foram adicionados; a API foi executada na VM Oracle com PostgreSQL remoto no Neon.
- [x] P0/P1 desta remediação: `DIRECT_URL` opcional, CSP da API, entrypoint Node direto, smoke de produção no CI e bloqueio público Nginx para RFID foram implementados; HTTPS externo e preflight CORS foram validados no deployment.

> Embora PostgreSQL não esteja disponível localmente, o CI hospedado validou migrations e requests HTTP em banco descartável. A implantação real usa Neon; isso não equivale a um restore drill, aprovação de privacidade ou certificação de hardware.

## Próximos passos para v1.0.0

- [ ] Executar workflow CI no GitHub e resolver eventuais incompatibilidades específicas do runner.
- [x] Executar testes de integração/race em PostgreSQL descartável no workflow de produção; o run `39875293195` passou.
- [ ] Fazer QA manual de browser para CORS/CSP, guest anonymization/exports, login/timeout, fluxos de empréstimo/ocorrência e responsividade/acessibilidade.
- [x] Validar Compose/API, Nginx, firewall, domínio, Cloudflare Pages, origem API, HTTPS e CORS no host-alvo; revisar real-IP Cloudflare e rate limit com ranges atuais ainda é necessário.
- [ ] Completar rotação de segredo, monitoramento, alertas e evidência de disponibilidade; frontend, DNS, origem API e HTTPS foram validados no deployment Beta.
- [ ] Testar backup em armazenamento externo e restaurá-lo em banco novo vazio; aprovar RPO/RTO, retenção e resposta a incidentes.
- [ ] Completar review de acessibilidade, casos de UI, ameaças de privacidade, isolamento do banco e política de dados sintéticos.

## Bloqueios e escopo externo

- [ ] **Banco:** Neon está configurado como PostgreSQL remoto da implantação. Permanecem necessários backup externo, `migrate deploy` controlado e evidência de restauração em banco novo vazio.
- [x] **Host/domínio:** Oracle VM, Cloudflare Pages, DNS, HTTPS, firewall de entrada e `CORS_ORIGIN` foram verificados no deployment Beta; ranges real-IP, WAF/rate limit e monitoramento continuam revisão operacional.
- [ ] **Privacidade/acesso:** Guest DTOs do backend foram testados por unitários; validação ponta-a-ponta com demo sintética e revisão de políticas/grants do provedor continuam necessárias. Não há PostgREST direto no app atual; se o provedor expuser esse serviço, bloquear acesso anônimo não pretendido e revisar grants/RLS separadamente.
- [ ] **Hardware:** sem Raspberry Pi/leitor GPIO, leitor serial, OS-alvo ou instalação systemd; RFID permanece opcional/desligado na implantação pública. Cartões são identificadores clonáveis no plano físico, portanto a ponte permanece local e protegida.
- [ ] **Escala:** timer de inatividade admin usa estado em memória e pressupõe uma instância; se escalar horizontalmente, implementar sessão/atividade compartilhada antes de ampliar.
- [x] **Release:** `app.eduassets.tech` e `api.eduassets.tech` são os endpoints operacionais do deployment Beta; os templates continuam exemplos para novas instalações.

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
