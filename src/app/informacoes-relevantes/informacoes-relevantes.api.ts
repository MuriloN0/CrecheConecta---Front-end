import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { FichaSaude, FichaSaudeResumo, SalvarFichaSaude } from './saude.model';

@Injectable({ providedIn: 'root' })
export class SaudeApi {
  private readonly http = inject(HttpClient);

  private base(alunoId: string): string {
    return `/api/alunos/${alunoId}/fichas-saude`;
  }

  listar(alunoId: string) {
    return this.http.get<FichaSaudeResumo[]>(this.base(alunoId));
  }

  visualizar(alunoId: string, fichaId: string) {
    return this.http.get<FichaSaude>(`${this.base(alunoId)}/${fichaId}`);
  }

  cadastrar(alunoId: string, dados: SalvarFichaSaude) {
    return this.http.post<void>(this.base(alunoId), dados);
  }

  editar(alunoId: string, fichaId: string, dados: SalvarFichaSaude) {
    return this.http.put<FichaSaude>(`${this.base(alunoId)}/${fichaId}`, dados);
  }

  excluir(alunoId: string, fichaId: string) {
    return this.http.delete<void>(`${this.base(alunoId)}/${fichaId}`);
  }
}
