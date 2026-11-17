import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Perfil } from '../core/models/auth.models';

export interface ContatoChat {
  id: string;
  nome: string;
  perfil: Perfil;
  ultimaMensagemEm: string | null;
}

export interface MensagemChat {
  id: string;
  autorId: string;
  texto: string;
  criadaEm: string;
  ordem: string;
  minhaFavorita: boolean;
  preservada: boolean;
}

export interface PaginaContatosChat {
  itens: ContatoChat[];
  temProxima: boolean;
}

export interface PaginaMensagensChat {
  itens: MensagemChat[];
  cursorAnterior: string | null;
}

@Injectable({ providedIn: 'root' })
export class ConversasService {
  private readonly http = inject(HttpClient);

  contatos(busca: string, pagina: number, somenteConversas: boolean) {
    return this.http.get<PaginaContatosChat>('/api/chat/contatos', {
      params: { busca, pagina, somenteConversas },
    });
  }

  mensagens(contato: string, antes?: string) {
    return this.http.get<PaginaMensagensChat>(this.url(contato), {
      params: antes ? { antes } : {},
    });
  }

  enviar(contato: string, texto: string) {
    return this.http.post<MensagemChat>(this.url(contato), { texto });
  }

  alterarFavorito(contato: string, mensagem: string, favorita: boolean) {
    return this.http.post<void>(this.url(contato), { favorita }, {
      params: { favorito: mensagem },
    });
  }

  private url(contato: string): string {
    return `/api/chat/contatos/${encodeURIComponent(contato)}/mensagens`;
  }
}
