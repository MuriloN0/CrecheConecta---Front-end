import { DatePipe, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AcaoResponse } from '../../../core/models/auth.models';
import { AuthService, AvisoSessao } from '../../../core/services/auth.service';

const BLOQUEIO_CODIGO_MS = 5 * 60_000;
const CHAVE_BLOQUEIO_CODIGO = 'crecheconecta.login.bloqueio-codigo';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  readonly avisoSessao = inject(AvisoSessao);
  private readonly dialogo = viewChild<ElementRef<HTMLDialogElement>>('dialogoSessao');
  private readonly abrirAviso = effect(() => {
    const dialogo = this.dialogo()?.nativeElement;

    if (this.avisoSessao.expirou() && dialogo && !dialogo.open) {
      dialogo.showModal();
    }
  });

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly documento = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);

  readonly etapa = signal<'credenciais' | 'codigo'>('credenciais');
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly acao = signal<AcaoResponse | null>(null);

  private readonly segundosBloqueados = signal(0);
  readonly bloqueado = computed(() => this.segundosBloqueados() > 0);
  readonly tempoBloqueio = computed(() => {
    const segundos = this.segundosBloqueados();
    const minutos = Math.floor(segundos / 60);

    return `${minutos}:${String(segundos % 60).padStart(2, '0')}`;
  });

  email = '';
  senha = '';
  codigo = '';

  private proximoEnvioEm = 0;
  private bloqueadoAte = 0;
  private contadorBloqueio?: ReturnType<typeof setInterval>;

  constructor() {
    this.bloqueadoAte = this.lerPrazoBloqueio();
    this.iniciarContagem();

    this.destroy.onDestroy(() => clearInterval(this.contadorBloqueio));
  }

  async entrar(): Promise<void> {
    if (this.carregando()) return;

    this.atualizarContagem();
    if (this.bloqueado()) return;

    this.erro.set('');

    const segundos = Math.ceil((this.proximoEnvioEm - Date.now()) / 1000);

    if (segundos > 0) {
      const espera = segundos === 1 ? '1 segundo' : `${segundos} segundos`;
      this.erro.set(`Aguarde ${espera} antes de solicitar outro código.`);
      return;
    }

    this.carregando.set(true);

    try {
      const resposta = await this.auth.iniciarLogin(
        this.email.trim().toLowerCase(),
        this.senha,
      );

      this.acao.set(resposta);
      this.senha = '';
      this.codigo = '';
      this.proximoEnvioEm = Date.now() + 60_000;
      this.etapa.set('codigo');
    } catch (erro: unknown) {
      if (
        erro instanceof HttpErrorResponse &&
        erro.status === 429 &&
        ['LOGIN_BLOQUEADO', 'RATE_LIMIT_EXCEDIDO'].includes(erro.error?.codigo)
      ) {
        const segundos: unknown = erro.error.segundosRestantes;

        if (
          typeof segundos === 'number' &&
          Number.isSafeInteger(segundos) &&
          segundos > 0
        ) {
          this.aplicarBloqueio(segundos * 1000);
        } else {
          this.erro.set(this.mensagemErro(erro));
        }
      } else {
        this.erro.set(this.mensagemErro(erro));
      }
    } finally {
      this.carregando.set(false);
    }
  }

  async confirmar(): Promise<void> {
    if (this.carregando() || this.bloqueado()) return;

    this.erro.set('');

    const acao = this.acao();

    if (!acao || Date.parse(acao.expiraEm) <= Date.now()) {
      this.erro.set('O código expirou. Volte e solicite um novo.');
      return;
    }

    if (!/^[0-9]{6}$/.test(this.codigo)) {
      this.erro.set('Informe os seis dígitos do código.');
      return;
    }

    this.carregando.set(true);

    try {
      await this.auth.confirmarLogin(acao.acaoId, this.codigo);

      this.codigo = '';
      this.acao.set(null);

      await this.router.navigateByUrl('/home');
    } catch (erro: unknown) {
      if (erro instanceof HttpErrorResponse && erro.status === 429) {
        this.senha = '';

        if (erro.error?.codigo === 'RATE_LIMIT_EXCEDIDO') {
          const segundos: unknown = erro.error.segundosRestantes;

          if (
            typeof segundos === 'number' &&
            Number.isSafeInteger(segundos) &&
            segundos > 0
          ) {
            this.aplicarBloqueio(segundos * 1000);
          } else {
            this.erro.set(this.mensagemErro(erro));
          }
        } else {
          this.aplicarBloqueio(BLOQUEIO_CODIGO_MS);
        }
      } else {
        this.erro.set(this.mensagemErro(erro));
      }
    } finally {
      this.carregando.set(false);
    }
  }

  voltar(): void {
    if (this.carregando()) return;

    this.codigo = '';
    this.senha = '';
    this.acao.set(null);
    this.erro.set('');
    this.etapa.set('credenciais');
  }

  private aplicarBloqueio(duracaoMs: number): void {
    this.codigo = '';
    this.acao.set(null);
    this.etapa.set('credenciais');
    this.bloqueadoAte = Date.now() + duracaoMs;
    this.salvarPrazoBloqueio();
    this.iniciarContagem();
  }

  private iniciarContagem(): void {
    clearInterval(this.contadorBloqueio);
    this.atualizarContagem();

    if (this.bloqueado()) {
      this.contadorBloqueio = setInterval(
        () => this.atualizarContagem(),
        250,
      );
    }
  }

  private atualizarContagem(): void {
    const segundos = Math.max(
      0,
      Math.ceil((this.bloqueadoAte - Date.now()) / 1000),
    );

    this.segundosBloqueados.set(segundos);

    if (segundos === 0 && this.bloqueadoAte !== 0) {
      this.bloqueadoAte = 0;
      clearInterval(this.contadorBloqueio);
      this.salvarPrazoBloqueio();
    }
  }

  private lerPrazoBloqueio(): number {
    try {
      const valor = this.documento.defaultView?.sessionStorage.getItem(
        CHAVE_BLOQUEIO_CODIGO,
      );

      const prazo = Number(valor);

      return Number.isSafeInteger(prazo) && prazo > Date.now()
        ? prazo
        : 0;
    } catch {
      return 0;
    }
  }

  private salvarPrazoBloqueio(): void {
    try {
      const armazenamento = this.documento.defaultView?.sessionStorage;

      if (this.bloqueadoAte > 0) {
        armazenamento?.setItem(
          CHAVE_BLOQUEIO_CODIGO,
          String(this.bloqueadoAte),
        );
      } else {
        armazenamento?.removeItem(CHAVE_BLOQUEIO_CODIGO);
      }
    } catch {
    }
  }

  private mensagemErro(erro: unknown): string {
    if (!(erro instanceof HttpErrorResponse)) {
      return 'Não foi possível concluir. Tente novamente.';
    }

    switch (erro.status) {
      case 0:
        return 'Não foi possível conectar à API. Confira se ela está rodando.';
      case 400:
        return 'Confira os dados. O código pode estar incorreto, expirado ou já utilizado.';
      case 401:
        return 'E-mail ou senha inválidos.';
      case 409:
        return 'Não foi possível confirmar o acesso. Solicite um novo código e tente novamente.';
      case 429:
        return 'Limite de tentativas atingido. Aguarde antes de tentar novamente.';
      case 503:
        return 'O envio de e-mail está indisponível. Tente mais tarde.';
      default:
        return 'Não foi possível concluir a solicitação. Tente novamente.';
    }
  }
}
