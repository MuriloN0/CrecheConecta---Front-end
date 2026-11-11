import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface ContaDirecao {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  situacaoCadastro: string;
  versao: number;
}

interface PaginaDirecao {
  content: ContaDirecao[];
  totalPages: number;
}

interface DadosConviteDirecao {
  nome: string;
  email: string;
  expiraEm: string;
}

@Injectable({ providedIn: 'root' })
export class DirecaoService {
  private readonly http = inject(HttpClient);
  private readonly url = '/api/direcao';
  private readonly cadastroUrl = '/api/cadastro/direcao';

  listar(pagina: number) {
    return this.http.get<PaginaDirecao>(this.url, {
      params: { pagina, tamanho: 20 },
    });
  }

  minhaConta() {
    return this.http.get<ContaDirecao>(`${this.url}/me`);
  }

  atualizarMinhaConta(nome: string, telefone: string, versao: number) {
    return this.http.put<ContaDirecao>(`${this.url}/me`, {
      nome,
      telefone,
      versao,
    });
  }

  inativarMinhaConta(versao: number) {
    return this.http.post<ContaDirecao>(`${this.url}/me/inativar`, { versao });
  }

  convidar(nome: string, email: string) {
    return this.http.post<{ mensagem: string }>(`${this.url}/convites`, {
      nome,
      email,
    });
  }

  consultarConvite(token: string) {
    return this.http.post<DadosConviteDirecao>(
      `${this.cadastroUrl}/consultar-convite`,
      { token },
    );
  }

  concluirCadastro(token: string, telefone: string, senha: string) {
    return this.http.post<{ usuarioId: string; mensagem: string }>(
      `${this.cadastroUrl}/concluir`,
      { token, telefone, senha },
    );
  }
}
