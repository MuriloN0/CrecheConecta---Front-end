import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface AlunoChamada {
  alunoId: string;
  nome: string;
  presente: boolean | null;
  versao: number | null;
}

interface PaginaChamada {
  content: AlunoChamada[];
  totalPages: number;
}

interface PresencaRegistrada {
  alunoId: string;
  presente: boolean | null;
  versao: number;
}

@Injectable({ providedIn: 'root' })
export class ChamadaService {
  private readonly http = inject(HttpClient);

  consultar(turmaId: string, data: string, pagina: number) {
    return this.http.get<PaginaChamada>(this.caminho(turmaId, data), {
      params: { pagina, tamanho: 20 },
    });
  }

  registrar(turmaId: string, data: string, aluno: AlunoChamada, presente: boolean | null) {
    const dados = presente === null
      ? { limpar: true, versao: aluno.versao }
      : { presente, versao: aluno.versao };

    return this.http.put<PresencaRegistrada>(
      `${this.caminho(turmaId, data)}/alunos/${aluno.alunoId}`,
      dados,
    );
  }

  private caminho(turmaId: string, data: string): string {
    return `/api/turmas/${turmaId}/chamadas/${data}`;
  }
}
