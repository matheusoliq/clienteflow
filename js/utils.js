// Funções puras e pequenas, sem dependência de DOM ou de estado global.
// Ficam aqui porque são reutilizadas por vários módulos (validation, state, dom)
// e não fazem sentido "pertencer" a nenhum deles especificamente.

export function gerarId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para navegadores sem crypto.randomUUID (ex.: contexto não seguro/HTTP).
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

export function formatarData(dataISO) {
  if (!dataISO) return '—';
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function debounce(fn, atrasoEmMs = 300) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn(...args), atrasoEmMs);
  };
}
