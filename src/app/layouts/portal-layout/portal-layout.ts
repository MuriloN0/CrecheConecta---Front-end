import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Perfil } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { Sidebar } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [DatePipe, RouterOutlet, Sidebar],
  template: `
    <div
      class="min-h-dvh bg-creche-creme
             md:grid md:grid-cols-[264px_minmax(0,1fr)]"
    >
      <app-sidebar
        [usuario]="auth.usuario()"
        [saindo]="saindo()"
        (sair)="logout()"
      />

      <div class="min-w-0">
        <header
          class="flex flex-wrap items-center justify-between gap-4
                 border-b border-stone-200 px-5 py-4 md:px-8"
        >
          <div>
            <p
              class="text-xs uppercase tracking-wide
                     text-creche-verde"
            >
              {{ tituloPortal() }}
            </p>

            <p class="mt-1 text-sm font-semibold">
              CrecheConecta
            </p>
          </div>

          <time
            [attr.datetime]="hoje | date: 'yyyy-MM-dd'"
            class="text-sm text-stone-600"
          >
            {{ hoje | date: 'dd/MM/yyyy' }}
          </time>
        </header>

        <main class="mx-auto w-full max-w-7xl p-5 md:p-8">
          @if (erro()) {
            <p
              role="alert"
              class="mb-5 rounded-xl border border-red-200
                     bg-red-50 p-4 text-sm text-red-800"
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
export class PortalLayout {
  readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  readonly hoje = new Date();
  readonly saindo = signal(false);
  readonly erro = signal('');

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
    if (this.saindo()) {
      return;
    }

    this.saindo.set(true);
    this.erro.set('');

    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login');
    } catch (erro: unknown) {
      if (
        erro instanceof HttpErrorResponse &&
        erro.status === 401
      ) {
        this.auth.limparSessao();
        await this.router.navigateByUrl('/login');
      } else {
        this.erro.set(
          'Não foi possível encerrar a sessão no servidor. Tente novamente.',
        );
      }
    } finally {
      this.saindo.set(false);
    }
  }
}
