export interface Observacao {
  id: string;
  alunoId: string;
  titulo: string;
  conteudo: string | null;
  versao: number;
  dataCriacao: string;
  dataAtualizacao: string;
}

// "versao" só vai na edição (controle de edição simultânea).
export interface SalvarObservacao {
  titulo: string;
  conteudo: string;
  versao?: number;
}
