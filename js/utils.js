// Funções puras e pequenas, sem dependência de DOM ou de estado global.
// Ficam aqui porque são reutilizadas por vários módulos (validation, state, dom)
// e não fazem sentido "pertencer" a nenhum deles especificamente.
//
// Namespace global (window.ClientFlow) em vez de import/export: assim o app
// roda com um duplo-clique no index.html, sem precisar de servidor local.
// Módulos ES (import/export) só executam em páginas servidas por HTTP/HTTPS —
// abertas como arquivo local (file://), o navegador bloqueia por CORS.
window.ClientFlow = window.ClientFlow || {};

window.ClientFlow.utils = (function () {
  function gerarId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback para navegadores sem crypto.randomUUID (ex.: contexto não seguro/HTTP).
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }

  function formatarData(dataISO) {
    if (!dataISO) return '—';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function hojeISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function debounce(fn, atrasoEmMs = 300) {
    let temporizador;
    return (...args) => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => fn(...args), atrasoEmMs);
    };
  }

  return { gerarId, formatarMoeda, formatarData, hojeISO, debounce };
})();
