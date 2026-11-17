import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Pagina } from '../turmas/turmas.service';

export type SituacaoProfessor = 'PENDENTE_APROVACAO' | 'APROVADO' | 'REJEITADO' | 'INATIVO';

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

  listar(pagina: number, situacao: SituacaoProfessor | '', busca = '', tamanho = 20) {
    const params: Record<string, string | number | boolean> = { pagina, tamanho };

    if (situacao) params['situacao'] = situacao;
    if (busca) params['busca'] = busca;

    return this.http.get<Pagina<Professor>>(this.url, { params });
  }

  listarDisponiveis(turmaId: string, pagina: number, tamanho: number, nome: string) {
    return this.http.get<Pagina<Professor>>(`${this.url}/disponiveis`, {
      params: { turmaId, pagina, tamanho, nome },
    });
  }

  consultar(id: string) {
    return this.http.get<Professor>(`${this.url}/${id}`);
  }

  convidar(nome: string, email: string) {
    return this.http.post<ConviteProfessor>(`${this.url}/convites`, { nome, email });
  }

  inativar(professor: Professor) {
    return this.http.post<Professor>(`${this.url}/${professor.id}/inativar`, {
      versao: professor.versao,
    });
  }

  listarVinculos(turmaId: string, pagina: number, incluirEncerrados: boolean, tamanho = 20) {
    return this.http.get<Pagina<VinculoProfessor>>(`/api/turmas/${turmaId}/professores`, {
      params: { pagina, tamanho, incluirEncerrados },
    });
  }

  vincular(turmaId: string, professorId: string) {
    return this.http.post<VinculoProfessor>(`/api/turmas/${turmaId}/professores`, { professorId });
  }

  encerrar(vinculo: VinculoProfessor) {
    return this.http.post<VinculoProfessor>(
      `/api/turmas/${vinculo.turmaId}/professores/${vinculo.id}/encerrar`,
      null,
    );
  }
}
