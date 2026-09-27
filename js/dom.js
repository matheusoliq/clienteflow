// Único módulo que cria elementos DOM diretamente. Centralizar aqui evita
// manipulação de DOM espalhada por toda a aplicação e deixa claro, ao ler
// este arquivo, exatamente como cada parte da tela é montada.
//
// Regra de segurança: nomes de clientes/projetos vêm do próprio usuário,
// então usamos textContent (nunca innerHTML) para inserir esse conteúdo —
// isso impede que um texto digitado seja interpretado como HTML/script.

import { formatarMoeda, formatarData } from './utils.js';
import { estaAtrasado, getClientePorId } from './state.js';

const STATUS_LABELS = {
  orcado: 'Orçado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

// Pequena fábrica de elementos: evita repetir createElement + className +
// textContent + setAttribute em cada função de render abaixo.
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

// --- Dashboard (painel de alertas) --------------------------------------

export function renderDashboard(container, resumo) {
  container.replaceChildren();
  const blocos = [
    { rotulo: 'Atrasados', valor: resumo.atrasados, tom: resumo.atrasados > 0 ? 'danger' : 'neutro' },
    { rotulo: 'Vencem em 7 dias', valor: resumo.venceBreve, tom: resumo.venceBreve > 0 ? 'alerta' : 'neutro' },
    { rotulo: 'Receita prevista', valor: formatarMoeda(resumo.receitaPrevista), tom: 'neutro' },
    { rotulo: 'Recebido', valor: formatarMoeda(resumo.receitaRecebida), tom: 'sucesso' },
  ];
  blocos.forEach((bloco) => {
    container.appendChild(
      el('div', { class: `ledger__item ledger__item--${bloco.tom}` }, [
        el('span', { class: 'ledger__valor', texto: String(bloco.valor) }),
        el('span', { class: 'ledger__rotulo', texto: bloco.rotulo }),
      ])
    );
  });
}

// --- Listas ---------------------------------------------------------------

export function renderClientes(container, clientes) {
  container.replaceChildren();
  if (clientes.length === 0) {
    container.appendChild(
      el('p', { class: 'empty-state', texto: 'Nenhum cliente cadastrado ainda. Adicione o primeiro para começar.' })
    );
    return;
  }
  clientes.forEach((cliente) => {
    const meta = [cliente.empresa, cliente.email, cliente.telefone].filter(Boolean).join(' · ');
    container.appendChild(
      el('article', { class: 'card', role: 'listitem' }, [
        el('div', {}, [
          el('p', { class: 'card__titulo', texto: cliente.nome }),
          el('p', { class: 'card__meta', texto: meta }),
        ]),
        el('div', { class: 'card__acoes' }, [
          el('button', { class: 'btn btn-secondary btn-sm', type: 'button', 'data-acao': 'editar-cliente', 'data-id': cliente.id, texto: 'Editar' }),
          el('button', { class: 'btn btn-danger btn-sm', type: 'button', 'data-acao': 'excluir-cliente', 'data-id': cliente.id, texto: 'Excluir' }),
        ]),
      ])
    );
  });
}

export function renderProjetos(container, projetos) {
  container.replaceChildren();
  if (projetos.length === 0) {
    container.appendChild(
      el('p', { class: 'empty-state', texto: 'Nenhum projeto encontrado com os filtros atuais.' })
    );
    return;
  }
  projetos.forEach((projeto) => {
    const cliente = getClientePorId(projeto.clienteId);
    const atrasado = estaAtrasado(projeto);
    const tomBadge = atrasado ? 'danger' : projeto.status;
    const rotuloBadge = atrasado ? 'Atrasado' : STATUS_LABELS[projeto.status];
    const meta = `${cliente?.nome || 'Cliente removido'} · ${formatarMoeda(projeto.valor)} · prazo ${formatarData(projeto.prazo)}`;

    container.appendChild(
      el('article', { class: 'card', role: 'listitem' }, [
        el('div', {}, [
          el('div', { class: 'card__cabecalho' }, [
            el('p', { class: 'card__titulo', texto: projeto.titulo }),
            el('span', { class: `badge badge--${tomBadge}`, texto: rotuloBadge }),
          ]),
          el('p', { class: 'card__meta', texto: meta }),
        ]),
        el('div', { class: 'card__acoes' }, [
          el('button', { class: 'btn btn-secondary btn-sm', type: 'button', 'data-acao': 'editar-projeto', 'data-id': projeto.id, texto: 'Editar' }),
          el('button', { class: 'btn btn-danger btn-sm', type: 'button', 'data-acao': 'excluir-projeto', 'data-id': projeto.id, texto: 'Excluir' }),
        ]),
      ])
    );
  });
}

// --- Modal genérico ---------------------------------------------------------

let elementoAnteriorAoFoco = null;

export function abrirModal(raiz, conteudo) {
  elementoAnteriorAoFoco = document.activeElement;
  raiz.replaceChildren();
  const modal = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [conteudo]);
  const backdrop = el('div', { class: 'modal-backdrop', 'data-fechar-modal': 'true' }, [modal]);
  raiz.appendChild(backdrop);
  raiz.setAttribute('aria-hidden', 'false');
  modal.querySelector('input, select, textarea, button')?.focus();
}

export function fecharModal(raiz) {
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

export function formularioCliente(cliente = {}, erros = {}) {
  return el('form', { id: 'form-cliente', noValidate: true }, [
    el('h2', { class: 'modal__titulo', texto: cliente.id ? 'Editar cliente' : 'Novo cliente' }),
    campoFormulario({ id: 'nome', rotulo: 'Nome', valor: cliente.nome, erro: erros.nome, extraProps: { required: true } }),
    campoFormulario({ id: 'empresa', rotulo: 'Empresa (opcional)', valor: cliente.empresa }),
    campoFormulario({ id: 'email', rotulo: 'E-mail', tipo: 'email', valor: cliente.email, erro: erros.email, extraProps: { required: true } }),
    campoFormulario({ id: 'telefone', rotulo: 'Telefone', valor: cliente.telefone, erro: erros.telefone, extraProps: { required: true } }),
    el('input', { type: 'hidden', name: 'id', value: cliente.id || '' }),
    el('div', { class: 'modal__acoes' }, [
      el('button', { type: 'button', class: 'btn btn-ghost', 'data-fechar-modal': 'true', texto: 'Cancelar' }),
      el('button', { type: 'submit', class: 'btn btn-primary', texto: 'Salvar' }),
    ]),
  ]);
}

export function formularioProjeto(clientes, projeto = {}, erros = {}) {
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
    el('input', { type: 'hidden', name: 'id', value: projeto.id || '' }),
    el('div', { class: 'modal__acoes' }, [
      el('button', { type: 'button', class: 'btn btn-ghost', 'data-fechar-modal': 'true', texto: 'Cancelar' }),
      el('button', { type: 'submit', class: 'btn btn-primary', texto: 'Salvar' }),
    ]),
  ]);
}

export function confirmacao(mensagem) {
  return el('div', { class: 'modal__confirmacao' }, [
    el('p', { texto: mensagem }),
    el('div', { class: 'modal__acoes' }, [
      el('button', { type: 'button', class: 'btn btn-ghost', 'data-fechar-modal': 'true', texto: 'Cancelar' }),
      el('button', { type: 'button', class: 'btn btn-danger', id: 'btn-confirmar-exclusao', texto: 'Excluir' }),
    ]),
  ]);
}

export function mostrarToast(raiz, mensagem, tipo = 'sucesso') {
  const toast = el('div', { class: `toast toast--${tipo}`, texto: mensagem });
  raiz.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}
