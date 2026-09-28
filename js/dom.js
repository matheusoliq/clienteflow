// Único módulo que cria elementos DOM diretamente. Centralizar aqui evita
// manipulação de DOM espalhada por toda a aplicação e deixa claro, ao ler
// este arquivo, exatamente como cada parte da tela é montada.
//
// Regra de segurança: nomes de clientes/projetos vêm do próprio usuário,
// então usamos textContent (nunca innerHTML) para inserir esse conteúdo —
// isso impede que um texto digitado seja interpretado como HTML/script.
// Os ícones abaixo são construídos com createElementNS (SVG), pelo mesmo
// motivo: nenhum innerHTML em lugar nenhum do app.
window.ClientFlow = window.ClientFlow || {};

window.ClientFlow.dom = (function () {
  const { formatarMoeda, formatarData } = window.ClientFlow.utils;
  const { estaAtrasado, getClientePorId, diasParaPrazo, getProjetosDoCliente } = window.ClientFlow.state;

  const STATUS_LABELS = {
    orcado: 'Orçado',
    em_andamento: 'Em andamento',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  };

  // Pequena fábrica de elementos HTML: evita repetir createElement +
  // className + textContent + setAttribute em cada função de render abaixo.
  function el(tag, props = {}, filhos = []) {
    const elemento = document.createElement(tag);
    Object.entries(props).forEach(([chave, valor]) => {
      if (valor === undefined || valor === null) return;
      if (chave === 'class') {
        elemento.className = valor;
      } else if (chave === 'texto') {
        elemento.textContent = valor;
      } else if (chave === 'for' || chave === 'role' || chave.startsWith('aria-') || chave.startsWith('data-')) {
        elemento.setAttribute(chave, valor);
      } else {
        elemento[chave] = valor;
      }
    });
    filhos.forEach((filho) => elemento.appendChild(filho));
    return elemento;
  }

  // --- Ícones (SVG construído via DOM, sem innerHTML) ----------------------

  const NS_SVG = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs = {}) {
    const elemento = document.createElementNS(NS_SVG, tag);
    Object.entries(attrs).forEach(([chave, valor]) => elemento.setAttribute(chave, valor));
    return elemento;
  }

  const TRACADOS_ICONES = {
    mais: () => [svgEl('line', { x1: 12, y1: 5, x2: 12, y2: 19 }), svgEl('line', { x1: 5, y1: 12, x2: 19, y2: 12 })],
    editar: () => [
      svgEl('polygon', { points: '3,17 3,21 7,21 18,10 14,6' }),
      svgEl('line', { x1: 14, y1: 6, x2: 18, y2: 10 }),
    ],
    excluir: () => [
      svgEl('polyline', { points: '4,7 20,7' }),
      svgEl('path', { d: 'M6 7v13a1 1 0 001 1h10a1 1 0 001-1V7' }),
      svgEl('path', { d: 'M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3' }),
      svgEl('line', { x1: 10, y1: 11, x2: 10, y2: 17 }),
      svgEl('line', { x1: 14, y1: 11, x2: 14, y2: 17 }),
    ],
    alerta: () => [
      svgEl('path', { d: 'M12 3 2 20h20L12 3z' }),
      svgEl('line', { x1: 12, y1: 9, x2: 12, y2: 14 }),
      svgEl('circle', { cx: 12, cy: 17, r: 0.6, fill: 'currentColor', stroke: 'none' }),
    ],
    calendario: () => [
      svgEl('rect', { x: 3, y: 5, width: 18, height: 16, rx: 2 }),
      svgEl('line', { x1: 3, y1: 10, x2: 21, y2: 10 }),
      svgEl('line', { x1: 8, y1: 3, x2: 8, y2: 7 }),
      svgEl('line', { x1: 16, y1: 3, x2: 16, y2: 7 }),
    ],
    cifrao: () => [
      svgEl('circle', { cx: 12, cy: 12, r: 9 }),
      svgEl('path', { d: 'M9 15c0 1.4 1.4 2 3 2s3-.6 3-2-1.4-2-3-2-3-.6-3-2 1.4-2 3-2 3 .6 3 2' }),
      svgEl('line', { x1: 12, y1: 6, x2: 12, y2: 8 }),
      svgEl('line', { x1: 12, y1: 16, x2: 12, y2: 18 }),
    ],
    check: () => [svgEl('circle', { cx: 12, cy: 12, r: 9 }), svgEl('polyline', { points: '8,12 11,15 16,9' })],
    vazio: () => [
      svgEl('path', { d: 'M3 8l2.5-4h13L21 8' }),
      svgEl('path', { d: 'M3 8v11a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19V8' }),
      svgEl('path', { d: 'M3 8h18' }),
      svgEl('path', { d: 'M9 12h6' }),
    ],
  };

  function icone(nome, classeExtra = '') {
    const svg = svgEl('svg', {
      viewBox: '0 0 24 24',
      class: `icon ${classeExtra}`.trim(),
      'aria-hidden': 'true',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    (TRACADOS_ICONES[nome] || TRACADOS_ICONES.mais)().forEach((filho) => svg.appendChild(filho));
    return svg;
  }

  function botaoComIcone(nomeIcone, texto, props = {}) {
    return el('button', { type: 'button', ...props }, [icone(nomeIcone), el('span', { texto })]);
  }

  function iniciais(nome = '') {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  // --- Dashboard (painel de alertas) --------------------------------------

  function renderDashboard(container, resumo) {
    container.replaceChildren();
    const blocos = [
      { rotulo: 'Atrasados', valor: resumo.atrasados, tom: resumo.atrasados > 0 ? 'danger' : 'neutro', icone: 'alerta' },
      { rotulo: 'Vencem em 7 dias', valor: resumo.venceBreve, tom: resumo.venceBreve > 0 ? 'alerta' : 'neutro', icone: 'calendario' },
      { rotulo: 'Receita prevista', valor: formatarMoeda(resumo.receitaPrevista), tom: 'neutro', icone: 'cifrao' },
      { rotulo: 'Recebido', valor: formatarMoeda(resumo.receitaRecebida), tom: 'sucesso', icone: 'check' },
    ];
    blocos.forEach((bloco) => {
      container.appendChild(
        el('div', { class: `ledger__item ledger__item--${bloco.tom}` }, [
          icone(bloco.icone, 'ledger__icon'),
          el('div', {}, [
            el('span', { class: 'ledger__valor', texto: String(bloco.valor) }),
            el('span', { class: 'ledger__rotulo', texto: bloco.rotulo }),
          ]),
        ])
      );
    });
  }

  // --- Listas ---------------------------------------------------------------

  function renderClientes(container, clientes) {
    container.replaceChildren();
    if (clientes.length === 0) {
      container.appendChild(
        el('div', { class: 'empty-state' }, [
          icone('vazio', 'empty-state__icon'),
          el('p', { texto: 'Nenhum cliente cadastrado ainda. Adicione o primeiro para começar.' }),
        ])
      );
      return;
    }
    clientes.forEach((cliente) => {
      const meta = [cliente.empresa, cliente.email, cliente.telefone].filter(Boolean).join(' · ');
      const projetosDoCliente = getProjetosDoCliente(cliente.id);
      const totalValor = projetosDoCliente.reduce((soma, p) => soma + p.valor, 0);
      const resumoProjetos =
        projetosDoCliente.length === 0
          ? 'Nenhum projeto'
          : `${projetosDoCliente.length} ${projetosDoCliente.length === 1 ? 'projeto' : 'projetos'} · ${formatarMoeda(totalValor)}`;
      container.appendChild(
        el('article', { class: 'card', role: 'listitem' }, [
          el('div', { class: 'card__linha' }, [
            el('span', { class: 'avatar', texto: iniciais(cliente.nome), 'aria-hidden': 'true' }),
            el('div', {}, [
              el('p', { class: 'card__titulo', texto: cliente.nome }),
              el('p', { class: 'card__meta', texto: meta }),
              el('p', { class: 'card__chip', texto: resumoProjetos }),
            ]),
          ]),
          el('div', { class: 'card__acoes' }, [
            botaoComIcone('editar', 'Editar', { class: 'btn btn-secondary btn-sm', 'data-acao': 'editar-cliente', 'data-id': cliente.id }),
            botaoComIcone('excluir', 'Excluir', { class: 'btn btn-danger btn-sm', 'data-acao': 'excluir-cliente', 'data-id': cliente.id }),
          ]),
        ])
      );
    });
  }

  function renderProjetos(container, projetos) {
    container.replaceChildren();
    if (projetos.length === 0) {
      container.appendChild(
        el('div', { class: 'empty-state' }, [
          icone('vazio', 'empty-state__icon'),
          el('p', { texto: 'Nenhum projeto encontrado com os filtros atuais.' }),
        ])
      );
      return;
    }
    projetos.forEach((projeto) => {
      const cliente = getClientePorId(projeto.clienteId);
      const atrasado = estaAtrasado(projeto);
      const tom = atrasado ? 'danger' : projeto.status;
      const rotuloBadge = atrasado ? 'Atrasado' : STATUS_LABELS[projeto.status];
      const meta = `${cliente?.nome || 'Cliente removido'} · ${formatarMoeda(projeto.valor)}`;
      const periodo = `${formatarData(projeto.dataInicio)} → ${formatarData(projeto.prazo)}`;
      let dica = '';
      let tomDica = '';
      if (projeto.status === 'concluido') {
        dica = projeto.dataConclusao ? `Concluído em ${formatarData(projeto.dataConclusao)}` : 'Concluído';
        tomDica = 'sucesso';
      } else if (projeto.status === 'em_andamento') {
        const dias = diasParaPrazo(projeto);
        if (dias < 0) {
          dica = `${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'} de atraso`;
          tomDica = 'danger';
        } else if (dias === 0) {
          dica = 'Vence hoje';
          tomDica = 'alerta';
        } else {
          dica = `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
          tomDica = dias <= 7 ? 'alerta' : '';
        }
      }

      container.appendChild(
        el('article', { class: `card card--${tom}`, role: 'listitem' }, [
          el('div', {}, [
            el('div', { class: 'card__cabecalho' }, [
              el('p', { class: 'card__titulo', texto: projeto.titulo }),
              el('span', { class: `badge badge--${tom}`, texto: rotuloBadge }),
            ]),
            el('p', { class: 'card__meta', texto: meta }),
            el('p', { class: 'card__meta card__periodo' }, [
              el('span', { texto: periodo }),
              dica ? el('span', { class: `dica dica--${tomDica || 'neutro'}`, texto: dica }) : document.createTextNode(''),
            ]),
          ]),
          el('div', { class: 'card__acoes' }, [
            botaoComIcone('editar', 'Editar', { class: 'btn btn-secondary btn-sm', 'data-acao': 'editar-projeto', 'data-id': projeto.id }),
            botaoComIcone('excluir', 'Excluir', { class: 'btn btn-danger btn-sm', 'data-acao': 'excluir-projeto', 'data-id': projeto.id }),
          ]),
        ])
      );
    });
  }

  // --- Modal genérico ---------------------------------------------------------

  let elementoAnteriorAoFoco = null;

  function abrirModal(raiz, conteudo) {
    elementoAnteriorAoFoco = document.activeElement;
    raiz.replaceChildren();
    const modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [conteudo]);
    const backdrop = el('div', { class: 'modal-backdrop', 'data-fechar-modal': 'true' }, [modal]);
    raiz.appendChild(backdrop);
    raiz.setAttribute('aria-hidden', 'false');
    modal.querySelector('input, select, textarea, button')?.focus();
  }

  function fecharModal(raiz) {
    raiz.replaceChildren();
    raiz.setAttribute('aria-hidden', 'true');
    elementoAnteriorAoFoco?.focus();
  }

  function campoFormulario({ id, rotulo, tipo = 'text', valor, erro, extraProps = {} }) {
    const grupo = el('div', { class: 'field' }, [
      el('label', { for: id, texto: rotulo }),
      el('input', { id, name: id, type: tipo, value: valor, class: 'input', ...extraProps }),
    ]);
    if (erro) grupo.appendChild(el('p', { class: 'field__erro', texto: erro }));
    return grupo;
  }

  function formularioCliente(cliente = {}, erros = {}) {
    return el('form', { id: 'form-cliente', noValidate: true }, [
      el('h2', { class: 'modal__titulo', texto: cliente.id ? 'Editar cliente' : 'Novo cliente' }),
      campoFormulario({ id: 'nome', rotulo: 'Nome', valor: cliente.nome, erro: erros.nome, extraProps: { required: true } }),
      campoFormulario({ id: 'empresa', rotulo: 'Empresa (opcional)', valor: cliente.empresa }),
      campoFormulario({ id: 'email', rotulo: 'E-mail', tipo: 'email', valor: cliente.email, erro: erros.email, extraProps: { required: true } }),
      campoFormulario({ id: 'telefone', rotulo: 'Telefone', valor: cliente.telefone, erro: erros.telefone, extraProps: { required: true } }),
      // O campo escondido NÃO pode se chamar "id": um <input name="id"> dentro
      // de um <form> sequestra a própria propriedade form.id (o navegador expõe
      // form controls nomeados como propriedades do form) — form.id passaria a
      // apontar para este <input>, não para a string do atributo id do form.
      el('input', { type: 'hidden', name: 'registroId', value: cliente.id || '' }),
      el('div', { class: 'modal__acoes' }, [
        el('button', { type: 'button', class: 'btn btn-ghost', 'data-fechar-modal': 'true', texto: 'Cancelar' }),
        el('button', { type: 'submit', class: 'btn btn-primary', texto: 'Salvar' }),
      ]),
    ]);
  }

  function formularioProjeto(clientes, projeto = {}, erros = {}) {
    const selectCliente = el('select', { id: 'clienteId', name: 'clienteId', class: 'input', required: true }, [
      el('option', { value: '', texto: 'Selecione um cliente' }),
    ]);
    clientes.forEach((cliente) => {
      const opcao = el('option', { value: cliente.id, texto: cliente.nome });
      if (cliente.id === projeto.clienteId) opcao.selected = true;
      selectCliente.appendChild(opcao);
    });

    const selectStatus = el('select', { id: 'status', name: 'status', class: 'input' });
    Object.entries(STATUS_LABELS).forEach(([valor, rotulo]) => {
      const opcao = el('option', { value: valor, texto: rotulo });
      if (valor === (projeto.status || 'orcado')) opcao.selected = true;
      selectStatus.appendChild(opcao);
    });

    const grupoCliente = el('div', { class: 'field' }, [el('label', { for: 'clienteId', texto: 'Cliente' }), selectCliente]);
    if (erros.clienteId) grupoCliente.appendChild(el('p', { class: 'field__erro', texto: erros.clienteId }));

    const grupoStatus = el('div', { class: 'field' }, [el('label', { for: 'status', texto: 'Status' }), selectStatus]);

    return el('form', { id: 'form-projeto', noValidate: true }, [
      el('h2', { class: 'modal__titulo', texto: projeto.id ? 'Editar projeto' : 'Novo projeto' }),
      grupoCliente,
      campoFormulario({ id: 'titulo', rotulo: 'Título do projeto', valor: projeto.titulo, erro: erros.titulo, extraProps: { required: true } }),
      campoFormulario({ id: 'valor', rotulo: 'Valor (R$)', tipo: 'number', valor: projeto.valor, erro: erros.valor, extraProps: { step: '0.01', min: '0', required: true } }),
      campoFormulario({ id: 'dataInicio', rotulo: 'Data de início', tipo: 'date', valor: projeto.dataInicio, erro: erros.dataInicio, extraProps: { required: true } }),
      campoFormulario({ id: 'prazo', rotulo: 'Prazo', tipo: 'date', valor: projeto.prazo, erro: erros.prazo, extraProps: { required: true } }),
      grupoStatus,
      // Ver o comentário equivalente em formularioCliente: "id" colidiria com
      // a propriedade nativa form.id.
      el('input', { type: 'hidden', name: 'registroId', value: projeto.id || '' }),
      el('div', { class: 'modal__acoes' }, [
        el('button', { type: 'button', class: 'btn btn-ghost', 'data-fechar-modal': 'true', texto: 'Cancelar' }),
        el('button', { type: 'submit', class: 'btn btn-primary', texto: 'Salvar' }),
      ]),
    ]);
  }

  function confirmacao(mensagem) {
    return el('div', { class: 'modal__confirmacao' }, [
      el('p', { texto: mensagem }),
      el('div', { class: 'modal__acoes' }, [
        el('button', { type: 'button', class: 'btn btn-ghost', 'data-fechar-modal': 'true', texto: 'Cancelar' }),
        el('button', { type: 'button', class: 'btn btn-danger', id: 'btn-confirmar-exclusao', texto: 'Excluir' }),
      ]),
    ]);
  }

  // Guia o usuário quando ele tenta criar um projeto sem nenhum cliente
  // cadastrado, em vez de só um toast que passa despercebido. O botão
  // "onIrParaClientes" é injetado por events.js para não acoplar dom.js
  // à lógica de troca de aba.
  function avisoSemClientes(onIrParaClientes) {
    const botaoIr = el('button', { type: 'button', class: 'btn btn-primary', texto: 'Cadastrar cliente agora' });
    botaoIr.addEventListener('click', onIrParaClientes);
    return el('div', { class: 'modal__aviso' }, [
      icone('alerta', 'modal__aviso-icon'),
      el('h2', { class: 'modal__titulo', texto: 'Cadastre um cliente primeiro' }),
      el('p', { texto: 'Todo projeto precisa estar vinculado a um cliente. Cadastre um cliente para depois criar projetos para ele.' }),
      el('div', { class: 'modal__acoes' }, [
        el('button', { type: 'button', class: 'btn btn-ghost', 'data-fechar-modal': 'true', texto: 'Cancelar' }),
        botaoIr,
      ]),
    ]);
  }

  function mostrarToast(raiz, mensagem, tipo = 'sucesso') {
    const toast = el('div', { class: `toast toast--${tipo}`, texto: mensagem });
    raiz.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  return {
    renderDashboard,
    renderClientes,
    renderProjetos,
    abrirModal,
    fecharModal,
    formularioCliente,
    formularioProjeto,
    confirmacao,
    avisoSemClientes,
    mostrarToast,
  };
})();
