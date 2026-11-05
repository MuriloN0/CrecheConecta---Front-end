import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Pagina } from '../turmas/turmas.service';

export type SituacaoProfessor =  | 'PENDENTE_APROVACAO'  | 'APROVADO'| 'REJEITADO'| 'INATIVO';

export interface Professor {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  ativo: boolean;
  situacaoCadastro: SituacaoProfessor;
  versao: number;
}

export interface VinculoProfessor {
  id: string;
  turmaId: string;
  professorId: string;
  criadoEm: string;
  encerradoEm: string | null;
}

interface ConviteProfessor {
  id: string;
  email: string;
  expiraEm: string;
  mensagem: string;
}

@Injectable({ providedIn: 'root' })
export class ProfessoresService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/professores';

  listar(pagina: number, situacao: SituacaoProfessor | '') {
    const params: Record<string, string | number> = {
      pagina,
      tamanho: 20,
    };

    if (situacao) {
      params['situacao'] = situacao;
    }

    return this.http.get<Pagina<Professor>>(this.url, { params });
  }

  consultar(id: string) {
    return this.http.get<Professor>(`${this.url}/${id}`);
  }

  convidar(nome: string, email: string) {
    return this.http.post<ConviteProfessor>(`${this.url}/convites`, {
      nome,
      email,
    });
  }

  atualizar(professor: Professor, nome: string, telefone: string) {
    return this.http.put<Professor>(`${this.url}/${professor.id}`, {
      nome,
      telefone,
      versao: professor.versao,
    });
  }

  decidir(professor: Professor, acao: 'aprovar' | 'rejeitar' | 'inativar') {
    return this.http.post<Professor>(`${this.url}/${professor.id}/${acao}`, {
      versao: professor.versao,
    });
  }

  listarVinculos(turmaId: string, pagina: number, incluirEncerrados: boolean) {
    return this.http.get<Pagina<VinculoProfessor>>(
      `/api/turmas/${turmaId}/professores`,
      { params: { pagina, tamanho: 20, incluirEncerrados } },
    );
  }

  vincular(turmaId: string, professorId: string) {
    return this.http.post<VinculoProfessor>(
      `/api/turmas/${turmaId}/professores`,
      { professorId },
    );
  }

  encerrar(vinculo: VinculoProfessor) {
    return this.http.post<VinculoProfessor>(
      `/api/turmas/${vinculo.turmaId}/professores/${vinculo.id}/encerrar`,
      null,
    );
  }
}
