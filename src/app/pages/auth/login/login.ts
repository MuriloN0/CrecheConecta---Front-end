import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AcaoResponse } from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './login.html',

})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly etapa = signal<'credenciais' | 'codigo'>('credenciais');
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly acao = signal<AcaoResponse | null>(null);

  email = '';
  senha = '';
  codigo = '';

  private proximoEnvioEm = 0;

  async entrar(): Promise<void> {
    if (this.carregando()) return;

    this.erro.set('');

    const segundos = Math.ceil(
      (this.proximoEnvioEm - Date.now()) / 1000,
    );

    if (segundos > 0) {
      this.erro.set(
        `Aguarde ${segundos} segundos antes de solicitar outro código.`,
      );
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
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }

  async confirmar(): Promise<void> {
    if (this.carregando()) return;

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
      this.erro.set(this.mensagemErro(erro));
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
        return 'E-mail ou senha inválidos, ou acesso temporariamente bloqueado.';
      case 429:
        return 'Limite de tentativas atingido. Aguarde antes de tentar novamente.';
      case 503:
        return 'O envio de e-mail está indisponível. Tente mais tarde.';
      default:
        return 'Não foi possível concluir a solicitação. Tente novamente.';
    }
  }
}
