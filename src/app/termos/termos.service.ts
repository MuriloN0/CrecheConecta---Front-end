import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { DadosTermo, StatusTermo, TermoVersao } from './termos.model';

interface PaginaTermos {
  content: TermoVersao[];
  totalPages: number;
  vigente: TermoVersao | null;
}

@Injectable({ providedIn: 'root' })
export class TermosService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/termos';

  listar(pagina: number, status: StatusTermo | '') {
    const params: Record<string, string | number> = { pagina };
    if (status) params['status'] = status;

    return this.http.get<PaginaTermos>(`${this.url}/paginados`, { params });
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
