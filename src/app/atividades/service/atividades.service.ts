import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  AtividadeResponseDTO,
  AtividadeTurma,
  AtualizarAtividadeRequestDTO,
  NovaAtividadeRequestDTO,
  TipoAtividade,
} from '../model/atividades.model';

interface PaginaAtividades {
  content: AtividadeResponseDTO[];
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class AtividadesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/atividades';

  listarTurmas() {
    return this.http.get<AtividadeTurma[]>(`${this.apiUrl}/turmas`);
  }

  listarPaginadas(turmaId: string, tipo: TipoAtividade, pagina: number) {
    const headers = new HttpHeaders().set('turmaUUID', turmaId);
    const params = new HttpParams().set('pagina', pagina).set('tipo', tipo);

    return this.http.get<PaginaAtividades>(`${this.apiUrl}/paginadas`, {
      headers,
      params,
    });
  }

  visualizar(id: string) {
    return this.http.get<AtividadeResponseDTO>(`${this.apiUrl}/${id}`);
  }

  criar(atividade: NovaAtividadeRequestDTO, turmaId: string) {
    const headers = new HttpHeaders().set('turmaUUID', turmaId);
    return this.http.post<void>(this.apiUrl, atividade, { headers });
  }

  atualizarParcial(id: string, atividade: AtualizarAtividadeRequestDTO) {
    return this.http.patch<void>(`${this.apiUrl}/${id}`, atividade);
  }

  deletar(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
