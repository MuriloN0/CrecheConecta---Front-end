import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { DestroyRef, inject, Injectable, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AcaoResponse,
  RecuperacaoConfirmada,
  RedefinirSenhaRequest,
  SessaoResponse,
  UsuarioLogado,
} from '../models/auth.models';

const INTERVALO_RENOVACAO_MS = 60_000;
const JANELA_APOS_EXPIRACAO_DO_ACESSO_MS = 35 * 60_000;
const CABECALHO_RENOVACAO = { 'X-CrecheConecta-Refresh': '1' };
const CHAVE_TROCA_SESSAO = 'crecheconecta.troca-sessao';

@Injectable({ providedIn: 'root' })
export class AvisoSessao {
  readonly expirou = signal(false);
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly aviso = inject(AvisoSessao);
  private readonly documento = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zona = inject(NgZone);

  private readonly usuarioInterno = signal<UsuarioLogado | null>(null);
  readonly usuario = this.usuarioInterno.asReadonly();

  private token: string | null = null;
  private usuarioIdDaSessao: string | null = null;
  private acessoExpiraEm = 0;
  private sessaoExpiraEm = 0;
  private renovarAPartirDe = 0;
  private renovacao: Promise<string | null> | null = null;
  private temporizador?: ReturnType<typeof setTimeout>;
  private geracao = 0;
  private saindo = false;

  constructor() {
    const eventos = ['pointerdown', 'keydown', 'scroll'];
    const janela = this.documento.defaultView;

    try {
      janela?.sessionStorage.removeItem('crecheconecta.sessao');
    } catch {
      // O navegador pode bloquear o acesso ao armazenamento.
    }

    this.zona.runOutsideAngular(() => {
      janela?.addEventListener('storage', this.receberTrocaDeSessao);

      for (const evento of eventos) {
        this.documento.addEventListener(evento, this.registrarAtividade, {
          capture: true,
          passive: true,
        });
      }
    });

    this.destroyRef.onDestroy(() => {
      janela?.removeEventListener('storage', this.receberTrocaDeSessao);

      for (const evento of eventos) {
        this.documento.removeEventListener(evento, this.registrarAtividade, true);
      }

      this.limparSessao();
    });
  }

  iniciarLogin(email: string, senha: string): Promise<AcaoResponse> {
    return firstValueFrom(this.http.post<AcaoResponse>('/api/auth/login', { email, senha }));
  }

  async confirmarLogin(acaoId: string, codigo: string): Promise<void> {
    const geracao = this.geracao;
    const sessao = await firstValueFrom(
      this.http.post<SessaoResponse>(
        '/api/auth/confirmar-login',
        { acaoId, codigo },
        { headers: CABECALHO_RENOVACAO },
      ),
    );

    if (geracao !== this.geracao) {
      throw new Error('A confirmação da sessão foi interrompida.');
    }

    this.limparSessao();
    this.aplicarSessao(sessao);
    this.aviso.expirou.set(false);
    this.publicarTrocaDeSessao();
  }

  possuiSessao(): boolean {
    return this.token !== null && this.sessaoExpiraEm > Date.now();
  }

  obterToken(): string | null {
    return this.acessoExpiraEm > Date.now() ? this.token : null;
  }

  async restaurarSessao(): Promise<boolean> {
    if (this.saindo) return false;
    if (this.obterToken()) return true;

    return (await this.renovarSessao()) !== null;
  }

  aguardarRenovacao(): Promise<string | null> {
    return this.renovacao ?? Promise.resolve(this.obterToken());
  }

  identificarSessao(): number {
    return this.geracao;
  }

  async carregarUsuario(): Promise<UsuarioLogado> {
    const geracao = this.geracao;
    const token = await this.aguardarRenovacao();

    if (!token || geracao !== this.geracao) {
      throw new Error('Sessão indisponível.');
    }

    const usuario = await firstValueFrom(
      this.http.get<UsuarioLogado>('/api/auth/me', {
        headers: this.cabecalhos(token),
      }),
    );

    if (geracao !== this.geracao) {
      throw new Error('A sessão foi encerrada.');
    }

    this.usuarioInterno.set(usuario);
    return usuario;
  }

  solicitarRecuperacao(email: string): Promise<AcaoResponse> {
    return firstValueFrom(this.http.post<AcaoResponse>('/api/auth/esqueci-senha', { email }));
  }

  confirmarRecuperacao(acaoId: string, codigo: string): Promise<RecuperacaoConfirmada> {
    return firstValueFrom(
      this.http.post<RecuperacaoConfirmada>('/api/auth/confirmar-recuperacao', { acaoId, codigo }),
    );
  }

  redefinirSenha(dados: RedefinirSenhaRequest): Promise<void> {
    return firstValueFrom(this.http.post<void>('/api/auth/redefinir-senha', dados));
  }

  async logout(): Promise<void> {
    if (this.saindo) return;
    this.saindo = true;

    try {
      let token = await this.aguardarRenovacao();
      if (!token && this.possuiSessao()) {
        token = await this.renovarSessao();
      }

      if (token) {
        await firstValueFrom(
          this.http.post<void>('/api/auth/logout', {}, { headers: this.cabecalhos(token) }),
        );
      }

      this.limparSessao();
    } finally {
      this.saindo = false;
    }
  }

  limparSessao(): void {
    this.geracao++;
    this.renovacao = null;
    this.token = null;
    this.usuarioIdDaSessao = null;
    this.acessoExpiraEm = 0;
    this.sessaoExpiraEm = 0;
    this.renovarAPartirDe = 0;
    this.usuarioInterno.set(null);

    if (this.temporizador !== undefined) {
      clearTimeout(this.temporizador);
      this.temporizador = undefined;
    }
  }

  private publicarTrocaDeSessao(): void {
    try {
      const janela = this.documento.defaultView;
      if (janela) {
        janela.localStorage.setItem(CHAVE_TROCA_SESSAO, janela.crypto.randomUUID());
      }
    } catch {
      // A revogação no servidor continua valendo com o armazenamento indisponível.
    }
  }

  private readonly receberTrocaDeSessao = (evento: StorageEvent): void => {
    if (evento.key !== CHAVE_TROCA_SESSAO || evento.newValue === null) return;
    if (this.token === null && this.renovacao === null) return;

    this.zona.run(() => this.encerrarSessao(false));
  };

  private readonly registrarAtividade = (evento: Event): void => {
    if (
      !evento.isTrusted ||
      this.documento.visibilityState !== 'visible' ||
      this.saindo ||
      !this.possuiSessao() ||
      Date.now() < this.renovarAPartirDe
    ) {
      return;
    }

    this.renovarAPartirDe = Date.now() + INTERVALO_RENOVACAO_MS;

    this.zona.run(() => {
      // Se houver falha de rede, uma próxima interação pode tentar novamente.
      void this.renovarSessao().catch(() => {});
    });
  };

  private renovarSessao(): Promise<string | null> {
    if (this.renovacao) return this.renovacao;

    const geracao = this.geracao;
    const pendente = this.solicitarRenovacao(geracao).finally(() => {
      if (this.renovacao === pendente) this.renovacao = null;
    });

    this.renovacao = pendente;
    return pendente;
  }

  private async solicitarRenovacao(geracao: number): Promise<string | null> {
    try {
      const sessao = await firstValueFrom(
        this.http.post<SessaoResponse>(
          '/api/auth/refresh',
          {},
          { headers: CABECALHO_RENOVACAO },
        ),
      );

      if (geracao !== this.geracao) return null;

      if (this.usuarioIdDaSessao !== null && sessao.usuarioId !== this.usuarioIdDaSessao) {
        this.encerrarSessao(false);
        return null;
      }

      this.aplicarSessao(sessao);
      return sessao.accessToken;
    } catch (erro) {
      if (!(erro instanceof HttpErrorResponse) || erro.status !== 401) throw erro;

      if (geracao === this.geracao && this.token) {
        if (this.saindo) {
          this.limparSessao();
        } else {
          this.encerrarSessao(true);
        }
      }

      return null;
    }
  }

  private aplicarSessao(sessao: SessaoResponse): void {
    const acessoExpiraEm = Date.parse(sessao.expiraEm);
    const agora = Date.now();

    if (!sessao.accessToken || !Number.isFinite(acessoExpiraEm) || acessoExpiraEm <= agora) {
      throw new Error('A sessão recebida já expirou.');
    }

    this.token = sessao.accessToken;
    this.usuarioIdDaSessao = sessao.usuarioId;
    this.acessoExpiraEm = acessoExpiraEm;
    this.sessaoExpiraEm = acessoExpiraEm + JANELA_APOS_EXPIRACAO_DO_ACESSO_MS;
    this.renovarAPartirDe = agora + INTERVALO_RENOVACAO_MS;

    if (this.temporizador !== undefined) clearTimeout(this.temporizador);

    const geracao = this.geracao;
    this.temporizador = setTimeout(() => {
      if (geracao === this.geracao) this.encerrarSessao(true);
    }, Math.max(0, this.sessaoExpiraEm - Date.now()));
  }

  private encerrarSessao(expirou: boolean): void {
    this.limparSessao();
    this.aviso.expirou.set(expirou);
    void this.router.navigateByUrl('/login');
  }

  private cabecalhos(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
