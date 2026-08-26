# Roadmap — eduAssets

## Rumo ao v1.0.0 (curto prazo)

- [ ] Testes automatizados com Vitest para lógica de negócio crítica (estoque, validação de itens) — setup já iniciado na v0.9.9.
- [ ] Configuração adequada de CORS para produção (hoje permissivo por padrão quando `CORS_ORIGIN` não está definida).
- [ ] Testes de ponta a ponta do fluxo RFID direto no hardware do Raspberry Pi 5.
- [ ] Ajustes finais de Nginx: compressão gzip/brotli, cache headers, HTTP/2.
- [ ] Primeiro deploy público (frontend na Vercel, backend no Render).

## v1.0.0 — Release estável
Marco de estabilidade: todas as funcionalidades essenciais completas, testadas e documentadas; sem mudanças estruturais pendentes.

## Pós-1.0 (v2 — médio/longo prazo)

- [ ] Migração completa do frontend para TypeScript + React, reaproveitando as camadas `core`/`features`/`shared` já existentes.
- [ ] Rastreamento individual por número de série (hoje o controle é por quantidade agregada, não por unidade física).
- [ ] Recuperação de senha ("Esqueci minha senha") — hoje só é possível alteração autenticada via painel Segurança.
- [ ] Permissões mais granulares (por painel/ação), além dos dois níveis atuais (Administrador/Editor).
- [ ] Seletor de temas além de Claro/Escuro/Sistema (a estrutura de tokens já suporta múltiplos temas).
- [ ] Notificações reais (hoje a interface em Configurações é apenas visual).

## Ideias em avaliação (sem compromisso de prazo)

- Relatórios agendados (exportação automática periódica por e-mail).
- App mobile companion para leitura de QR code como alternativa ao RFID.
