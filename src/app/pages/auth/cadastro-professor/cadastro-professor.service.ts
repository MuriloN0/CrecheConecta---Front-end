import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface DadosConviteProfessor {
  nome: string;
  email: string;
  expiraEm: string;
}

export interface ConcluirCadastroProfessor {
  token: string;
  nome: string;
  telefone: string;
  senha: string;
}

interface CadastroProfessorResultado {
  usuarioId: string;
  mensagem: string;
}

@Injectable({ providedIn: 'root' })
export class CadastroProfessorService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/cadastro/professores';

  consultarConvite(token: string) {
    return this.http.post<DadosConviteProfessor>(
      `${this.url}/consultar-convite`,
      { token },
    );
  }

  concluir(dados: ConcluirCadastroProfessor) {
    return this.http.post<CadastroProfessorResultado>(
      `${this.url}/concluir`,
      dados,
    );
  }
}
