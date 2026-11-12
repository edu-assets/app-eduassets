# Roadmap — eduAssets

> **Versão oficial 1.2.0 — 12 de novembro de 2026.** Esta página descreve o escopo do produto e suas direções de evolução; não é um painel de disponibilidade da infraestrutura.

## Versão 1.2.0 — oficial

A versão oficial 1.2.0 amplia o escopo da 1.0.x com a redefinição de senha pelo administrador na interface, a recuperação de senha self-service por e-mail, o logout resiliente a falhas de rede e a operação contínua (monitoramento com alerta de erros 5xx, backup agendado com retenção, ensaio de restauração e deploy automático da API após a CI), mantendo a remediação de segurança da 1.0.1 e as correções de interface da 1.0.2 registradas no changelog. Ela reúne o frontend web em TypeScript/Vite, a API Node.js/Express e a persistência PostgreSQL via Prisma em repositórios separados. O sistema oferece gestão de equipamentos, estoque agregado, empréstimos, devoluções e ocorrências, com perfis de Convidado, Editor e Administrador, relatórios e exportações.

O navegador usa sessões exclusivamente por cookie seguro; se o suporte não puder ser confirmado, o login falha fechado e nenhum JWT é persistido em `localStorage`. O backend valida a origem das mutações autenticadas e pode manter compatibilidade Bearer para clientes legados não-browser. O login RFID de navegador troca um código de uso único por cookie. O modo Convidado recebe projeções minimizadas no servidor; as permissões efetivas são aplicadas pela API.

O produto inclui documentação canônica bilíngue, leitor integrado no app e site de apresentação separado. O RFID permanece opcional e os templates públicos de implantação o mantêm desabilitado por padrão.

## Operação e arquitetura

A API é a fronteira de autorização; controles de interface são medidas de usabilidade. O estado do timeout administrativo é local ao processo, portanto a configuração documentada pressupõe uma instância. Os guias de implantação, hospedagem e recuperação descrevem os procedimentos operacionais e de banco de dados. O status de versão 1.2.0 não equivale a uma leitura em tempo real dos serviços hospedados.

## Direções de evolução

Possíveis frentes para versões futuras incluem rastreamento de unidades por número de série, papéis de acesso mais granulares, notificações funcionais, relatórios periódicos e um aplicativo móvel ou QR como alternativa ao RFID. Uma migração de frontend para React também pode ser considerada; o cliente atual usa TypeScript com renderização nativa do DOM.
