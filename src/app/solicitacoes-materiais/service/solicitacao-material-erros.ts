import { HttpErrorResponse } from '@angular/common/http';

import { ProblemaApi } from '../model/solicitacao-material.model';

export const MENSAGEM_SEM_PERMISSAO = 'Você não tem permissão para esta ação.';

export const MENSAGEM_CONFLITO_VERSAO =
  'Cadastro alterado por outra pessoa. Recarregue os dados.';

export const MENSAGEM_JA_FINALIZADA = 'Esta solicitação já foi finalizada.';

const MENSAGEM_GENERICA = 'Não foi possível concluir a operação. Tente novamente.';

const MENSAGEM_REQUISICAO_INVALIDA =
  'Não foi possível entender a requisição. Atualize a página e tente novamente.';


const MENSAGENS_POR_CODIGO: Record<string, string> = {
  DADOS_INVALIDOS: 'Confira os campos destacados no formulário.',
  REQUISICAO_INVALIDA: MENSAGEM_REQUISICAO_INVALIDA,
  PARAMETRO_INVALIDO: MENSAGEM_REQUISICAO_INVALIDA,
  REGRA_NEGOCIO: 'A operação não é permitida para esta solicitação.',
  SOLICITACAO_MATERIAL_NAO_ENCONTRADA: 'A solicitação não foi encontrada. Atualize a listagem.',
  CONFLITO_VERSAO: MENSAGEM_CONFLITO_VERSAO,
};

const MENSAGENS_POR_STATUS: Record<number, string> = {
  0: 'Não foi possível conectar à API.',
  400: 'Confira os dados enviados.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: MENSAGEM_SEM_PERMISSAO,
  404: 'A solicitação não foi encontrada. Atualize a listagem.',
  409: MENSAGEM_CONFLITO_VERSAO,
};


export function problemaApi(erro: unknown): ProblemaApi {
  if (!(erro instanceof HttpErrorResponse)) {
    return {};
  }

  const corpo: unknown = erro.error;
  const corpoEhObjeto = corpo !== null && typeof corpo === 'object';

  return corpoEhObjeto ? (corpo as ProblemaApi) : {};
}

export function codigoErro(erro: unknown): string | null {
  const codigo = problemaApi(erro).codigo;

  return typeof codigo === 'string' ? codigo : null;
}

export function statusErro(erro: unknown): number | null {
  return erro instanceof HttpErrorResponse ? erro.status : null;
}

export function conflitoVersao(erro: unknown): boolean {
  return statusErro(erro) === 409 || codigoErro(erro) === 'CONFLITO_VERSAO';
}

export function solicitacaoJaFinalizada(erro: unknown): boolean {
  if (codigoErro(erro) !== 'REGRA_NEGOCIO') {
    return false;
  }

  const mensagem = problemaApi(erro).mensagem;

  return mensagem?.trim() === MENSAGEM_JA_FINALIZADA;
}

export function precisaRecarregarDetalhe(erro: unknown): boolean {
  const naoEncontrada = statusErro(erro) === 404;

  return conflitoVersao(erro) || solicitacaoJaFinalizada(erro) || naoEncontrada;
}


export function mensagemErroSolicitacao(erro: unknown): string {
  if (!(erro instanceof HttpErrorResponse)) {
    return MENSAGEM_GENERICA;
  }

  const status = erro.status;

  const semConexao = status === 0;
  const sessaoExpirada = status === 401;
  const semPermissao = status === 403;

  if (semConexao || sessaoExpirada || semPermissao) {
    return MENSAGENS_POR_STATUS[status];
  }

  const mensagemDoBackend = problemaApi(erro).mensagem;

  if (typeof mensagemDoBackend === 'string' && mensagemDoBackend.trim()) {
    return mensagemDoBackend;
  }

  const codigo = codigoErro(erro);

  if (codigo && MENSAGENS_POR_CODIGO[codigo]) {
    return MENSAGENS_POR_CODIGO[codigo];
  }

  return MENSAGENS_POR_STATUS[status] ?? MENSAGEM_GENERICA;
}

export function camposInvalidos(erro: unknown): string[] {
  if (codigoErro(erro) !== 'DADOS_INVALIDOS') {
    return [];
  }

  const campos = problemaApi(erro).campos;

  if (!Array.isArray(campos)) {
    return [];
  }

  return campos.filter((campo): campo is string => typeof campo === 'string');
}

export function normalizarNomeItem(nome: string): string {
  return nome.trim().toLowerCase();
}
