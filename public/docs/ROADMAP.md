# Roadmap — eduAssets

> **Versão oficial 1.7.2, publicada em 24/11/2026.** Esta página descreve o escopo do produto e suas direções de evolução; não é um painel de disponibilidade da infraestrutura.

## Escopo atual

Da 1.3 à 1.7, o produto ganhou o banner e a ativação guiada de notificações push com uma fonte única de versão (1.3), a autoria dos registros e a gestão de usuários (1.4), o histórico com filtros, rotas por painel e sessão mais segura (1.5), o resumo de operações no Início, o kit visual e os avatares (1.6) e o agendamento de equipamentos com reserva por janela de horário (1.7). Os detalhes de cada versão estão no changelog.

### Base da 1.2

A versão 1.2.0 ampliou o escopo da 1.0.x com a redefinição de senha pelo administrador na interface, a recuperação de senha self-service por e-mail, o logout resiliente a falhas de rede e a operação contínua (monitoramento com alerta de erros 5xx, backup agendado com retenção, ensaio de restauração e deploy automático da API após a CI), mantendo a remediação de segurança da 1.0.1 e as correções de interface da 1.0.2 registradas no changelog. Ela reúne o frontend web em TypeScript/Vite, a API Node.js/Express e a persistência PostgreSQL via Prisma em repositórios separados. O sistema oferece gestão de equipamentos, estoque agregado, empréstimos, devoluções e ocorrências, com perfis de Convidado, Editor e Administrador, relatórios e exportações.

O navegador usa sessões exclusivamente por cookie seguro; se o suporte não puder ser confirmado, o login falha fechado e nenhum JWT é persistido em `localStorage`. O backend valida a origem das mutações autenticadas e pode manter compatibilidade Bearer para clientes legados não-browser. O login RFID de navegador troca um código de uso único por cookie. O modo Convidado recebe projeções minimizadas no servidor; as permissões efetivas são aplicadas pela API.

O produto inclui documentação canônica bilíngue, leitor integrado no app e site de apresentação separado. O RFID permanece opcional e os templates públicos de implantação o mantêm desabilitado por padrão.

## Operação e arquitetura

A API é a fronteira de autorização; controles de interface são medidas de usabilidade. O estado do timeout administrativo é local ao processo, portanto a configuração documentada pressupõe uma instância. Os guias de implantação, hospedagem e recuperação descrevem os procedimentos operacionais e de banco de dados. O status de versão não equivale a uma leitura em tempo real dos serviços hospedados.

## Direções de evolução

Possíveis frentes para versões futuras incluem rastreamento de unidades por número de série, papéis de acesso mais granulares, notificações funcionais, relatórios periódicos e um aplicativo móvel ou QR como alternativa ao RFID. Uma migração de frontend para React também pode ser considerada; o cliente atual usa TypeScript com renderização nativa do DOM.
