export interface AtividadeResponseDTO {
  id: string;
  turmaId: string;
  professorId: string;
  tipo: 'CASA' | 'DIA';
  titulo: string;
  descricao: string;
  dataCriacao: string;
  prazoConclusao: string; 
}

export interface NovaAtividadeRequestDTO {
  professorId: string;
  tipo: 'CASA' | 'DIA';
  titulo: string;
  descricao?: string;
  prazoConclusao?: string;
}

export interface AtividadeTabela {
  id: string;
  titulo: string;
  turma: string; 
  dataCriacao: string;
  dataEntrega: string;
  atividadeOriginal: AtividadeResponseDTO; 
}