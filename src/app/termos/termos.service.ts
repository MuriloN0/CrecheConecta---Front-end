import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { DadosTermo, TermoVersao } from './termos.model';

@Injectable({ providedIn: 'root' })
export class TermosService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/termos';

  listar() {
    return this.http.get<TermoVersao[]>(this.url);
  }

  criar(dados: DadosTermo) {
    return this.http.post<TermoVersao>(this.url, dados);
  }

  atualizar(termo: TermoVersao, dados: DadosTermo) {
    return this.http.put<TermoVersao>(`${this.url}/${termo.id}`, {
      ...dados,
      versao: termo.versao,
    });
  }

  excluir(termo: TermoVersao) {
    return this.http.delete<void>(`${this.url}/${termo.id}`);
  }

  publicar(termo: TermoVersao) {
    return this.http.post<TermoVersao>(`${this.url}/${termo.id}/publicar`, {
      versao: termo.versao,
    });
  }
}
