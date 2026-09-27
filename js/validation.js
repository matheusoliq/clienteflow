// Validação de formato (HTML: required, type="email", type="date") fica no
// próprio HTML. Aqui ficam as regras que o HTML sozinho não expressa bem:
// tamanho mínimo de nome, prazo não poder ser anterior ao início, etc.

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCliente(dados) {
  const erros = {};

  if (!dados.nome || dados.nome.trim().length < 2) {
    erros.nome = 'Informe um nome com pelo menos 2 caracteres.';
  }
  if (!dados.email || !REGEX_EMAIL.test(dados.email.trim())) {
    erros.email = 'Informe um e-mail válido.';
  }
  if (!dados.telefone || dados.telefone.trim().length < 8) {
    erros.telefone = 'Informe um telefone válido (com DDD).';
  }

  return { valido: Object.keys(erros).length === 0, erros };
}

export function validarProjeto(dados) {
  const erros = {};

  if (!dados.clienteId) {
    erros.clienteId = 'Selecione um cliente.';
  }
  if (!dados.titulo || dados.titulo.trim().length < 3) {
    erros.titulo = 'Informe um título com pelo menos 3 caracteres.';
  }

  const valorNumerico = Number(dados.valor);
  if (!dados.valor || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
    erros.valor = 'Informe um valor numérico maior que zero.';
  }

  if (!dados.dataInicio) {
    erros.dataInicio = 'Informe a data de início.';
  }

  if (!dados.prazo) {
    erros.prazo = 'Informe o prazo.';
  } else if (dados.dataInicio && dados.prazo < dados.dataInicio) {
    erros.prazo = 'O prazo não pode ser anterior à data de início.';
  }

  return { valido: Object.keys(erros).length === 0, erros };
}
