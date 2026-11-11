// Item da listagem: o back devolve só o essencial.
export interface FichaSaudeResumo {
  id: string;
  nome: string;
  quantidadeAnexos: number;
}

export interface AnexoResponse {
  id: string;
  nomeArquivo: string;
  tipoConteudo: string;
  tamanhoBytes: number;
}

export interface FichaSaude {
  id: string;
  alunoId: string;
  nome: string;
  observacoes: string | null;
  versao: number;
  anexos: AnexoResponse[];
  dataCriacao: string;
  dataAtualizacao: string;
}

// "versao" só vai na edição (controle de edição simultânea).
export interface SalvarFichaSaude {
  nome: string;
  observacoes: string;
  versao?: number;
}
