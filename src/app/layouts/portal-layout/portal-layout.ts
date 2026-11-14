import { DatePipe, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { catchError, EMPTY, exhaustMap, filter, fromEvent, merge, timer } from 'rxjs';
import { Perfil } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { NotificacoesService } from '../../notificacoes/notificacoes.service';
import { PortalPaisApi } from '../../portal-pais/portal-pais.api';

// Telas em que o responsável pode ficar mesmo com termo pendente (a de aceite e a de leitura).
const TELAS_DO_TERMO = ['/portal-pais', '/informacoes/termos'];
import { Sidebar } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [DatePipe, RouterLink, RouterOutlet, Sidebar],
  template: `
    <div class="min-h-dvh bg-creche-creme md:grid md:grid-cols-[264px_minmax(0,1fr)]">
      <app-sidebar
        [usuario]="auth.usuario()"
        [saindo]="saindo()"
        (sair)="logout()"
      />

      <div class="min-w-0">
        <header class="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 px-5 py-4 md:px-8">
          <div>
            <p class="text-xs uppercase tracking-wide text-creche-verde">
              {{ tituloPortal() }}
            </p>
            <p class="mt-1 text-sm font-semibold">CrecheConecta</p>
          </div>

          <a routerLink="/notificacoes" class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
            Notificações
            @if ((notificacoes.pendentes() ?? 0) > 0) {
              <span class="ml-1 rounded-full bg-creche-verde px-2 py-1 text-xs text-white">
                {{ notificacoes.pendentes() }} <span class="sr-only">não lidas</span>
              </span>
            }
          </a>

          <time [attr.datetime]="hoje | date: 'yyyy-MM-dd'" class="text-sm text-stone-600">
            {{ hoje | date: 'dd/MM/yyyy' }}
          </time>
        </header>

        <main class="mx-auto w-full max-w-7xl p-5 md:p-8">
          @if (erro()) {
            <p role="alert" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
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

  ngOnInit(): void {
    timer(0, 15000).pipe(
      exhaustMap(() => {
        if (this.doc.visibilityState === 'hidden' ||
            this.router.url.split(/[?#]/)[0] === '/portal-pais') {
          return EMPTY;
        }
        return this.notificacoes.atualizarTotal().pipe(catchError(() => EMPTY));
      }),
      takeUntilDestroyed(this.destroy),
    ).subscribe();

    this.vigiarTermo();
  }

  /**
   * LGPD: se a direção publicar uma nova versão do termo enquanto o responsável está no portal,
   * ele é levado para a tela de aceite sem precisar trocar de tela.
   * Verifica a cada 15 s e também quando ele volta para a aba. O aceiteObrigatorioGuard continua
   * cobrindo a navegação; aqui só se cobre quem está parado numa tela.
   */
  private vigiarTermo(): void {
    const voltouParaAba = fromEvent(this.doc, 'visibilitychange').pipe(
      filter(() => this.doc.visibilityState === 'visible'),
    );

    merge(timer(15000, 15000), voltouParaAba).pipe(
      filter(() => this.auth.usuario()?.perfil === 'RESPONSAVEL'),
      filter(() => this.doc.visibilityState !== 'hidden'),
      filter(() => !TELAS_DO_TERMO.includes(this.router.url.split(/[?#]/)[0])),
      // Se a consulta falhar (rede, 500), não bloqueia: a próxima rodada tenta de novo.
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
      }
    } finally {
      this.saindo.set(false);
    }
  }
}
