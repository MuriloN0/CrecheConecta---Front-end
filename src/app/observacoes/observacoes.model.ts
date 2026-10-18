export interface Observacao {
  id: string;
  alunoId: string;
  titulo: string;
  conteudo: string;
  versao: number;
  dataCriacao: string;
  dataAtualizacao: string;
}

export interface SalvarObservacao {
  titulo: string;
  conteudo: string;
  versao?: number;
}
