import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  AtualizarMalaRequest,
  CriarMalaRequest,
  MalaFilho,
  MalaTurma,
  MarcarItemRequest,
  ProgressoAluno,
} from '../model/mala-virtual.model';

@Injectable({ providedIn: 'root' })
export class MalaVirtualService {
  private readonly http = inject(HttpClient);

  private urlTurma(turmaId: string): string {
    return `/api/turmas/${encodeURIComponent(turmaId)}/malas`;
  }

  private urlFilho(alunoId: string): string {
    return `/api/meus-filhos/${encodeURIComponent(alunoId)}/mala`;
  }

  listar(turmaId: string) {
    return this.http.get<MalaTurma[]>(this.urlTurma(turmaId));
  }

  visualizar(turmaId: string, malaId: string) {
    return this.http.get<MalaTurma>(
      `${this.urlTurma(turmaId)}/${encodeURIComponent(malaId)}`,
    );
  }

  criar(turmaId: string, mala: CriarMalaRequest) {
    return this.http.post<MalaTurma>(this.urlTurma(turmaId), mala);
  }

  atualizar(turmaId: string, malaId: string, mala: AtualizarMalaRequest) {
    return this.http.put<MalaTurma>(
      `${this.urlTurma(turmaId)}/${encodeURIComponent(malaId)}`,
      mala,
    );
  }

  excluir(turmaId: string, malaId: string) {
    return this.http.delete<void>(
      `${this.urlTurma(turmaId)}/${encodeURIComponent(malaId)}`,
    );
  }

  progresso(turmaId: string, malaId: string) {
    return this.http.get<ProgressoAluno[]>(
      `${this.urlTurma(turmaId)}/${encodeURIComponent(malaId)}/progresso`,
    );
  }

  listarDoFilho(alunoId: string) {
    return this.http.get<MalaFilho[]>(this.urlFilho(alunoId));
  }

  marcarItem(
    alunoId: string,
    malaId: string,
    itemId: string,
    marcacao: MarcarItemRequest,
  ) {
    return this.http.put<MalaFilho>(
      `${this.urlFilho(alunoId)}/${encodeURIComponent(malaId)}/itens/${encodeURIComponent(itemId)}`,
      marcacao,
    );
  }
}
