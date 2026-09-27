// Única parte da aplicação que chama localStorage diretamente.
// Motivo: se um dia trocarmos a estratégia de persistência (ex.: IndexedDB,
// ou sincronização com um servidor), só este arquivo muda — state.js continua
// chamando storage.getClientes()/storage.salvarClientes() sem saber como
// os dados são guardados de verdade. Isso é baixo acoplamento na prática.

const CHAVE_CLIENTES = 'clientflow:clientes';
const CHAVE_PROJETOS = 'clientflow:projetos';

function lerLista(chave) {
  try {
    const bruto = localStorage.getItem(chave);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    // Se por algum motivo o valor salvo não for um array (dado corrompido
    // ou editado manualmente no DevTools), tratamos como "sem dados" em vez
    // de deixar o erro se propagar para a interface.
    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    console.error(`[storage] Dados inválidos em "${chave}", iniciando lista vazia.`, erro);
    return [];
  }
}

function salvarLista(chave, lista) {
  try {
    localStorage.setItem(chave, JSON.stringify(lista));
    return true;
  } catch (erro) {
    // Ocorre principalmente quando o LocalStorage está cheio (quota
    // excedida, geralmente ~5MB) ou em modo de navegação privada em
    // alguns navegadores.
    console.error(`[storage] Falha ao salvar "${chave}".`, erro);
    return false;
  }
}

export const storage = {
  getClientes: () => lerLista(CHAVE_CLIENTES),
  salvarClientes: (lista) => salvarLista(CHAVE_CLIENTES, lista),
  getProjetos: () => lerLista(CHAVE_PROJETOS),
  salvarProjetos: (lista) => salvarLista(CHAVE_PROJETOS, lista),
};
