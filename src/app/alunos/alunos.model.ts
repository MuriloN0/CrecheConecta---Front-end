export interface Responsavel {
  nome: string;
  parentesco: string;
  email: string | null;
  telefone: string;
}
export interface DadosAluno {
  nome: string;
  endereco: string | null;
  emailContato: string;
  telefoneContato: string;
  responsaveis: Responsavel[];
}
export interface Aluno extends DadosAluno {
  id: string;
  ativo: boolean;
  versao: number;
}
export interface ResumoAluno {
  id: string;
  nome: string;
  ativo: boolean;
  versao: number;
}
export interface Pagina<T> {
  itens: T[];
  pagina: number;
  tamanho: number;
  totalElementos: number;
  totalPaginas: number;
}
