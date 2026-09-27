// Gerenciamento de estado em memória, com persistência via storage.js.
//
// Padrão usado: um objeto de estado privado + uma lista de "ouvintes".
// Toda função que muda dados (adicionarCliente, atualizarProjeto etc.)
// termina chamando notificar(), que avisa todo mundo inscrito para
// re-renderizar. É a versão mais simples possível do padrão
// observer/pub-sub — não precisamos de uma lib de estado para uma
// aplicação deste tamanho.
window.ClientFlow = window.ClientFlow || {};

window.ClientFlow.state = (function () {
  const { storage } = window.ClientFlow;
  const { gerarId, hojeISO } = window.ClientFlow.utils;

  const STATUS_ATIVOS = ['orcado', 'em_andamento'];

  let estado = {
    clientes: [],
    projetos: [],
    filtros: {
      buscaClientes: '',
      buscaProjetos: '',
      clienteId: '',
      status: '',
      ordenar: 'prazo',
    },
    view: 'clientes',
  };

  const ouvintes = [];

  function inscrever(fn) {
    ouvintes.push(fn);
  }

  function notificar() {
    ouvintes.forEach((fn) => fn(estado));
  }

  function iniciar() {
    estado.clientes = storage.getClientes();
    estado.projetos = storage.getProjetos();
    notificar();
  }

  function getEstado() {
    return estado;
  }

  // --- Clientes ---------------------------------------------------------

  function adicionarCliente(dados) {
    // Descartamos id/criadoEm vindos do formulário (o campo id existe
    // porque o mesmo form serve para criar E editar) para não deixar um
    // valor vazio sobrescrever o id gerado aqui.
    const { id, criadoEm, ...resto } = dados;
    const cliente = { id: gerarId(), criadoEm: hojeISO(), ...resto };
    estado.clientes = [...estado.clientes, cliente];
    storage.salvarClientes(estado.clientes);
    notificar();
    return cliente;
  }

  function atualizarCliente(id, dados) {
    estado.clientes = estado.clientes.map((cliente) =>
      cliente.id === id ? { ...cliente, ...dados } : cliente
    );
    storage.salvarClientes(estado.clientes);
    notificar();
  }

  function removerCliente(id) {
    // Exclusão em cascata: um projeto sem cliente não faz sentido no
    // domínio da aplicação, e deixá-lo "órfão" geraria erros de renderização.
    estado.clientes = estado.clientes.filter((cliente) => cliente.id !== id);
    estado.projetos = estado.projetos.filter((projeto) => projeto.clienteId !== id);
    storage.salvarClientes(estado.clientes);
    storage.salvarProjetos(estado.projetos);
    notificar();
  }

  function getClientePorId(id) {
    return estado.clientes.find((cliente) => cliente.id === id) || null;
  }

  // --- Projetos -----------------------------------------------------------

  function adicionarProjeto(dados) {
    const { id, criadoEm, dataConclusao, ...resto } = dados;
    const projeto = {
      id: gerarId(),
      criadoEm: hojeISO(),
      dataConclusao: null,
      ...resto,
      valor: Number(resto.valor),
    };
    estado.projetos = [...estado.projetos, projeto];
    storage.salvarProjetos(estado.projetos);
    notificar();
    return projeto;
  }

  function atualizarProjeto(id, dados) {
    estado.projetos = estado.projetos.map((projeto) => {
      if (projeto.id !== id) return projeto;
      const atualizado = { ...projeto, ...dados };
      if (dados.valor !== undefined) atualizado.valor = Number(dados.valor);
      // Regra de negócio: a data de conclusão é derivada do status, não
      // um campo que o usuário preenche manualmente.
      if (dados.status === 'concluido' && projeto.status !== 'concluido') {
        atualizado.dataConclusao = hojeISO();
      }
      if (dados.status && dados.status !== 'concluido') {
        atualizado.dataConclusao = null;
      }
      return atualizado;
    });
    storage.salvarProjetos(estado.projetos);
    notificar();
  }

  function removerProjeto(id) {
    estado.projetos = estado.projetos.filter((projeto) => projeto.id !== id);
    storage.salvarProjetos(estado.projetos);
    notificar();
  }

  // --- Navegação e filtros -------------------------------------------------

  function definirView(view) {
    estado.view = view;
    notificar();
  }

  function atualizarFiltros(parciais) {
    estado.filtros = { ...estado.filtros, ...parciais };
    notificar();
  }

  // --- Seletores derivados (calculados, nunca guardados) -------------------

  // "Atrasado" nunca é salvo no LocalStorage: é sempre calculado comparando
  // o prazo salvo com a data de hoje. Guardar isso como campo geraria dados
  // desatualizados assim que o dia virasse.
  function estaAtrasado(projeto) {
    return projeto.status === 'em_andamento' && projeto.prazo < hojeISO();
  }

  function venceEmBreve(projeto, dias = 7) {
    if (projeto.status !== 'em_andamento') return false;
    const hoje = hojeISO();
    const limite = new Date();
    limite.setDate(limite.getDate() + dias);
    const limiteISO = limite.toISOString().slice(0, 10);
    return projeto.prazo >= hoje && projeto.prazo <= limiteISO;
  }

  function getProjetosFiltrados() {
    const { buscaProjetos, clienteId, status, ordenar } = estado.filtros;

    const lista = estado.projetos.filter((projeto) => {
      const cliente = getClientePorId(projeto.clienteId);
      const alvoBusca = `${projeto.titulo} ${cliente?.nome || ''}`.toLowerCase();
      const combinaBusca = !buscaProjetos || alvoBusca.includes(buscaProjetos.toLowerCase());
      const combinaCliente = !clienteId || projeto.clienteId === clienteId;
      const combinaStatus = !status || projeto.status === status;
      return combinaBusca && combinaCliente && combinaStatus;
    });

    const comparadores = {
      prazo: (a, b) => a.prazo.localeCompare(b.prazo),
      valor: (a, b) => b.valor - a.valor,
      criadoEm: (a, b) => b.criadoEm.localeCompare(a.criadoEm),
    };

    return [...lista].sort(comparadores[ordenar] || comparadores.prazo);
  }

  function getClientesFiltrados() {
    const { buscaClientes } = estado.filtros;
    if (!buscaClientes) return estado.clientes;
    const alvo = buscaClientes.toLowerCase();
    return estado.clientes.filter((cliente) =>
      `${cliente.nome} ${cliente.empresa || ''}`.toLowerCase().includes(alvo)
    );
  }

  // Alimenta o painel de alertas (a funcionalidade adicional do projeto):
  // nenhum destes números fica salvo — são recalculados a cada render a
  // partir de clientes/projetos, então nunca ficam desatualizados.
  function getResumo() {
    const atrasados = estado.projetos.filter(estaAtrasado);
    const proximosDoPrazo = estado.projetos.filter((projeto) => venceEmBreve(projeto));
    const previstos = estado.projetos.filter((projeto) => STATUS_ATIVOS.includes(projeto.status));
    const recebidos = estado.projetos.filter((projeto) => projeto.status === 'concluido');

    return {
      totalClientes: estado.clientes.length,
      atrasados: atrasados.length,
      venceBreve: proximosDoPrazo.length,
      receitaPrevista: previstos.reduce((soma, projeto) => soma + projeto.valor, 0),
      receitaRecebida: recebidos.reduce((soma, projeto) => soma + projeto.valor, 0),
    };
  }

  return {
    inscrever,
    iniciar,
    getEstado,
    adicionarCliente,
    atualizarCliente,
    removerCliente,
    getClientePorId,
    adicionarProjeto,
    atualizarProjeto,
    removerProjeto,
    definirView,
    atualizarFiltros,
    estaAtrasado,
    venceEmBreve,
    getProjetosFiltrados,
    getClientesFiltrados,
    getResumo,
  };
})();
