// Ponto de entrada. Responsabilidade única: orquestrar a ordem de
// inicialização — nenhuma lógica de negócio mora aqui.
window.ClientFlow = window.ClientFlow || {};

(function () {
  const estado = window.ClientFlow.state;
  const dom = window.ClientFlow.dom;
  const { ligarEventos } = window.ClientFlow.events;

  function renderizarTudo(estadoAtual) {
    dom.renderDashboard(document.getElementById('dashboard'), estado.getResumo());
    dom.renderClientes(document.getElementById('lista-clientes'), estado.getClientesFiltrados());
    dom.renderProjetos(document.getElementById('lista-projetos'), estado.getProjetosFiltrados());

    const totalClientes = estadoAtual.clientes.length;
    const totalProjetos = estadoAtual.projetos.length;
    const projetosVisiveis = estado.getProjetosFiltrados().length;
    document.getElementById('contagem-clientes').textContent =
      totalClientes === 1 ? '1 cliente' : `${totalClientes} clientes`;
    document.getElementById('contagem-projetos').textContent =
      projetosVisiveis === totalProjetos
        ? (totalProjetos === 1 ? '1 projeto' : `${totalProjetos} projetos`)
        : `${projetosVisiveis} de ${totalProjetos} projetos`;

    // O <select> de filtro por cliente depende da lista de clientes, então
    // precisa ser reconstruído sempre que o estado mudar — mas preservando
    // a opção atualmente selecionada, para não "resetar" o filtro do usuário
    // a cada render.
    const selectClientes = document.getElementById('filtro-cliente');
    const valorSelecionado = selectClientes.value;
    selectClientes.replaceChildren(new Option('Todos os clientes', ''));
    estadoAtual.clientes.forEach((cliente) => selectClientes.appendChild(new Option(cliente.nome, cliente.id)));
    selectClientes.value = valorSelecionado;
  }

  document.addEventListener('DOMContentLoaded', () => {
    estado.inscrever(renderizarTudo);
    estado.iniciar();
    ligarEventos();

    // Service Worker exige HTTP(S) — se o app foi aberto como arquivo local
    // (file://) ou o navegador não suporta, isso falha silenciosamente sem
    // afetar o restante da aplicação (CRUD, busca, filtros continuam OK).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((erro) => {
        console.warn('[main] Service worker não registrado (normal se aberto via file://).', erro);
      });
    }
  });
})();
