export type StatusTermo = 'RASCUNHO' | 'VIGENTE' | 'ARQUIVADO';

export interface TermoVersao {
  id: string;
  identificador: string;
  status: StatusTermo;
  termoUso: string;
  politicaPrivacidade: string;
  criadoEm: string;
  atualizadoEm: string;
  publicadoEm: string | null;
  aceites: number;
  versao: number;
}

export interface DadosTermo {
  termoUso: string;
  politicaPrivacidade: string;
}

export const ROTULOS_STATUS_TERMO: Record<StatusTermo, string> = {
  RASCUNHO: 'Rascunho',
  VIGENTE: 'Vigente',
  ARQUIVADO: 'Arquivada',
};
