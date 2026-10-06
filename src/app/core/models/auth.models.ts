export type Perfil = 'DIRECAO' | 'PROFESSOR' | 'PAIS';

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

export interface AcaoResponse {
  acaoId: string;
  expiraEm: string;
  mensagem: string;
}

export interface SessaoResponse {
  accessToken: string;
  tokenType: string;
  expiraEm: string;
  usuarioId: string;
  nome: string;
  perfil: Perfil;
}

export interface RecuperacaoConfirmada {
  redefinicaoId: string;
  tokenRedefinicao: string;
  expiraEm: string;
}

export interface RedefinirSenhaRequest {
  redefinicaoId: string;
  tokenRedefinicao: string;
  novaSenha: string;
  confirmacaoSenha: string;
}
