// Item da listagem: o back devolve só o essencial.
export interface FichaSaudeResumo {
  id: string;
  nome: string;
}

export interface FichaSaude {
  id: string;
  alunoId: string;
  nome: string;
  observacoes: string | null;
  versao: number;
  dataCriacao: string;
  dataAtualizacao: string;
}

// "versao" só vai na edição (controle de edição simultânea).
export interface SalvarFichaSaude {
  nome: string;
  observacoes: string;
  versao?: number;
}
