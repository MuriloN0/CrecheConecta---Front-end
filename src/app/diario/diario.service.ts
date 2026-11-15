import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AlunoDiario, DadosDiario, RegistroDiario } from './diario.model';

interface PaginaDiario {
  content: AlunoDiario[];
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class DiarioService {
  private readonly http = inject(HttpClient);

  consultar(turmaId: string, data: string): Observable<AlunoDiario[]>;
  consultar(turmaId: string, data: string, pagina: number): Observable<PaginaDiario>;
  consultar(turmaId: string, data: string, pagina?: number): Observable<AlunoDiario[] | PaginaDiario> {
    const url = this.caminho(turmaId, data);
    if (pagina === undefined) {
      return this.http.get<AlunoDiario[]>(url);
    }

    return this.http.get<PaginaDiario>(url, { params: { pagina } });
  }

  registrar(turmaId: string, data: string, alunoId: string, dados: DadosDiario) {
    return this.http.put<RegistroDiario>(
      `${this.caminho(turmaId, data)}/alunos/${alunoId}`,
      dados,
    );
  }

  excluir(turmaId: string, data: string, alunoId: string) {
    return this.http.delete<void>(`${this.caminho(turmaId, data)}/alunos/${alunoId}`);
  }

  private caminho(turmaId: string, data: string): string {
    return `/api/turmas/${turmaId}/diarios/${data}`;
  }
}
