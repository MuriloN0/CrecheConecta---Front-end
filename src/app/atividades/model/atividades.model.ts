export type TipoAtividade = 'CASA' | 'DIA';

export interface AtividadeResponseDTO {
  id: string;
  turmaId: string;
  professorId: string;
  tipo: TipoAtividade;
  titulo: string;
  descricao: string | null;
  dataCriacao: string;
  prazoConclusao: string | null;
}

export interface NovaAtividadeRequestDTO {
  professorId: string;
  tipo: TipoAtividade;
  titulo: string;
  descricao?: string;
  prazoConclusao?: string;
}

export interface AtualizarAtividadeRequestDTO {
  tipo?: TipoAtividade;
  titulo?: string;
  descricao?: string;
  prazoConclusao?: string;
}

export interface AtividadeTurma {
  id: string;
  nome: string;
  numeroSala: string;
}

export interface AtividadeTabela {
  id: string;
  titulo: string;
  turma: string;
  dataCriacao: string;
  dataEntrega: string;
  atividadeOriginal: AtividadeResponseDTO;
}
