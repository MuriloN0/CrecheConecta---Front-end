import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { Comunicado } from '../comunicados/comunicados.service';

export interface NotificacaoComunicado {
  comunicadoId: string;
  titulo: string;
  criadaEm: string;
  lida: boolean;
}

export interface PaginaNotificacoes {
  itens: NotificacaoComunicado[];
  temProxima: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificacoesService {
  private readonly http = inject(HttpClient);
  private readonly total = signal<number | null>(null);
  readonly pendentes = this.total.asReadonly();

  atualizarTotal() {
    return this.http.get<{ total: number }>('/api/notificacoes/pendencias').pipe(
      tap({
        next: ({ total }) => this.total.set(total),
        error: () => this.total.set(null),
      }),
    );
  }

  listar(pagina: number) {
    return this.http.get<PaginaNotificacoes>('/api/notificacoes', { params: { pagina } });
  }

  lerComunicado(id: string) {
    return this.http.get<Comunicado>(`/api/comunicados/${encodeURIComponent(id)}`);
  }

  marcarLida(id: string) {
    return this.http.put<void>(`/api/notificacoes/${encodeURIComponent(id)}/leitura`, {});
  }
}
