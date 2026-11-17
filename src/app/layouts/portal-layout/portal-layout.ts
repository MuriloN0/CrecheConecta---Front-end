import { DatePipe, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { catchError, EMPTY, exhaustMap, filter, fromEvent, merge, timer } from 'rxjs';
import { Perfil } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { MeuPerfil } from '../../meu-perfil/meu-perfil';
import { NotificacoesService } from '../../notificacoes/notificacoes.service';
import { PortalPaisApi } from '../../portal-pais/portal-pais.api';
import { ConfirmacaoDialogo } from '../../shared/components/confirmacao-dialogo/confirmacao-dialogo';
import { Sidebar } from '../../shared/components/sidebar/sidebar';

const TELAS_DO_TERMO = ['/portal-pais', '/informacoes/termos'];

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [DatePipe, RouterLink, RouterOutlet, Sidebar, ConfirmacaoDialogo, MeuPerfil],
  template: `
    <app-confirmacao-dialogo />

    <div class="min-h-dvh bg-creche-creme md:grid md:grid-cols-[264px_minmax(0,1fr)]">
      <app-sidebar
        [usuario]="auth.usuario()"
        [saindo]="saindo()"
        (sair)="logout()"
      />

      <div class="min-w-0">
        <header
          class="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200
                 px-4 py-3 md:gap-4 md:px-8 md:py-4"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-creche-verde">
            {{ tituloPortal() }}
          </p>

          <div class="flex flex-wrap items-center gap-2">
            @if (auth.usuario()?.perfil === 'PROFESSOR' || auth.usuario()?.perfil === 'RESPONSAVEL') {
              <app-meu-perfil />
            }

            <a
              routerLink="/notificacoes"
              class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              Notificações
              @if ((notificacoes.pendentes() ?? 0) > 0) {
                <span class="ml-1 rounded-full bg-creche-verde px-2 py-1 text-xs text-white">
                  {{ notificacoes.pendentes() }} <span class="sr-only">não lidas</span>
                </span>
              }
            </a>
          </div>

          <time
            [attr.datetime]="hoje | date: 'yyyy-MM-dd'"
            class="hidden text-sm text-stone-600 sm:block"
          >
            {{ hoje | date: 'dd/MM/yyyy' }}
          </time>
        </header>

        <main class="mx-auto w-full max-w-7xl p-4 md:p-8">
          @if (erro()) {
            <p
              role="alert"
              class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {{ erro() }}
            </p>
          }

          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class PortalLayout implements OnInit {
  readonly auth = inject(AuthService);
  readonly notificacoes = inject(NotificacoesService);

  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly doc = inject(DOCUMENT);
  private readonly termos = inject(PortalPaisApi);

  readonly hoje = new Date();
  readonly saindo = signal(false);
  readonly erro = signal('');

  private temporizadorErro?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroy.onDestroy(() => clearTimeout(this.temporizadorErro));
  }

  ngOnInit(): void {
    timer(0, 15000).pipe(
      exhaustMap(() => {
        if (
          this.doc.visibilityState === 'hidden' ||
          this.router.url.split(/[?#]/)[0] === '/portal-pais'
        ) {
          return EMPTY;
        }

        return this.notificacoes.atualizarTotal().pipe(catchError(() => EMPTY));
      }),
      takeUntilDestroyed(this.destroy),
    ).subscribe();

    this.vigiarTermo();
  }

  private vigiarTermo(): void {
    const voltouParaAba = fromEvent(this.doc, 'visibilitychange').pipe(
      filter(() => this.doc.visibilityState === 'visible'),
    );

    merge(timer(15000, 15000), voltouParaAba).pipe(
      filter(() => this.auth.usuario()?.perfil === 'RESPONSAVEL'),
      filter(() => this.doc.visibilityState !== 'hidden'),
      filter(() => !TELAS_DO_TERMO.includes(this.router.url.split(/[?#]/)[0])),
      exhaustMap(() => this.termos.statusTermo().pipe(catchError(() => EMPTY))),
      filter((status) => status.precisaAceitar),
      takeUntilDestroyed(this.destroy),
    ).subscribe(() => {
      void this.router.navigateByUrl('/portal-pais');
    });
  }

  tituloPortal(): string {
    const nomes: Record<Perfil, string> = {
      DIRECAO: 'Portal da Direção',
      PROFESSOR: 'Portal do Professor',
      RESPONSAVEL: 'Portal da Família',
    };

    const perfil = this.auth.usuario()?.perfil;
    return perfil ? nomes[perfil] : 'Portal';
  }

  async logout(): Promise<void> {
    if (this.saindo()) return;

    clearTimeout(this.temporizadorErro);
    this.saindo.set(true);
    this.erro.set('');

    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login');
    } catch (erro: unknown) {
      if (erro instanceof HttpErrorResponse && erro.status === 401) {
        this.auth.limparSessao();
        await this.router.navigateByUrl('/login');
      } else {
        this.erro.set('Não foi possível encerrar a sessão no servidor. Tente novamente.');
        this.temporizadorErro = setTimeout(() => this.erro.set(''), 5000);
      }
    } finally {
      this.saindo.set(false);
    }
  }
}
