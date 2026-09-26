import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AcaoResponse,
  RecuperacaoConfirmada,
} from '../../../core/models/auth.models';
import { AuthService } from '../../../core/services/auth.service';

type Etapa = 'email' | 'codigo' | 'senha' | 'concluido';

@Component({
  selector: 'app-recuperacao',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './recuperacao.html',
})
export class Recuperacao {
  private readonly auth = inject(AuthService);

  readonly etapa = signal<Etapa>('email');
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly prazo = signal('');

  email = '';
  codigo = '';
  novaSenha = '';
  confirmacaoSenha = '';

  private acao: AcaoResponse | null = null;
  private autorizacao: RecuperacaoConfirmada | null = null;
  private proximoEnvioEm = 0;

  async solicitar(): Promise<void> {
    await this.executar(async () => {
      const segundos = Math.ceil(
        (this.proximoEnvioEm - Date.now()) / 1000,
      );

      if (segundos > 0) {
        this.erro.set(
          `Aguarde ${segundos} segundos antes de solicitar outro código.`,
        );
        return;
      }

      this.acao = await this.auth.solicitarRecuperacao(
        this.email.trim().toLowerCase(),
      );

      this.proximoEnvioEm = Date.now() + 60_000;
      this.codigo = '';
      this.prazo.set(this.acao.expiraEm);
      this.etapa.set('codigo');
    });
  }

  async confirmar(): Promise<void> {
    await this.executar(async () => {
      const acao = this.acao;

      if (!acao || Date.parse(acao.expiraEm) <= Date.now()) {
        this.erro.set('O código expirou. Reinicie a recuperação.');
        return;
      }

      if (!/^[0-9]{6}$/.test(this.codigo)) {
        this.erro.set('Informe os seis dígitos do código.');
        return;
      }

      this.autorizacao = await this.auth.confirmarRecuperacao(
        acao.acaoId,
        this.codigo,
      );

      this.acao = null;
      this.codigo = '';
      this.prazo.set(this.autorizacao.expiraEm);
      this.etapa.set('senha');
    });
  }

  async salvar(): Promise<void> {
    await this.executar(async () => {
      const autorizacao = this.autorizacao;

      if (
        !autorizacao ||
        Date.parse(autorizacao.expiraEm) <= Date.now()
      ) {
        this.erro.set('A autorização expirou. Reinicie a recuperação.');
        return;
      }

      const caracteres = Array.from(this.novaSenha).length;
      const bytes = new TextEncoder().encode(this.novaSenha).length;

      if (
        !this.novaSenha.trim() ||
        caracteres < 12 ||
        bytes > 72
      ) {
        this.erro.set(
          'Use pelo menos 12 caracteres e no máximo 72 bytes. ' +
          'Acentos e emojis podem ocupar mais de um byte.',
        );
        return;
      }

      if (this.novaSenha !== this.confirmacaoSenha) {
        this.erro.set('A nova senha e a confirmação precisam ser iguais.');
        return;
      }

      await this.auth.redefinirSenha({
        redefinicaoId: autorizacao.redefinicaoId,
        tokenRedefinicao: autorizacao.tokenRedefinicao,
        novaSenha: this.novaSenha,
        confirmacaoSenha: this.confirmacaoSenha,
      });

      this.autorizacao = null;
      this.novaSenha = '';
      this.confirmacaoSenha = '';
      this.prazo.set('');

      this.auth.limparSessao();
      this.etapa.set('concluido');
    });
  }

  reiniciar(): void {
    if (this.carregando()) return;

    this.acao = null;
    this.autorizacao = null;
    this.codigo = '';
    this.novaSenha = '';
    this.confirmacaoSenha = '';
    this.erro.set('');
    this.prazo.set('');
    this.etapa.set('email');
  }

  private async executar(operacao: () => Promise<void>): Promise<void> {
    if (this.carregando()) return;

    this.carregando.set(true);
    this.erro.set('');

    try {
      await operacao();
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.carregando.set(false);
    }
  }

  private mensagemErro(erro: unknown): string {
    if (!(erro instanceof HttpErrorResponse)) {
      return 'Não foi possível concluir. Tente novamente.';
    }

    if (erro.status === 0) {
      return 'Não foi possível conectar à API. Confira se ela está rodando.';
    }

    switch (erro.error?.codigo) {
      case 'ACAO_INVALIDA':
        return 'Código ou autorização inválido, expirado ou já utilizado.';
      case 'LIMITE_TENTATIVAS':
        return 'Limite de tentativas atingido. Aguarde antes de tentar novamente.';
      case 'SENHA_INVALIDA':
        return 'Use pelo menos 12 caracteres e no máximo 72 bytes.';
      case 'SENHAS_DIFERENTES':
        return 'A nova senha e a confirmação precisam ser iguais.';
      case 'ENVIO_EMAIL_INDISPONIVEL':
        return 'A recuperação está temporariamente indisponível. Tente mais tarde.';
      case 'DADOS_INVALIDOS':
      case 'REQUISICAO_INVALIDA':
        return 'Confira os campos preenchidos.';
      default:
        return 'Não foi possível concluir a solicitação. Tente novamente.';
    }
  }
}
