import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import {
  AtenderSolicitacaoRequest,
  AtualizarSolicitacaoRequest,
  CancelarSolicitacaoRequest,
  CriarSolicitacaoRequest,
  DetalheSolicitacao,
  EnviarMensagemRequest,
  FiltrosSolicitacao,
  PaginaSolicitacoes,
  RecusarSolicitacaoRequest,
  SolicitacaoMaterial,
} from '../model/solicitacao-material.model';

export const TAMANHO_PAGINA_SOLICITACOES = 20;

@Injectable({ providedIn: 'root' })
export class SolicitacaoMaterialService {
  private readonly http = inject(HttpClient);

  private readonly url = '/api/solicitacoes-materiais';


  listar(pagina: number, filtros: FiltrosSolicitacao) {
    const params: Record<string, string | number> = {
      pagina,
      tamanho: TAMANHO_PAGINA_SOLICITACOES,
    };

    if (filtros.status) {
      params['status'] = filtros.status;
    }

    if (filtros.prioridade) {
      params['prioridade'] = filtros.prioridade;
    }

    return this.http.get<PaginaSolicitacoes>(this.url, { params });
  }

  visualizar(id: string) {
    const url = this.urlDaSolicitacao(id);

    return this.http.get<DetalheSolicitacao>(url);
  }

  criar(dados: CriarSolicitacaoRequest) {
    return this.http.post<SolicitacaoMaterial>(this.url, dados);
  }

  atualizar(id: string, dados: AtualizarSolicitacaoRequest) {
    const url = this.urlDaSolicitacao(id);

    return this.http.put<SolicitacaoMaterial>(url, dados);
  }


  enviarMensagem(id: string, dados: EnviarMensagemRequest) {
    const url = `${this.urlDaSolicitacao(id)}/mensagens`;

    return this.http.post<DetalheSolicitacao>(url, dados);
  }

  atender(id: string, dados: AtenderSolicitacaoRequest) {
    const url = `${this.urlDaSolicitacao(id)}/atender`;

    return this.http.post<SolicitacaoMaterial>(url, dados);
  }

  recusar(id: string, dados: RecusarSolicitacaoRequest) {
    const url = `${this.urlDaSolicitacao(id)}/recusar`;

    return this.http.post<SolicitacaoMaterial>(url, dados);
  }

  cancelar(id: string, dados: CancelarSolicitacaoRequest) {
    const url = `${this.urlDaSolicitacao(id)}/cancelar`;

    return this.http.post<SolicitacaoMaterial>(url, dados);
  }


  private urlDaSolicitacao(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }
}
