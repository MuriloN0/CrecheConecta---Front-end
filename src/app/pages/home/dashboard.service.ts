import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { Comunicado } from '../../comunicados/comunicados.service';

interface PaginaDashboard<T> {
  content: T[];
  totalElements: number;
}

export interface ResumoDirecao {
  alunosAtivos: number;
  alunosInativos: number;
  turmasAtivas: number;
  turmasInativas: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  consultarResumoDirecao() {
    return forkJoin({
      alunosAtivos: this.contar('/api/alunos', true),
      alunosInativos: this.contar('/api/alunos', false),
      turmasAtivas: this.contar('/api/turmas', true),
      turmasInativas: this.contar('/api/turmas', false),
    });
  }

  consultarMural() {
    return this.http.get<PaginaDashboard<Comunicado>>('/api/comunicados', {
      params: { pagina: 0, tamanho: 3 },
    });
  }

  private contar(url: '/api/alunos' | '/api/turmas', ativo: boolean) {
    return this.http.get<PaginaDashboard<unknown>>(url, {
      params: { pagina: 0, tamanho: 1, ativo },
    }).pipe(
      map((pagina) => pagina.totalElements),
    );
  }
}
