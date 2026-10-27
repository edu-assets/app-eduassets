# Documentação do frontend eduAssets

[English](README.md) · [Repositório de documentação](https://github.com/edu-assets/docs-eduassets) · [Código-fonte do frontend](https://github.com/edu-assets/app-eduassets)

Esta é a página de entrada em português para os guias da aplicação de navegador eduAssets. O código-fonte do frontend fica em `edu-assets/app-eduassets`; a API fica em `edu-assets/eduAssets`; a documentação bilíngue canônica é mantida em `edu-assets/docs-eduassets`.

## Guias

- [Manual do usuário](MANUAL_USUARIO.md)
- [Arquitetura](ARQUITETURA.md)
- [Modelo de dados](MODELO_DE_DADOS.md)
- [Referência da API](REFERENCIA_API.md)
- [Desenvolvimento](DESENVOLVIMENTO.md)
- [Implantação](GUIA_IMPLANTACAO.md) · [Hospedagem e operação](Hospedagem.md)
- [Operação e recuperação](OPERACAO_E_RECUPERACAO.md)
- [Histórico de alterações](CHANGELOG.md) · [Roadmap](ROADMAP.md)

O painel Sobre mantém o catálogo, a busca, o índice e o renderizador Markdown no repositório do frontend. Por padrão, ele carrega o Markdown canônico de https://docs.eduassets.tech; `VITE_DOCS_BASE_URL` pode substituir a URL-base. Se a requisição remota falhar ou retornar resposta sem sucesso, o app usa o fallback de mesma origem incluído no frontend.
