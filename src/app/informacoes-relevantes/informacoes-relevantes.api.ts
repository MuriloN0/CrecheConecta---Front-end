import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { InformacaoRelevante, InformacaoRelevanteResumo, SalvarInformacaoRelevante } from './informacoes-relevantes.model';

@Injectable({ providedIn: 'root' })
export class InformacoesRelevantesApi {
  private readonly http = inject(HttpClient);

  private base(alunoId: string): string {
    return `/api/alunos/${alunoId}/informacoes-relevantes`;
  }

  listar(alunoId: string) {
    return this.http.get<InformacaoRelevanteResumo[]>(this.base(alunoId));
  }

  visualizar(alunoId: string, informacaoId: string) {
    return this.http.get<InformacaoRelevante>(`${this.base(alunoId)}/${informacaoId}`);
  }

  cadastrar(alunoId: string, dados: SalvarInformacaoRelevante) {
    return this.http.post<void>(this.base(alunoId), dados);
  }

  editar(alunoId: string, informacaoId: string, dados: SalvarInformacaoRelevante) {
    return this.http.put<InformacaoRelevante>(`${this.base(alunoId)}/${informacaoId}`, dados);
  }

  excluir(alunoId: string, informacaoId: string) {
    return this.http.delete<void>(`${this.base(alunoId)}/${informacaoId}`);
  }
}
