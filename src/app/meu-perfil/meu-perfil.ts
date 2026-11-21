import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { RevogarAceite } from './revogar-aceite';

interface DadosPerfil {
  nome: string;
  email: string;
  telefone: string | null;
  perfil: 'PROFESSOR' | 'RESPONSAVEL';
}

@Component({
  selector: 'app-meu-perfil',
  standalone: true,
  imports: [FormsModule, RevogarAceite],
  template: `
    <button type="button" aria-haspopup="dialog" [class]="botao" (click)="abrir(dialogo)">
      Meu perfil
    </button>

    <dialog #dialogo aria-labelledby="titulo-meu-perfil" (cancel)="cancelar($event)"
      (close)="limparFormularios()"
      class="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl
             overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5
             text-creche-texto shadow-xl backdrop:bg-stone-900/50 sm:p-6">
      <header class="mb-4 flex items-center justify-between gap-3">
        <h2 id="titulo-meu-perfil" class="text-xl font-bold">Meu perfil</h2>
        <button type="button" autofocus [class]="botao" [disabled]="ocupada()" (click)="dialogo.close()">
          Fechar
        </button>
      </header>

      @if (ocupada()) {
        <p role="status" class="mb-4 text-sm text-stone-600">Processando…</p>
      }
      @if (erro()) {
        <p role="alert" class="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{{ erro() }}</p>
      }
      @if (sucesso()) {
        <p role="status" class="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-900">{{ sucesso() }}</p>
      }

      @if (dados(); as perfil) {
        <p class="wrap-anywhere font-semibold">{{ perfil.nome }}</p>
        <p class="wrap-anywhere text-sm text-stone-600">{{ perfil.email }}</p>

        <form class="mt-5 space-y-3" #formTelefone="ngForm" (ngSubmit)="salvarTelefone()">
          <label class="grid gap-1 text-sm font-semibold">
            Telefone com DDD
            <input name="telefone" type="tel" inputmode="numeric" autocomplete="tel-national"
              [(ngModel)]="telefone" [class]="campo" required maxlength="11"
              pattern="[1-9][0-9]{9,10}" [disabled]="ocupada()" />
          </label>
          <button type="submit" [class]="primario" [disabled]="ocupada() || formTelefone.invalid">
            Salvar telefone
          </button>
        </form>

        @if (perfil.perfil === 'RESPONSAVEL') {
          <section class="mt-6 space-y-3 border-t border-stone-200 pt-5" aria-labelledby="titulo-troca-email">
            <h3 id="titulo-troca-email" class="font-bold">Alterar e-mail</h3>
            <p class="text-sm text-stone-600">
              Enviaremos um código ao novo endereço. Após confirmar, entre com o novo e-mail.
            </p>

            <form class="space-y-3" #formEmail="ngForm" (ngSubmit)="solicitarEmail()">
              <label class="grid gap-1 text-sm font-semibold">
                Novo e-mail
                <input name="novoEmail" type="email" email [(ngModel)]="novoEmail" [class]="campo"
                  required maxlength="254" [disabled]="ocupada()" />
              </label>
              <label class="grid gap-1 text-sm font-semibold">
                Senha atual
                <input name="senhaEmail" type="password" autocomplete="current-password"
                  [(ngModel)]="senhaEmail" [class]="campo" required maxlength="72" [disabled]="ocupada()" />
              </label>
              <button type="submit" [class]="primario" [disabled]="ocupada() || formEmail.invalid">
                Enviar código
              </button>
            </form>

            @if (codigoEnviado()) {
              <form class="space-y-3" #formCodigo="ngForm" (ngSubmit)="confirmarEmail(dialogo)">
                <label class="grid gap-1 text-sm font-semibold">
                  Código do novo e-mail
                  <input name="codigo" [(ngModel)]="codigo" [class]="campo" required maxlength="43"
                    autocomplete="one-time-code" autocapitalize="off" spellcheck="false"
                    [disabled]="ocupada()" />
                </label>
                <button type="submit" [class]="primario" [disabled]="ocupada() || formCodigo.invalid">
                  Confirmar novo e-mail
                </button>
              </form>
            }
          </section>

          <section class="mt-6 space-y-3 border-t border-stone-200 pt-5"
            aria-labelledby="titulo-privacidade-perfil">
            <h3 id="titulo-privacidade-perfil" class="font-bold">Privacidade dos dados</h3>
            <div class="flex flex-wrap gap-2">
              <button type="button" [class]="primario" [disabled]="ocupada()"
                (click)="baixarMeusDados()">
                {{ baixandoDados() ? 'Gerando arquivo…' : 'Baixar meus dados' }}
              </button>
              <a [href]="linkAnonimizacao" [class]="botao">
                Solicitar anonimização de dados
              </a>
            </div>
            <app-revogar-aceite [bloqueada]="ocupada()"
              (ocupacao)="ocupada.set($event)" (revogado)="voltarAoLogin(dialogo)" />
          </section>

          <section class="mt-6 space-y-3 border-t border-stone-200 pt-5" aria-labelledby="titulo-inativar-conta">
            <h3 id="titulo-inativar-conta" class="font-bold">Inativar minha conta</h3>

            @if (!confirmandoInativacao()) {
              <button type="button" [class]="botao" [disabled]="ocupada()"
                (click)="confirmandoInativacao.set(true)">
                Inativar conta
              </button>
            } @else {
              <p class="rounded-xl bg-amber-50 p-3 text-sm">
                Seus dados de conta serão anonimizados, suas sessões serão encerradas e o vínculo com a
                criança será encerrado. A criança continuará ativa na creche e seu histórico escolar
                será preservado. Esta ação é definitiva.
              </p>

              <form class="space-y-3" #formInativar="ngForm" (ngSubmit)="inativar(dialogo)">
                <label class="grid gap-1 text-sm font-semibold">
                  Confirme sua senha atual
                  <input name="senhaInativacao" type="password" autocomplete="current-password"
                    [(ngModel)]="senhaInativacao" [class]="campo" required maxlength="72"
                    [disabled]="ocupada()" />
                </label>
                <div class="flex flex-wrap gap-2">
                  <button type="button" [class]="botao" [disabled]="ocupada()" (click)="cancelarInativacao()">
                    Cancelar
                  </button>
                  <button type="submit" [disabled]="ocupada() || formInativar.invalid"
                    class="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white
                           hover:bg-red-800 disabled:opacity-50">
                    Confirmar inativação
                  </button>
                </div>
              </form>
            }
          </section>
        }
      } @else if (!ocupada()) {
        <button type="button" [class]="botao" (click)="carregar()">Tentar novamente</button>
      }
    </dialog>
  `,
})
export class MeuPerfil {
  private readonly http = inject(HttpClient);
  private readonly documento = inject(DOCUMENT);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly api = '/api/perfil';
  private temporizador?: ReturnType<typeof setTimeout>;

  readonly linkAnonimizacao =
    'mailto:crecheconecta@gmail.com'
    + '?subject=' + encodeURIComponent('Solicitação de anonimização de dados')
    + '&body=' + encodeURIComponent(
      'Olá, equipe CrecheConecta.\n\n'
      + 'Gostaria de solicitar a avaliação da anonimização de dados pessoais. '
      + 'Por favor, orientem-me sobre como identificar a conta e dar continuidade à solicitação.\n',
    );

  readonly dados = signal<DadosPerfil | null>(null);
  readonly ocupada = signal(false);
  readonly baixandoDados = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly codigoEnviado = signal(false);
  readonly confirmandoInativacao = signal(false);

  readonly campo =
    'w-full rounded-xl border border-stone-300 px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:opacity-50';
  readonly botao =
    'rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-creche-verde hover:bg-creche-creme disabled:opacity-50';
  readonly primario =
    'rounded-xl bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50';

  telefone = '';
  novoEmail = '';
  senhaEmail = '';
  codigo = '';
  senhaInativacao = '';

  constructor() {
    this.destroy.onDestroy(() => clearTimeout(this.temporizador));
  }

  abrir(dialogo: HTMLDialogElement): void {
    if (dialogo.open) return;
    this.limparFormularios();
    dialogo.showModal();
    void this.carregar();
  }

  cancelar(evento: Event): void {
    if (this.ocupada()) evento.preventDefault();
  }

  carregar(): Promise<void> {
    return this.executar(async () => {
      const perfil = await firstValueFrom(this.http.get<DadosPerfil>(this.api));
      this.dados.set(perfil);
      this.telefone = perfil.telefone ?? '';
    });
  }

  baixarMeusDados(): Promise<void> {
    if (this.dados()?.perfil !== 'RESPONSAVEL') return Promise.resolve();

    return this.executar(async () => {
      this.baixandoDados.set(true);
      try {
        const dados = await firstValueFrom(this.http.get<unknown>('/api/meus-dados'));
        const hoje = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
        const arquivo = new Blob([JSON.stringify(dados, null, 2)], {
          type: 'application/json',
        });
        const link = this.documento.createElement('a');
        const url = URL.createObjectURL(arquivo);

        try {
          link.href = url;
          link.download = `meus-dados-crecheconecta-${hoje}.json`;
          this.documento.body.append(link);
          link.click();
        } finally {
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 0);
        }
      } finally {
        this.baixandoDados.set(false);
      }
    }, 'Não foi possível gerar o arquivo com os seus dados. Tente novamente.');
  }

  salvarTelefone(): Promise<void> {
    return this.executar(async () => {
      const perfil = await firstValueFrom(
        this.http.put<DadosPerfil>(`${this.api}/telefone`, {
          telefone: this.telefone.trim(),
        }),
      );
      this.dados.set(perfil);
      this.mostrarMensagem('Telefone atualizado.', 'sucesso');
    });
  }

  solicitarEmail(): Promise<void> {
    return this.executar(async () => {
      await firstValueFrom(this.http.post<void>(`${this.api}/email/solicitar`, {
        email: this.novoEmail.trim(),
        senhaAtual: this.senhaEmail,
      }));
      this.senhaEmail = '';
      this.codigo = '';
      this.codigoEnviado.set(true);
      this.mostrarMensagem('Código enviado. Confira o novo e-mail.', 'sucesso');
    });
  }

  confirmarEmail(dialogo: HTMLDialogElement): Promise<void> {
    return this.executar(async () => {
      const codigo = this.codigo.trim();

      if (!/^[A-Za-z0-9_-]{43}$/.test(codigo)) {
        this.mostrarMensagem('Cole o código completo recebido por e-mail.', 'erro');
        return;
      }

      await firstValueFrom(
        this.http.post<void>(`${this.api}/email/confirmar`, { codigo }),
      );
      await this.voltarAoLogin(dialogo);
    });
  }

  inativar(dialogo: HTMLDialogElement): Promise<void> {
    if (!this.confirmandoInativacao()) return Promise.resolve();

    return this.executar(async () => {
      await firstValueFrom(this.http.post<void>(`${this.api}/inativar`, {
        senhaAtual: this.senhaInativacao,
      }));
      await this.voltarAoLogin(dialogo);
    });
  }

  cancelarInativacao(): void {
    this.confirmandoInativacao.set(false);
    this.senhaInativacao = '';
  }

  limparFormularios(): void {
    this.limparMensagens();
    this.dados.set(null);
    this.telefone = '';
    this.novoEmail = '';
    this.senhaEmail = '';
    this.codigo = '';
    this.codigoEnviado.set(false);
    this.cancelarInativacao();
  }

  async voltarAoLogin(dialogo: HTMLDialogElement): Promise<void> {
    this.limparFormularios();
    dialogo.close();
    this.auth.limparSessao();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private async executar(
    acao: () => Promise<void>,
    mensagemPadrao = 'Não foi possível concluir a operação. Tente novamente.',
  ): Promise<void> {
    if (this.ocupada()) return;

    this.ocupada.set(true);
    this.limparMensagens();

    try {
      await acao();
    } catch (falha: unknown) {
      const detalhe: unknown = falha instanceof HttpErrorResponse
        ? (falha.error?.detail ?? falha.error?.mensagem)
        : null;

      this.mostrarMensagem(
        typeof detalhe === 'string' && detalhe.trim() ? detalhe : mensagemPadrao,
        'erro',
      );
    } finally {
      this.ocupada.set(false);
    }
  }

  private mostrarMensagem(mensagem: string, tipo: 'erro' | 'sucesso'): void {
    this.limparMensagens();
    (tipo === 'erro' ? this.erro : this.sucesso).set(mensagem);
    this.temporizador = setTimeout(() => this.limparMensagens(), 5000);
  }

  private limparMensagens(): void {
    clearTimeout(this.temporizador);
    this.erro.set('');
    this.sucesso.set('');
  }
}
