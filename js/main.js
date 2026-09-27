// Ponto de entrada. Responsabilidade única: orquestrar a ordem de
// inicialização — nenhuma lógica de negócio mora aqui.
import * as estado from './state.js';
import * as dom from './dom.js';
import { ligarEventos } from './events.js';

function renderizarTudo(estadoAtual) {
  dom.renderDashboard(document.getElementById('dashboard'), estado.getResumo());
  dom.renderClientes(document.getElementById('lista-clientes'), estado.getClientesFiltrados());
  dom.renderProjetos(document.getElementById('lista-projetos'), estado.getProjetosFiltrados());

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

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((erro) => {
      console.error('[main] Falha ao registrar o service worker.', erro);
    });
  }
});
