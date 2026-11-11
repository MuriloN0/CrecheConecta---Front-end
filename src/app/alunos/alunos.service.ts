import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface Aluno {
  id: string;
  nome: string;
  dataNascimento: string | null;
  anoNascimento: number | null;
  ativo: boolean;
  versao: number;
}

interface PaginaAlunos {
  content: Aluno[];
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class AlunosApi {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/alunos';

  listar(pagina: number, ativo: boolean | null) {
    const params: Record<string, number | boolean> = {
      pagina,
      tamanho: 20,
    };

    if (ativo !== null) {
      params['ativo'] = ativo;
    }

    return this.http.get<PaginaAlunos>(this.url, { params });
  }

  listarDisponiveis(pagina: number) {
    return this.http.get<PaginaAlunos>(`${this.url}/disponiveis`, {
      params: { pagina, tamanho: 20 },
    });
  }

  convidar(nome: string, email: string) {
    return this.http.post<{ mensagem: string }>(`${this.url}/convites`, { nome, email });
  }

  consultar(id: string) {
    return this.http.get<Aluno>(`${this.url}/${id}`);
  }

  inativar(aluno: Aluno) {
    return this.http.post<Aluno>(`${this.url}/${aluno.id}/inativar`, {
      versao: aluno.versao,
    });
  }
}
