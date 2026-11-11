import { HttpErrorResponse } from '@angular/common/http';
import { ProblemaApi } from '../model/mala-virtual.model';

export const MENSAGEM_CONFLITO_VERSAO =
  'A mala foi alterada por outra pessoa. Revise e salve de novo.';

const MENSAGENS_PADRAO: Record<string, string> = {
  DADOS_INVALIDOS: 'Confira os campos destacados no formulário.',
  REQUISICAO_INVALIDA:
    'Não foi possível entender a requisição. Atualize a página e tente novamente.',
  PARAMETRO_INVALIDO:
    'Não foi possível entender a requisição. Atualize a página e tente novamente.',
  REGRA_NEGOCIO: 'A operação não é permitida para esta mala.',
  NAO_AUTENTICADO: 'Sua sessão expirou. Entre novamente.',
  ACESSO_NEGADO: 'Você não possui permissão para esta operação.',
  MALA_VIRTUAL_NAO_ENCONTRADA: 'A mala não foi encontrada. Atualize a listagem.',
  ITEM_MALA_NAO_ENCONTRADO: 'O item não foi encontrado. Atualize a mala.',
  ALUNO_NAO_ENCONTRADO: 'A criança não foi encontrada.',
  TURMA_NAO_ENCONTRADA: 'A turma não foi encontrada.',
  CONFLITO_VERSAO: MENSAGEM_CONFLITO_VERSAO,
};

const MENSAGENS_POR_STATUS: Record<number, string> = {
  0: 'Não foi possível conectar à API.',
  400: 'Confira os dados enviados.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não possui permissão para esta operação.',
  404: 'O registro não foi encontrado. Atualize a listagem.',
  409: MENSAGEM_CONFLITO_VERSAO,
};

export function problemaApi(erro: unknown): ProblemaApi {
  if (!(erro instanceof HttpErrorResponse)) return {};

  const corpo: unknown = erro.error;
  return corpo !== null && typeof corpo === 'object' ? (corpo as ProblemaApi) : {};
}

export function codigoErro(erro: unknown): string | null {
  const codigo = problemaApi(erro).codigo;
  return typeof codigo === 'string' ? codigo : null;
}

export function statusErro(erro: unknown): number | null {
  return erro instanceof HttpErrorResponse ? erro.status : null;
}

export function mensagemErroMala(erro: unknown): string {
  if (!(erro instanceof HttpErrorResponse)) {
    return 'Não foi possível concluir a operação. Tente novamente.';
  }

  if (erro.status === 0) return MENSAGENS_POR_STATUS[0];

  const codigo = codigoErro(erro);
  if (codigo === 'CONFLITO_VERSAO') return MENSAGEM_CONFLITO_VERSAO;

  const mensagem = problemaApi(erro).mensagem;
  if (typeof mensagem === 'string' && mensagem.trim()) return mensagem;

  return (codigo && MENSAGENS_PADRAO[codigo])
    ?? MENSAGENS_POR_STATUS[erro.status]
    ?? 'Não foi possível concluir a operação. Tente novamente.';
}

export function camposInvalidos(erro: unknown): string[] {
  if (codigoErro(erro) !== 'DADOS_INVALIDOS') return [];

  const campos = problemaApi(erro).campos;
  return Array.isArray(campos)
    ? campos.filter((campo): campo is string => typeof campo === 'string')
    : [];
}

export function hojeEmSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

export function normalizarNomeItem(nome: string): string {
  return nome.trim().toLowerCase();
}
