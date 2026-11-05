import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface Turma {
  id: string;
  nome: string;
  numeroSala: string;
  ativo: boolean;
  versao: number;
}

export interface DadosTurma {
  nome: string;
  numeroSala: string;
}

export interface Matricula {
  id: string;
  alunoId: string;
  turmaId: string;
  criadoEm: string;
  encerradoEm: string | null;
}

export interface Pagina<T> {
  content: T[];
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class TurmasApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/turmas';

  listar(pagina: number, ativo: boolean | null) {
    const params: Record<string, number | boolean> = { pagina, tamanho: 20 };

    if (ativo !== null) {
      params['ativo'] = ativo;
    }

    return this.http.get<Pagina<Turma>>(this.url, { params });
  }

  cadastrar(dados: DadosTurma) {
    return this.http.post<Turma>(this.url, dados);
  }

  atualizar(turma: Turma, dados: DadosTurma) {
    return this.http.put<Turma>(`${this.url}/${turma.id}`, {
      ...dados,
      versao: turma.versao,
    });
  }

  inativar(turma: Turma) {
    return this.http.post<Turma>(`${this.url}/${turma.id}/inativar`, {
      versao: turma.versao,
    });
  }

  listarMatriculas(turmaId: string, pagina: number, incluirEncerradas: boolean) {
    return this.http.get<Pagina<Matricula>>(`${this.url}/${turmaId}/matriculas`, {
      params: { pagina, tamanho: 20, incluirEncerradas },
    });
  }

  matricular(turmaId: string, alunoId: string) {
    return this.http.post<Matricula>(`${this.url}/${turmaId}/matriculas`, {
      alunoId,
    });
  }

  encerrar(matricula: Matricula) {
    const caminho = `${this.url}/${matricula.turmaId}/matriculas/${matricula.id}`;
    return this.http.post<Matricula>(`${caminho}/encerrar`, null);
  }
}
