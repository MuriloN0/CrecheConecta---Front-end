import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AlunoDiario, DadosDiario, RegistroDiario } from './diario.model';

@Injectable({ providedIn: 'root' })
export class DiarioService {
  private readonly http = inject(HttpClient);

  consultar(turmaId: string, data: string) {
    return this.http.get<AlunoDiario[]>(this.caminho(turmaId, data));
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
