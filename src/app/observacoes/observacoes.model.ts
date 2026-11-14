// Observação do aluno: o professor da turma escreve; responsável e direção leem.
export interface Observacao {
  id: string;
  alunoId: string;
  titulo: string;
  conteudo: string | null;
  autorId: string;
  autorNome: string | null;
  // Verdadeiro só para o professor que registrou a observação.
  editavel: boolean;
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
