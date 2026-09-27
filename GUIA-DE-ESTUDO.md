# Guia de Estudo — ClientFlow

Este guia explica cada arquivo do projeto pelo ângulo de "por que foi construído assim", não apenas "o que o código faz". A ideia é que você consiga reproduzir cada decisão sozinho em um projeto novo, sem colar o código.

Para cada arquivo: o que ele faz, por que foi criado, por que essa abordagem (e não outra), como funciona por dentro, os conceitos envolvidos, o que você precisa treinar até dominar, e o que vale anotar no seu caderno técnico.

---

## `js/utils.js`

**O que faz:** funções pequenas e puras — geram id, formatam moeda/data, calculam "hoje" em ISO, e um `debounce`.

**Por que foi criado:** essas funções são usadas por `state.js`, `validation.js` e `dom.js`. Sem um lugar central para elas, cada módulo reimplementaria sua própria formatação de moeda — e no dia em que a regra mudar (ex.: trocar de BRL para outra moeda), você teria que caçar cada cópia.

**Por que essa abordagem:** funções puras (mesma entrada → mesma saída, sem efeito colateral) em vez de métodos de uma classe. Não há estado para gerenciar aqui, então uma classe seria complexidade sem benefício.

**Como funciona:**
- `gerarId()` usa `crypto.randomUUID()` quando disponível, com fallback baseado em timestamp + número aleatório — necessário porque `randomUUID` exige contexto seguro (HTTPS ou localhost).
- `formatarMoeda`/`formatarData` usam a API `Intl`, nativa do navegador, em vez de manipular strings manualmente.
- `debounce` atrasa a execução de uma função até que pare de ser chamada por X milissegundos — essencial para a busca não refazer o filtro a cada tecla digitada.

**Conceitos envolvidos:** funções puras, `Intl.NumberFormat`/`Intl.DateTimeFormat`, closures (o `debounce` só funciona porque a função retornada "lembra" da variável `temporizador` entre chamadas), `crypto.randomUUID`.

**O que você precisa conseguir reproduzir sozinho:** escrever um `debounce` do zero, sem consultar. É o tipo de utilitário que aparece em praticamente todo projeto front-end.

**O que vale anotar:** `Intl` resolve 90% dos casos de formatação de data/moeda sem nenhuma biblioteca — vale lembrar disso antes de instalar algo como `date-fns` num projeto pequeno.

---

## `js/storage.js`

**O que faz:** é o único arquivo do projeto que chama `localStorage` diretamente. Expõe `getClientes`, `salvarClientes`, `getProjetos`, `salvarProjetos`.

**Por que foi criado:** para isolar toda a lógica de persistência em um lugar. Se `localStorage` fosse chamado direto de `state.js`, `events.js` e `dom.js`, trocar de estratégia de persistência (ex.: migrar para IndexedDB) significaria caçar cada chamada espalhada pelo projeto.

**Por que essa abordagem:** um objeto simples com 4 funções, em vez de uma classe "Repository" ou um padrão mais elaborado. O projeto tem duas entidades (clientes, projetos) e uma persistência simples (LocalStorage) — um padrão mais pesado seria complexidade artificial aqui.

**Como funciona:**
- `lerLista` faz `JSON.parse` do que está salvo, e trata dois casos de erro: chave inexistente (primeira visita) e JSON corrompido (`try/catch`) — em ambos, retorna `[]` em vez de deixar o erro quebrar a aplicação.
- `salvarLista` faz `JSON.stringify` e captura erros de escrita (ex.: quota do LocalStorage excedida, algo entre 5-10MB dependendo do navegador).

**Conceitos envolvidos:** serialização JSON, `try/catch`, LocalStorage (síncrono, string-only, por origem/domínio), tratamento defensivo de dados externos (mesmo que "externo" aqui seja só o próprio navegador).

**O que você precisa conseguir reproduzir sozinho:** um wrapper de LocalStorage com tratamento de erro — é a base de qualquer app que persiste dados no navegador sem backend.

**O que vale anotar:** LocalStorage só guarda strings — qualquer objeto precisa passar por `JSON.stringify`/`JSON.parse`, e qualquer `parse` de dado que você não controlou 100% deveria estar num `try/catch`.

---

## `js/validation.js`

**O que faz:** duas funções, `validarCliente` e `validarProjeto`, que recebem os dados de um formulário e devolvem `{ valido, erros }`.

**Por que foi criado:** a validação nativa do HTML (`required`, `type="email"`) cobre formato, mas não cobre regras de negócio como "o prazo não pode ser anterior à data de início". Este módulo cobre exatamente o que o HTML sozinho não resolve.

**Por que essa abordagem:** funções que retornam um objeto de erros por campo, em vez de lançar exceção. Isso permite que `dom.js` reconstrua o formulário mostrando o erro ao lado do campo certo, sem um `try/catch` por cima de cada submit.

**Como funciona:** cada função monta um objeto `erros` incrementalmente; no final, `valido` é `true` só se `erros` estiver vazio (`Object.keys(erros).length === 0`).

**Conceitos envolvidos:** expressões regulares (regex do e-mail), comparação de strings ISO de data (`'2026-01-01' < '2026-02-01'` funciona porque o formato `YYYY-MM-DD` é ordenável como texto), separação entre validação de formato (HTML) e de regra de negócio (JS).

**O que você precisa conseguir reproduzir sozinho:** decidir, em qualquer formulário futuro, o que fica no HTML e o que precisa de JS — e escrever essa validação sem copiar deste arquivo.

**O que vale anotar:** datas em formato `YYYY-MM-DD` são comparáveis diretamente como string — não precisa converter para `Date` só para comparar "qual é anterior".

---

## `js/state.js`

**O que faz:** guarda o estado da aplicação em memória (`clientes`, `projetos`, `filtros`, `view`), expõe ações que o modificam (`adicionarCliente`, `atualizarProjeto` etc.) e seletores que derivam dados dele (`getResumo`, `getProjetosFiltrados`).

**Por que foi criado:** é o "cérebro" da aplicação. Sem um módulo de estado central, cada parte da interface teria que ler/escrever o LocalStorage e recalcular filtros por conta própria — duplicando lógica e criando inconsistência (uma tela mostrando dado diferente da outra).

**Por que essa abordagem:** um padrão observador (pub-sub) bem simples — uma lista de funções "ouvintes" chamadas sempre que o estado muda — em vez de uma biblioteca de gerenciamento de estado. Para uma aplicação deste tamanho, uma lib assim seria abstração sem necessidade (a regra do projeto contra complexidade artificial).

**Como funciona:**
1. Toda ação (`adicionarCliente`, `removerProjeto`, ...) muda o objeto `estado`, chama `storage.salvar*` para persistir, e termina chamando `notificar()`.
2. `notificar()` percorre a lista de ouvintes e chama cada um passando o estado atualizado.
3. Em `main.js`, a função `renderizarTudo` é registrada como o único ouvinte — então qualquer mudança de estado dispara uma re-renderização completa da tela.
4. Os seletores (`estaAtrasado`, `getResumo`, `getProjetosFiltrados`) nunca guardam nada — recalculam a partir de `estado.clientes`/`estado.projetos` toda vez que são chamados. Isso é o que garante que "atrasado" nunca fique desatualizado.

**Conceitos envolvidos:** padrão observador/pub-sub, imutabilidade parcial (`estado.clientes = [...estado.clientes, novo]` em vez de `.push`, o que facilita rastrear mudanças), dados derivados vs. dados armazenados, `Array.filter`/`map`/`reduce`/`sort`.

**O que você precisa conseguir reproduzir sozinho:** implementar de memória um padrão observador simples (`inscrever`/`notificar`) — é a ideia por trás de praticamente todo framework reativo (React, Vue), só que sem a mágica por baixo.

**O que vale anotar:** a regra "nunca salvar o que pode ser calculado" (aqui aplicada ao status "atrasado") evita uma classe inteira de bugs de dado desatualizado — vale levar para qualquer projeto futuro.

---

## `js/dom.js`

**O que faz:** todas as funções que criam ou atualizam elementos na tela — dashboard, listas de clientes/projetos, modais de formulário, confirmação de exclusão e toasts.

**Por que foi criado:** para que a criação de elementos DOM não fique espalhada dentro dos handlers de evento. Separar "o que muda na tela" (`dom.js`) de "quando isso deve acontecer" (`events.js`) deixa cada arquivo com um propósito só.

**Por que essa abordagem:** uma pequena função fábrica (`el`) que envolve `document.createElement` + `textContent` + `setAttribute`, em vez de montar strings de HTML com template literals e usar `innerHTML`. Essa escolha é também uma decisão de segurança (ver "Segurança" no README): dado vindo do usuário nunca vira HTML interpretável.

**Como funciona:** cada função de render segue o mesmo padrão — limpa o container (`replaceChildren()`), decide se mostra um estado vazio, e senão monta os elementos com `el(...)` e os anexa. Os modais usam um `<div id="modal-root">` fixo no `index.html`, que `abrirModal`/`fecharModal` preenchem e esvaziam.

**Conceitos envolvidos:** `createElement`/`textContent`/`classList`/`setAttribute` vs. `innerHTML`, delegação de responsabilidade dentro de um único módulo, gerenciamento manual de foco (`elementoAnteriorAoFoco`) para acessibilidade de modal.

**O que você precisa conseguir reproduzir sozinho:** montar uma lista dinâmica na tela usando só `createElement`/`appendChild`, sem `innerHTML` e sem nenhuma lib.

**O que vale anotar:** `element.replaceChildren()` é a forma moderna e mais legível de "limpar e recriar os filhos de um elemento" — substitui o antigo `while (el.firstChild) el.removeChild(el.firstChild)`.

---

## `js/events.js`

**O que faz:** liga todos os `addEventListener` da aplicação — abas, busca, filtros, abrir/fechar modal, submit de formulário, ações de editar/excluir nas listas, e o fluxo de instalação do PWA.

**Por que foi criado:** para que `main.js` fique enxuto (só orquestra a ordem de inicialização) e para que toda a "fiação" de eventos esteja em um único lugar, fácil de auditar.

**Por que essa abordagem:** delegação de eventos nas listas (`lista-clientes`/`lista-projetos`) — um único listener no container, que verifica `evento.target.closest('button[data-acao]')` — em vez de um listener por botão de cada card. Como os cards são recriados a cada render (ver `dom.js`), um listener por item precisaria ser reanexado toda hora, o que é mais código e mais chance de vazamento de memória.

**Como funciona:** cada handler segue o mesmo fluxo — lê o valor do evento, opcionalmente valida (`validarCliente`/`validarProjeto`), chama a ação correspondente em `state.js`, e fecha o modal / mostra um toast quando aplicável. A re-renderização em si nunca é chamada diretamente daqui — ela acontece pelo `notificar()` dentro de `state.js`.

**Conceitos envolvidos:** delegação de eventos (`event.target.closest(...)`), eventos `input` vs. `change` vs. `submit` vs. `click` (cada um escolhido pelo momento certo: `input` para busca em tempo real, `change` para selects, `submit` para formulário, `click` para botões), `FormData` + `Object.fromEntries` para ler todos os campos de um form de uma vez, `beforeinstallprompt` para instalação de PWA.

**O que você precisa conseguir reproduzir sozinho:** implementar delegação de eventos numa lista dinâmica sem olhar este arquivo — é uma das perguntas mais comuns em entrevista técnica de front-end.

**O que vale anotar:** `new FormData(form)` + `Object.fromEntries(...)` lê todos os campos de um formulário em uma linha, incluindo `<select>` e campos escondidos — evita escrever `document.getElementById(...).value` campo por campo.

---

## `js/main.js`

**O que faz:** o ponto de entrada. Registra `renderizarTudo` como ouvinte do estado, chama `estado.iniciar()` (carrega do LocalStorage), liga os eventos, e registra o Service Worker.

**Por que foi criado:** todo projeto precisa de um lugar único que define "a ordem em que as coisas acontecem ao carregar a página". Sem isso, a ordem de inicialização ficaria implícita e frágil.

**Por que essa abordagem:** este arquivo não contém nenhuma regra de negócio — só orquestra chamadas a outros módulos. Isso é deliberado: se você precisar entender "o que a aplicação faz ao abrir", este é o único arquivo que você precisa ler primeiro.

**Como funciona:** o listener `DOMContentLoaded` garante que o HTML já existe antes de qualquer `document.getElementById` ser chamado. `renderizarTudo` é a função que efetivamente sabe "quais partes da tela existem e como atualizá-las" — ela reconstrói o `<select>` de filtro por cliente preservando a opção selecionada, para o filtro não "resetar" a cada mudança de estado.

**Conceitos envolvidos:** evento `DOMContentLoaded`, padrão de "composição raiz" (um único lugar que conecta todas as peças), registro de Service Worker (`navigator.serviceWorker.register`).

**O que você precisa conseguir reproduzir sozinho:** explicar, em uma entrevista, por que este arquivo é deliberadamente "burro" (sem lógica de negócio) — é uma decisão de arquitetura, não uma limitação.

**O que vale anotar:** preservar o valor de um `<select>` ao reconstruir suas `<option>` (`const valorAtual = select.value` antes, `select.value = valorAtual` depois) é um padrão pequeno, mas que evita um bug de UX chato de depurar.

---

## CSS (`css/*.css`)

**O que faz:** `reset.css` normaliza estilos padrão do navegador; `variables.css` define a paleta/tipografia/espaçamento como custom properties; `base.css` cobre tipografia global e utilidades de acessibilidade; `components.css` estiliza cada peça de UI; `responsive.css` ajusta o layout a partir de 768px e 1024px.

**Por que essa abordagem:** design tokens (`--color-*`, `--space-*`, `--fs-*`) em vez de valores soltos espalhados pelo CSS — trocar a cor de acento do projeto inteiro é uma mudança em uma linha de `variables.css`, não uma busca-e-substitui por todo o CSS. O suporte a tema escuro (`prefers-color-scheme: dark`) reaproveita os mesmos nomes de variável, então nenhum outro arquivo CSS precisa saber que o tema escuro existe.

**Conceitos envolvidos:** CSS custom properties (variáveis nativas), mobile-first (o CSS "sem media query" já cobre celular; media queries com `min-width` só adicionam o que telas maiores precisam), `prefers-color-scheme` para tema escuro automático.

**O que vale anotar:** a paleta foi escolhida deliberadamente para fugir do azul/roxo genérico de dashboard SaaS — um tom "livro-caixa" (tinta + latão) que conversa com o domínio (gestão financeira de projetos). Vale ter esse tipo de raciocínio pronto para justificar escolhas visuais em entrevista.

---

## PWA (`manifest.webmanifest` + `sw.js`)

Já documentado em detalhe nas seções **PWA** e **Funcionamento offline** do `README.md` — vale a leitura de lá para a explicação de "o que fica disponível offline" e "por que cache-first".
