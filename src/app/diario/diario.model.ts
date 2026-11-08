// Valores iguais aos enums do back (Alimentacao, Sono, Humor e Higiene).
export type Alimentacao = 'COMEU_TUDO' | 'COMEU_BEM' | 'COMEU_POUCO' | 'NAO_COMEU';
export type Sono = 'DORMIU_BEM' | 'DORMIU_POUCO' | 'NAO_DORMIU';
export type Humor = 'FELIZ' | 'CALMO' | 'AGITADO' | 'CHOROSO';
export type Higiene = 'HIGIENIZADO' | 'PARCIAL' | 'NAO_REALIZADO';

export interface OpcaoDiario {
  valor: string;
  rotulo: string;
}

export const OPCOES_ALIMENTACAO: OpcaoDiario[] = [
  { valor: 'COMEU_TUDO', rotulo: 'Comeu tudo' },
  { valor: 'COMEU_BEM', rotulo: 'Comeu bem' },
  { valor: 'COMEU_POUCO', rotulo: 'Comeu pouco' },
  { valor: 'NAO_COMEU', rotulo: 'Não comeu' },
];

export const OPCOES_SONO: OpcaoDiario[] = [
  { valor: 'DORMIU_BEM', rotulo: 'Dormiu bem' },
  { valor: 'DORMIU_POUCO', rotulo: 'Dormiu pouco' },
  { valor: 'NAO_DORMIU', rotulo: 'Não dormiu' },
];

export const OPCOES_HUMOR: OpcaoDiario[] = [
  { valor: 'FELIZ', rotulo: 'Feliz' },
  { valor: 'CALMO', rotulo: 'Calmo' },
  { valor: 'AGITADO', rotulo: 'Agitado' },
  { valor: 'CHOROSO', rotulo: 'Choroso' },
];

export const OPCOES_HIGIENE: OpcaoDiario[] = [
  { valor: 'HIGIENIZADO', rotulo: 'Higiene completa' },
  { valor: 'PARCIAL', rotulo: 'Higiene parcial' },
  { valor: 'NAO_REALIZADO', rotulo: 'Higiene não realizada' },
];

// Rótulo de qualquer valor, para mostrar na tela (professor e família).
export const ROTULOS_DIARIO: Record<string, string> = Object.fromEntries(
  [...OPCOES_ALIMENTACAO, ...OPCOES_SONO, ...OPCOES_HUMOR, ...OPCOES_HIGIENE].map(
    (opcao) => [opcao.valor, opcao.rotulo],
  ),
);

export interface RegistroDiario {
  id: string;
  turmaId: string;
  alunoId: string;
  data: string;
  alimentacao: Alimentacao;
  sono: Sono;
  evacuacao: boolean;
  humor: Humor;
  higiene: Higiene;
  observacaoProfessor: string | null;
  // true só para o professor que criou o diário (só ele edita ou exclui).
  editavel: boolean;
  versao: number;
}

// Uma linha da tela: o aluno da turma e o diário do dia (null = ainda não preenchido).
export interface AlunoDiario {
  alunoId: string;
  nome: string;
  diario: RegistroDiario | null;
}

export interface DadosDiario {
  alimentacao: Alimentacao;
  sono: Sono;
  evacuacao: boolean;
  humor: Humor;
  higiene: Higiene;
  observacaoProfessor?: string;
  // Omitido ao criar; obrigatório ao editar.
  versao?: number;
}
