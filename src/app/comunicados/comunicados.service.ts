import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  criadoEm: string;
  atualizadoEm: string;
  ativo: boolean;
  versao: number;
}

interface DadosComunicado {
  titulo: string;
  conteudo: string;
}

interface PaginaComunicados {
  content: Comunicado[];
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ComunicadosService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/comunicados';

  listar(pagina: number) {
    return this.http.get<PaginaComunicados>(this.url, {
      params: { pagina, tamanho: 20 },
    });
  }

  criar(dados: DadosComunicado) {
    return this.http.post<Comunicado>(this.url, dados);
  }

  atualizar(comunicado: Comunicado, dados: DadosComunicado) {
    return this.http.put<Comunicado>(`${this.url}/${comunicado.id}`, {
      ...dados,
      versao: comunicado.versao,
    });
  }

  inativar(comunicado: Comunicado) {
    return this.http.post<Comunicado>(
      `${this.url}/${comunicado.id}/inativar`,
      { versao: comunicado.versao },
    );
  }
}
