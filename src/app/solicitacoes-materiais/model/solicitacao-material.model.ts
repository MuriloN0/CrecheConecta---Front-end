export type StatusSolicitacao = 'ABERTA' | 'ATENDIDA' | 'RECUSADA' | 'CANCELADA';

export type PrioridadeSolicitacao = 'BAIXA' | 'MEDIA' | 'ALTA';

export type PerfilAutorMensagem = 'DIRECAO' | 'PROFESSOR';


export const LISTA_STATUS: StatusSolicitacao[] = ['ABERTA', 'ATENDIDA', 'RECUSADA', 'CANCELADA'];

export const LISTA_PRIORIDADES: PrioridadeSolicitacao[] = ['BAIXA', 'MEDIA', 'ALTA'];


export const ROTULOS_STATUS: Record<StatusSolicitacao, string> = {
  ABERTA: 'Aberta',
  ATENDIDA: 'Atendida',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada',
};

export const ROTULOS_PRIORIDADE: Record<PrioridadeSolicitacao, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
};

export const ROTULOS_PERFIL_AUTOR: Record<PerfilAutorMensagem, string> = {
  DIRECAO: 'Direção',
  PROFESSOR: 'Professor',
};


export const CORES_STATUS: Record<StatusSolicitacao, string> = {
  ABERTA: 'bg-amber-100 text-amber-900',
  ATENDIDA: 'bg-creche-verde text-white',
  RECUSADA: 'bg-red-50 text-red-800',
  CANCELADA: 'bg-stone-100 text-stone-700',
};

export const CORES_PRIORIDADE: Record<PrioridadeSolicitacao, string> = {
  BAIXA: 'bg-stone-100 text-stone-700',
  MEDIA: 'bg-creche-pessego/40 text-creche-texto',
  ALTA: 'bg-creche-pessego text-creche-texto',
};

export const CORES_PERFIL_AUTOR: Record<PerfilAutorMensagem, string> = {
  DIRECAO: 'bg-creche-pessego/40 text-creche-texto',
  PROFESSOR: 'bg-stone-100 text-stone-700',
};


export interface ItemSolicitacao {
  id: string;
  nome: string;
  quantidade: number;
}

export interface SolicitacaoMaterial {
  id: string;

  professorId: string;
  professorNome: string;

  sala: string;
  titulo: string;
  descricao: string | null;

  prioridade: PrioridadeSolicitacao;
  status: StatusSolicitacao;

  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm: string | null;

  versao: number;

  itens: ItemSolicitacao[];
}

export interface MensagemSolicitacao {
  id: string;

  autorId: string;
  autorNome: string;
  autorPerfil: PerfilAutorMensagem;

  conteudo: string;
  criadoEm: string;
}

export interface DetalheSolicitacao {
  solicitacao: SolicitacaoMaterial;
  mensagens: MensagemSolicitacao[];
}

export interface PaginaSolicitacoes {
  content: SolicitacaoMaterial[];

  totalElements: number;
  totalPages: number;

  number: number;
  size: number;
}

export interface FiltrosSolicitacao {
  status: StatusSolicitacao | '';
  prioridade: PrioridadeSolicitacao | '';
}


export interface ItemSolicitacaoRequest {
  nome: string;
  quantidade: number;
}

export interface CriarSolicitacaoRequest {
  titulo: string;
  sala: string;
  descricao: string | null;
  prioridade: PrioridadeSolicitacao;
  itens: ItemSolicitacaoRequest[];
}

export interface AtualizarSolicitacaoRequest extends CriarSolicitacaoRequest {
  versao: number;
}

export interface EnviarMensagemRequest {
  conteudo: string;
}

export interface AtenderSolicitacaoRequest {
  mensagem: string | null;
  versao: number;
}

export interface RecusarSolicitacaoRequest {
  motivo: string;
  versao: number;
}

export interface CancelarSolicitacaoRequest {
  versao: number;
}


export interface ProblemaApi {
  status?: number;
  title?: string;
  detail?: string;

  mensagem?: string;
  codigo?: string;
  campos?: string[];
}
