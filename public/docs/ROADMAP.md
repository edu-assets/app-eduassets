# Roadmap — eduAssets

> **Versão oficial 1.0.0 — 28 de outubro de 2026.** Esta página descreve o escopo do produto e suas direções de evolução; não é um painel de disponibilidade da infraestrutura.

## Versão 1.0.0 — oficial

A versão oficial reúne o frontend web em TypeScript/Vite, a API Node.js/Express e a persistência PostgreSQL via Prisma em repositórios separados. O sistema oferece gestão de equipamentos, estoque agregado, empréstimos, devoluções e ocorrências, com perfis de Convidado, Editor e Administrador, relatórios e exportações.

O fluxo de autenticação oferece sessões por cookie seguro quando suportadas pelo backend, validação de origem para mutações autenticadas, compatibilidade controlada com Bearer legado e uma troca de código de uso único para login RFID. O modo Convidado recebe projeções de dados minimizadas no servidor; as permissões efetivas são aplicadas pela API.

O produto inclui documentação canônica bilíngue, leitor integrado no app e site de apresentação separado. O RFID permanece opcional e os templates públicos de implantação o mantêm desabilitado por padrão.

## Operação e arquitetura

A API é a fronteira de autorização; controles de interface são medidas de usabilidade. O estado do timeout administrativo é local ao processo, portanto a configuração documentada pressupõe uma instância. Os guias de implantação, hospedagem e recuperação descrevem os procedimentos operacionais e de banco de dados. O status de versão 1.0.0 não equivale a uma leitura em tempo real dos serviços hospedados.

## Direções de evolução

Possíveis frentes para versões futuras incluem rastreamento de unidades por número de série, recuperação de senha, papéis de acesso mais granulares, notificações funcionais, relatórios periódicos e um aplicativo móvel ou QR como alternativa ao RFID. Uma migração de frontend para React também pode ser considerada; o cliente atual usa TypeScript com renderização nativa do DOM.
