# ClientFlow

Gestão de clientes e projetos para freelancers e pequenas agências — feito em HTML, CSS e JavaScript puro, sem frameworks.

## Descrição

ClientFlow é uma aplicação web instalável (PWA) que centraliza os clientes de um freelancer e os projetos vinculados a cada um, com prazos, valores e status. O diferencial é um painel de alertas que calcula automaticamente, a cada acesso, quais projetos estão atrasados ou vencendo em breve — sem exigir nenhuma ação manual do usuário.

## Problema

Freelancers e pequenas agências costumam controlar clientes e projetos em planilhas ou anotações soltas. Isso dificulta responder rapidamente a perguntas simples como "quais projetos estão atrasados agora?" ou "quanto tenho previsto para receber este mês?".

## Solução

Um cadastro único de clientes e projetos, guardado localmente no navegador, com busca, filtros, ordenação e um painel que já chega calculado: atrasados, próximos do prazo, receita prevista e receita recebida.

## Funcionalidades

- Cadastro (CRUD completo) de clientes: nome, empresa, e-mail, telefone.
- Cadastro (CRUD completo) de projetos, vinculados a um cliente: título, valor, data de início, prazo e status (orçado, em andamento, concluído, cancelado).
- Exclusão de cliente remove em cascata os projetos vinculados a ele, com confirmação explícita.
- Busca por nome/empresa (clientes) e por título/cliente (projetos).
- Filtro de projetos por cliente e por status.
- Ordenação de projetos por prazo, valor ou data de criação.
- Painel de alertas: projetos atrasados, projetos que vencem nos próximos 7 dias, receita prevista (projetos em aberto) e receita recebida (projetos concluídos) — tudo recalculado a cada carregamento.
- Estados de interface claros: vazio (sem clientes/projetos, com ícone), sem resultados de busca/filtro, sucesso e erro de validação. Tentar criar um projeto sem nenhum cliente cadastrado abre um aviso guiando o usuário a cadastrar um cliente primeiro, em vez de bloquear silenciosamente.
- Identidade visual: avatar com iniciais para cada cliente, ícones SVG desenhados via `createElementNS` (sem nenhuma lib de ícones) e cartões de projeto com uma faixa lateral colorida por status, para leitura rápida do painel.
- Instalável como aplicativo (PWA), com funcionamento offline do app shell.

## Tecnologias

- HTML5 semântico
- CSS3 (variáveis nativas, mobile-first, dark mode via `prefers-color-scheme`)
- JavaScript ES6+ (módulos nativos, sem bundler)
- LocalStorage como camada de persistência
- Web App Manifest + Service Worker (PWA)

Nenhuma biblioteca ou framework foi utilizado — decisão deliberada para este projeto ser uma demonstração de fundamentos.

## Conceitos demonstrados

Manipulação de DOM sem frameworks, delegação de eventos, formulários com validação nativa + JavaScript, arquitetura de estado com padrão observador simples, camada de persistência isolada, cálculo de dados derivados (atraso, receita), CSS responsivo mobile-first, acessibilidade (labels, foco, `aria-live`), Service Worker com estratégia cache-first, e organização de código em módulos com responsabilidade única.

## Arquitetura

```
clientflow/
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/icons/
├── css/
│   ├── reset.css        → normalização de estilos do navegador
│   ├── variables.css    → paleta, tipografia, espaçamento (design tokens)
│   ├── base.css         → tipografia global e utilidades de acessibilidade
│   ├── components.css   → cabeçalho, ledger, abas, cards, badges, modal, toast
│   └── responsive.css   → breakpoints mobile-first
└── js/
    ├── utils.js         → funções puras (datas, moeda, id, debounce)
    ├── storage.js       → única camada que toca o LocalStorage
    ├── validation.js    → regras de validação de formulários
    ├── state.js         → estado da aplicação + seletores derivados
    ├── dom.js           → toda criação/atualização de elementos DOM
    ├── events.js        → todos os event listeners
    └── main.js          → ponto de entrada e orquestração
```

Cada arquivo JS tem uma responsabilidade única e depende apenas do que precisa: `dom.js` não sabe nada sobre LocalStorage, `storage.js` não sabe nada sobre a interface. Essa separação está detalhada, arquivo por arquivo, em `GUIA-DE-ESTUDO.md`.

## Como executar

Basta dar duplo clique em `index.html` — a aplicação (cadastro, edição, busca, filtros, painel de alertas) funciona direto, sem instalar nada e sem servidor. Essa foi uma decisão deliberada: o app usa scripts comuns (`<script src="...">`), não módulos ES (`type="module"`), justamente para não depender de um servidor local (ver "Decisões técnicas" abaixo).

Duas partes dependem de HTTP(S) por exigência do próprio navegador (não é uma limitação deste projeto): o Service Worker (funcionamento offline) e a instalação como PWA. Para testar essas duas, sirva os arquivos por HTTP:

```bash
# Opção 1: servidor embutido do Python
python3 -m http.server 8000

# Opção 2: extensão "Live Server" do VS Code
```

Depois, acesse `http://localhost:8000` no navegador.

## Como utilizar

1. Cadastre um cliente na aba **Clientes**.
2. Vá para a aba **Projetos** e cadastre um projeto vinculado a esse cliente.
3. Use a busca, os filtros e a ordenação para navegar pelos projetos.
4. Acompanhe atrasos e receita prevista no painel no topo da página.

## Validações

- Cliente: nome (mín. 2 caracteres), e-mail em formato válido, telefone (mín. 8 caracteres) — todos obrigatórios.
- Projeto: cliente selecionado, título (mín. 3 caracteres), valor numérico maior que zero, data de início e prazo obrigatórios, com o prazo nunca podendo ser anterior à data de início.
- Cada erro é exibido junto ao campo correspondente, sem apagar o que o usuário já preencheu nos demais campos.

## Persistência

Clientes e projetos são salvos em duas chaves do LocalStorage (`clientflow:clientes` e `clientflow:projetos`), como JSON. Toda leitura/escrita passa exclusivamente por `js/storage.js`, que também trata dados ausentes (primeira visita) e dados corrompidos (JSON inválido), sempre retornando uma lista vazia nesses casos em vez de quebrar a aplicação.

## Funcionalidade adicional: painel de alertas de prazo

**Problema que resolve:** sem esse painel, o usuário precisaria abrir projeto por projeto para descobrir quais estão atrasados ou perto do prazo.

**Como funciona:** a cada renderização, `state.js` compara o campo `prazo` de cada projeto com a data atual (nunca salva um campo "atrasado" — isso evitaria que o dado ficasse desatualizado de um dia para o outro) e agrega os totais de receita prevista/recebida.

**Valor agregado:** transforma uma lista de projetos em uma visão gerencial imediata, sem esforço manual do usuário.

**Conceitos técnicos:** comparação de datas em formato ISO (`YYYY-MM-DD`, comparável como string), `reduce` para agregações, seletores derivados que nunca tocam o LocalStorage diretamente.

**Arquivos afetados:** `state.js` (cálculo), `dom.js` (renderização do painel), `css/components.css` (estilo do `.ledger`).

## Responsividade

Mobile-first: o layout base já funciona em telas de 320px, com toolbar e ledger empilhados em colunas. A partir de 768px o ledger vira uma única linha de 4 blocos e os cards ganham alinhamento centralizado; a partir de 1024px o conteúdo ganha mais respiro lateral. Uma media query adicional trata a orientação horizontal em telas baixas (celular deitado), reduzindo espaçamentos verticais.

## PWA

O app pode ser instalado via `manifest.webmanifest` (ícones, cores de tema, modo `standalone`). O botão "Instalar aplicativo" só aparece em navegadores que disparam o evento `beforeinstallprompt` (baseados em Chromium) — em outros navegadores, a instalação segue o fluxo nativo deles (ex.: "Adicionar à Tela de Início" no Safari), sem nenhuma interface falsa simulando isso.

## Funcionamento offline

O Service Worker (`sw.js`) cacheia todo o app shell (HTML, CSS, JS, ícones) na instalação, com estratégia cache-first — como não há nenhuma API externa (os dados vivem no LocalStorage do navegador), a aplicação inteira funciona offline após o primeiro carregamento. As fontes do Google Fonts dependem de rede na primeira visita; se indisponíveis, o CSS já define uma pilha de fallback (`Georgia`/`sans-serif`/`monospace`).

## Acessibilidade

HTML semântico (`header`, `main`, `nav`, `section`, `article`), labels associados a todos os campos, link "pular para o conteúdo", foco visível (`:focus-visible`), fechamento de modal por tecla Esc, `aria-live` na área de notificações (toasts), e uso de `role="list"`/`role="listitem"` nas listas renderizadas dinamicamente.

## Segurança

Todo conteúdo vindo do usuário (nomes, títulos, etc.) é inserido via `textContent`/propriedades DOM, nunca via `innerHTML` — isso elimina o principal vetor de XSS em aplicações que renderizam dados dinamicamente. Os formulários também validam formato e obrigatoriedade antes de qualquer gravação no LocalStorage.

## Decisões técnicas

- **Namespace global (`window.ClientFlow`) em vez de módulos ES (`import`/`export`):** módulos ES só executam em páginas servidas por HTTP/HTTPS — abertos como arquivo local (`file://`), o navegador bloqueia o carregamento por CORS, e a aplicação inteira fica muda (nenhum evento é ligado). Como um dos objetivos do projeto é "algo que alguém baixe e use direto", trocamos por scripts comuns carregados em ordem de dependência, todos publicando suas funções em um único objeto global. A separação em módulos por responsabilidade (`state`, `dom`, `events`...) continua a mesma — só a forma de conectá-los mudou.
- **Sem framework:** o objetivo do projeto era demonstrar domínio de fundamentos (DOM, eventos, estado, persistência) sem a abstração de uma lib cuidar disso.
- **Status "atrasado" calculado, não salvo:** evita que o dado fique desatualizado; é sempre derivado do `prazo` + data atual no momento da renderização.
- **Uma única camada de LocalStorage (`storage.js`):** centraliza serialização/tratamento de erro em vez de espalhar `localStorage.getItem/setItem` pela aplicação.
- **Delegação de eventos nas listas:** como os itens são recriados a cada render, um listener por item vazaria memória; um único listener no container, checando `event.target`, resolve isso.

## Melhorias futuras

- Exportação de dados (backup/restauração em JSON).
- Histórico de mudanças de status por projeto (timeline de atividades).
- Sincronização entre dispositivos (hoje os dados ficam presos ao navegador local).
- Foco preso (focus trap) completo dentro dos modais.

## Aprendizados

Este projeto foi construído para consolidar, na prática: arquitetura de estado sem framework, separação de responsabilidades entre módulos JavaScript, cálculo de dados derivados sem duplicar informação salva, e uma camada de persistência isolada. Os detalhes de cada decisão estão em `GUIA-DE-ESTUDO.md`.

## Autor

Matheus — desenvolvedor freelancer.
