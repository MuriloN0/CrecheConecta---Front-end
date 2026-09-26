import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AcaoResponse,
  RecuperacaoConfirmada,
  RedefinirSenhaRequest,
  SessaoResponse,
  UsuarioLogado,
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly usuarioInterno = signal<UsuarioLogado | null>(null);

  readonly usuario = this.usuarioInterno.asReadonly();

  private token: string | null = null;
  private expiraEm = 0;
  private temporizador?: ReturnType<typeof setTimeout>;

  iniciarLogin(email: string, senha: string): Promise<AcaoResponse> {
    return firstValueFrom(
      this.http.post<AcaoResponse>('/api/auth/login', { email, senha }),
    );
  }

  async confirmarLogin(acaoId: string, codigo: string): Promise<void> {
    const sessao = await firstValueFrom(
      this.http.post<SessaoResponse>('/api/auth/confirmar-login', {
        acaoId,
        codigo,
      }),
    );

    this.limparSessao();

    this.token = sessao.accessToken;
    this.expiraEm = Date.parse(sessao.expiraEm);

    if (!Number.isFinite(this.expiraEm) || this.expiraEm <= Date.now()) {
      this.limparSessao();
      throw new Error('A sessão recebida já expirou.');
    }

    this.temporizador = setTimeout(() => {
      this.limparSessao();
      void this.router.navigateByUrl('/login');
    }, this.expiraEm - Date.now());
  }

  possuiSessao(): boolean {
    return this.token !== null && this.expiraEm > Date.now();
  }

  async carregarUsuario(): Promise<UsuarioLogado> {
    if (!this.possuiSessao()) {
      throw new Error('Sessão indisponível.');
    }

    const usuario = await firstValueFrom(
      this.http.get<UsuarioLogado>('/api/auth/me', {
        headers: this.cabecalhos(),
      }),
    );

    this.usuarioInterno.set(usuario);
    return usuario;
  }

  solicitarRecuperacao(email: string): Promise<AcaoResponse> {
    return firstValueFrom(
      this.http.post<AcaoResponse>('/api/auth/esqueci-senha', { email }),
    );
  }

  confirmarRecuperacao(
    acaoId: string,
    codigo: string,
  ): Promise<RecuperacaoConfirmada> {
    return firstValueFrom(
      this.http.post<RecuperacaoConfirmada>(
        '/api/auth/confirmar-recuperacao',
        { acaoId, codigo },
      ),
    );
  }

  redefinirSenha(dados: RedefinirSenhaRequest): Promise<void> {
    return firstValueFrom(
      this.http.post<void>('/api/auth/redefinir-senha', dados),
    );
  }

  async logout(): Promise<void> {
    if (this.possuiSessao()) {
      await firstValueFrom(
        this.http.post<void>(
          '/api/auth/logout',
          {},
          { headers: this.cabecalhos() },
        ),
      );
    }

    this.limparSessao();
  }

  limparSessao(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = undefined;
    }

    this.token = null;
    this.expiraEm = 0;
    this.usuarioInterno.set(null);
  }

  private cabecalhos(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`,
    });
  }
}
