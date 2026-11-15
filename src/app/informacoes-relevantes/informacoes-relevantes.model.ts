// Item da listagem: o back devolve só o essencial.
export interface InformacaoRelevanteResumo {
  id: string;
  nome: string;
}

export interface InformacaoRelevante {
  id: string;
  alunoId: string;
  nome: string;
  observacoes: string | null;
  versao: number;
  dataCriacao: string;
  dataAtualizacao: string;
}

// "versao" só vai na edição (controle de edição simultânea).
export interface SalvarInformacaoRelevante {
  nome: string;
  observacoes: string;
  versao?: number;
}
