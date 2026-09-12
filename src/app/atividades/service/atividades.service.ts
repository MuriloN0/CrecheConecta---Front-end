import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AtividadeResponseDTO, NovaAtividadeRequestDTO } from '../model/atividades.model';

@Injectable({
  providedIn: 'root'
})
export class AtividadesService {
  private apiUrl = '/api/atividades';

  constructor(private http: HttpClient) {}

  listarTodas(turmaId?: string, tipo?: 'CASA' | 'DIA'): Observable<AtividadeResponseDTO[]> {
    let headers = new HttpHeaders();
    if (turmaId) {
      headers = headers.set('turmaUUID', turmaId);
    }

    let params = new HttpParams();
    if (tipo) {
      params = params.set('tipo', tipo);
    }

    return this.http.get<AtividadeResponseDTO[]>(this.apiUrl, { headers, params });
  }

  criar(atividade: NovaAtividadeRequestDTO, turmaId: string): Observable<void> {
    const headers = new HttpHeaders().set('turmaUUID', turmaId);
    return this.http.post<void>(this.apiUrl, atividade, { headers });
  }

  atualizarParcial(id: string, atividade: any): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}`, atividade);
  }

  deletar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}