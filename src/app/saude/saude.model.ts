export interface FichaSaudeResumo {
  id: string;
  nome: string;
  dataCriacao: string;
}

export interface AnexoResponse{
    id: string;
    nomeArquivo: string;
    tipoConteudo: string;
    tamanhoBytes: number;
}

export interface FichaSaude{
    id: string;
    alunoId: string;
    nome: string;
    observacoes: string;
    anexos: AnexoResponse[];
    dataCriacao: string;
    dataAtualizacao: string;
}

export interface SalvarFichaSaude{
    nome: string;
    observacoes: string;
    anexosMantidos?: string[];
}
