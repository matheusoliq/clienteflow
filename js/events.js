// Toda a "fiação" de eventos da aplicação fica centralizada aqui.
// Cada função de state.js já dispara notificar() sozinha, então os
// handlers abaixo só precisam: ler o input do usuário, validar quando
// necessário, chamar a ação de estado correta e (quando aplicável)
// dar feedback visual. A re-renderização acontece automaticamente
// via inscrever() em main.js.
window.ClientFlow = window.ClientFlow || {};

window.ClientFlow.events = (function () {
  const estadoModulo = window.ClientFlow.state;
  const dom = window.ClientFlow.dom;
  const { validarCliente, validarProjeto } = window.ClientFlow.validation;
  const { debounce } = window.ClientFlow.utils;

  function ligarEventos() {
    const modalRoot = document.getElementById('modal-root');
    const toastRoot = document.getElementById('toast-root');
    let idParaExcluir = null;
    let tipoParaExcluir = null;

    function irParaAba(view) {
      document.querySelectorAll('.tabs__btn').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
      document.querySelectorAll('.view').forEach((secao) => {
        secao.hidden = secao.dataset.viewPanel !== view;
      });
      estadoModulo.definirView(view);
    }

    // --- Navegação por abas -------------------------------------------------
    document.querySelectorAll('.tabs__btn').forEach((botao) => {
      botao.addEventListener('click', () => irParaAba(botao.dataset.view));
    });

    // --- Busca e filtros (eventos "input"/"change": refletem a digitação
    // e a escolha em tempo real, sem precisar de um botão "aplicar") ---------
    document.getElementById('busca-clientes').addEventListener(
      'input',
      debounce((evento) => estadoModulo.atualizarFiltros({ buscaClientes: evento.target.value }), 250)
    );
    document.getElementById('busca-projetos').addEventListener(
      'input',
      debounce((evento) => estadoModulo.atualizarFiltros({ buscaProjetos: evento.target.value }), 250)
    );
    document.getElementById('filtro-cliente').addEventListener('change', (evento) =>
      estadoModulo.atualizarFiltros({ clienteId: evento.target.value })
    );
    document.getElementById('filtro-status').addEventListener('change', (evento) =>
      estadoModulo.atualizarFiltros({ status: evento.target.value })
    );
    document.getElementById('ordenar-projetos').addEventListener('change', (evento) =>
      estadoModulo.atualizarFiltros({ ordenar: evento.target.value })
    );

    // --- Abrir modais de criação --------------------------------------------
    document.getElementById('btn-novo-cliente').addEventListener('click', () => {
      dom.abrirModal(modalRoot, dom.formularioCliente());
    });

    document.getElementById('btn-novo-projeto').addEventListener('click', () => {
      const { clientes } = estadoModulo.getEstado();
      if (clientes.length === 0) {
        // Em vez de só um toast (fácil de não perceber), mostramos um
        // modal explicando o motivo e oferecendo o próximo passo direto.
        dom.abrirModal(
          modalRoot,
          dom.avisoSemClientes(() => {
            dom.fecharModal(modalRoot);
            irParaAba('clientes');
            dom.abrirModal(modalRoot, dom.formularioCliente());
          })
        );
        return;
      }
      dom.abrirModal(modalRoot, dom.formularioProjeto(clientes));
    });

    // --- Fechar modal: clique no backdrop, botão "Cancelar" ou tecla Esc ----
    modalRoot.addEventListener('click', (evento) => {
      if (evento.target.dataset.fecharModal) dom.fecharModal(modalRoot);
    });
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && modalRoot.getAttribute('aria-hidden') === 'false') {
        dom.fecharModal(modalRoot);
      }
    });

    // --- Delegação de eventos nas listas (editar/excluir) -------------------
    // Delegado no container em vez de um listener por item: os itens são
    // recriados a cada render, então um listener por botão vazaria memória
    // e teria que ser reanexado toda hora. Um único listener no pai, checando
    // o alvo do clique, resolve isso de forma mais simples.
    document.getElementById('lista-clientes').addEventListener('click', (evento) => tratarAcaoDaLista(evento, 'cliente'));
    document.getElementById('lista-projetos').addEventListener('click', (evento) => tratarAcaoDaLista(evento, 'projeto'));

    function tratarAcaoDaLista(evento, tipo) {
      const botao = evento.target.closest('button[data-acao]');
      if (!botao) return;
      const { acao, id } = botao.dataset;

      if (acao === `editar-${tipo}`) {
        if (tipo === 'cliente') {
          dom.abrirModal(modalRoot, dom.formularioCliente(estadoModulo.getClientePorId(id)));
        } else {
          const projeto = estadoModulo.getEstado().projetos.find((p) => p.id === id);
          dom.abrirModal(modalRoot, dom.formularioProjeto(estadoModulo.getEstado().clientes, projeto));
        }
        return;
      }

      if (acao === `excluir-${tipo}`) {
        idParaExcluir = id;
        tipoParaExcluir = tipo;
        const mensagem =
          tipo === 'cliente'
            ? 'Excluir este cliente também remove todos os projetos vinculados a ele. Deseja continuar?'
            : 'Tem certeza que deseja excluir este projeto?';
        dom.abrirModal(modalRoot, dom.confirmacao(mensagem));
        document.getElementById('btn-confirmar-exclusao').addEventListener('click', () => {
          if (tipoParaExcluir === 'cliente') estadoModulo.removerCliente(idParaExcluir);
          else estadoModulo.removerProjeto(idParaExcluir);
          dom.fecharModal(modalRoot);
          dom.mostrarToast(toastRoot, 'Excluído com sucesso.');
        });
      }
    }

    // --- Envio de formulários (delegado no modalRoot, pois os forms são
    // recriados a cada abertura de modal) ------------------------------------
    modalRoot.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const form = evento.target;
      const dados = Object.fromEntries(new FormData(form).entries());

      if (form.id === 'form-cliente') {
        const { valido, erros } = validarCliente(dados);
        if (!valido) {
          dom.abrirModal(modalRoot, dom.formularioCliente(dados, erros));
          return;
        }
        if (dados.registroId) estadoModulo.atualizarCliente(dados.registroId, dados);
        else estadoModulo.adicionarCliente(dados);
        dom.fecharModal(modalRoot);
        dom.mostrarToast(toastRoot, 'Cliente salvo com sucesso.');
      }

      if (form.id === 'form-projeto') {
        const { valido, erros } = validarProjeto(dados);
        if (!valido) {
          dom.abrirModal(modalRoot, dom.formularioProjeto(estadoModulo.getEstado().clientes, dados, erros));
          return;
        }
        if (dados.registroId) estadoModulo.atualizarProjeto(dados.registroId, dados);
        else estadoModulo.adicionarProjeto(dados);
        dom.fecharModal(modalRoot);
        dom.mostrarToast(toastRoot, 'Projeto salvo com sucesso.');
      }
    });

    // --- Instalação como PWA -------------------------------------------------
    // O evento "beforeinstallprompt" só existe em navegadores baseados em
    // Chromium; em outros (Firefox, Safari), o botão simplesmente nunca
    // aparece — não simulamos instalação onde o navegador não suporta.
    let promptDeInstalacao = null;
    const botaoInstalar = document.getElementById('btn-instalar');
    window.addEventListener('beforeinstallprompt', (evento) => {
      evento.preventDefault();
      promptDeInstalacao = evento;
      botaoInstalar.hidden = false;
    });
    botaoInstalar.addEventListener('click', async () => {
      if (!promptDeInstalacao) return;
      promptDeInstalacao.prompt();
      await promptDeInstalacao.userChoice;
      promptDeInstalacao = null;
      botaoInstalar.hidden = true;
    });
    window.addEventListener('appinstalled', () => {
      botaoInstalar.hidden = true;
    });
  }

  return { ligarEventos };
})();
