import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observacao, SalvarObservacao } from './observacoes.model';

@Injectable({ providedIn: 'root' })
export class ObservacoesApi {
  private readonly http = inject(HttpClient);

  private base(alunoId: string): string {
    return `/api/alunos/${alunoId}/observacoes`;
  }

  listar(alunoId: string) {
    return this.http.get<Observacao[]>(this.base(alunoId));
  }

  visualizar(alunoId: string, observacaoId: string) {
    return this.http.get<Observacao>(`${this.base(alunoId)}/${observacaoId}`);
  }

  cadastrar(alunoId: string, dados: SalvarObservacao) {
    return this.http.post<void>(this.base(alunoId), dados, { observe: 'response' });
  }

  editar(alunoId: string, observacaoId: string, dados: SalvarObservacao) {
    return this.http.put<Observacao>(`${this.base(alunoId)}/${observacaoId}`, dados);
  }

  excluir(alunoId: string, observacaoId: string) {
    return this.http.delete<void>(`${this.base(alunoId)}/${observacaoId}`);
  }
}
