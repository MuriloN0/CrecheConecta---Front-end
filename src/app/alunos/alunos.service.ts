import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface Aluno {
  id: string;
  nome: string;
  dataNascimento: string;
  ativo: boolean;
  versao: number;
}

export interface DadosAluno {
  nome: string;
  dataNascimento: string;
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

  cadastrar(dados: DadosAluno) {
    return this.http.post<Aluno>(this.url, dados);
  }

  atualizar(aluno: Aluno, dados: DadosAluno) {
    return this.http.put<Aluno>(`${this.url}/${aluno.id}`, {
      ...dados,
      versao: aluno.versao,
    });
  }

  inativar(aluno: Aluno) {
    return this.http.post<Aluno>(`${this.url}/${aluno.id}/inativar`, {
      versao: aluno.versao,
    });
  }
}
