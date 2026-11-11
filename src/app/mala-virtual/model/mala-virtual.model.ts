export interface ItemMalaTurma {
  id: string;
  nome: string;
  quantidade: number;
}

export interface MalaTurma {
  id: string;
  turmaId: string;
  professorId: string;
  titulo: string;
  data: string;
  observacao: string | null;
  criadoEm: string;
  atualizadoEm: string;
  versao: number;
  itens: ItemMalaTurma[];
}

export interface ItemMalaRequest {
  id?: string;
  nome: string;
  quantidade: number;
}

export interface CriarMalaRequest {
  titulo: string;
  data: string;
  observacao?: string;
  itens: ItemMalaRequest[];
}

export interface AtualizarMalaRequest extends CriarMalaRequest {
  versao: number;
}

export interface ItemProgressoAluno {
  itemId: string;
  nome: string;
  quantidade: number;
  enviado: boolean;
  observacao: string | null;
  atualizadoEm: string | null;
}

export interface ProgressoAluno {
  alunoId: string;
  nome: string;
  itensEnviados: number;
  totalItens: number;
  completo: boolean;
  itens: ItemProgressoAluno[];
}

export interface ItemMalaFilho {
  id: string;
  nome: string;
  quantidade: number;
  enviado: boolean;
  observacao: string | null;
}

export interface MalaFilho {
  id: string;
  titulo: string;
  data: string;
  observacao: string | null;
  podeMarcar: boolean;
  itensPendentes: number;
  itens: ItemMalaFilho[];
}

export interface MarcarItemRequest {
  enviado: boolean;
  observacao?: string;
}

export interface ProblemaApi {
  status?: number;
  title?: string;
  detail?: string;
  mensagem?: string;
  codigo?: string;
  campos?: string[];
}
