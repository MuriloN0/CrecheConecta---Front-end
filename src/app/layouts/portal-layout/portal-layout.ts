import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Perfil } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { Sidebar } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar],
  template: `
    <div class="min-h-dvh bg-creche-creme md:grid md:grid-cols-[240px_1fr]">
      <app-sidebar [saindo]="saindo()" (sair)="logout()" />

      <div class="min-w-0">
        <header
          class="flex flex-wrap items-center justify-between gap-4
          border-b border-stone-200 bg-white px-6 py-5"
        >
          <div>
            <p class="font-semibold">{{ tituloPortal() }}</p>
            <p class="text-xs text-teal-800">CrecheConecta</p>
          </div>

          <span class="text-sm">{{ auth.usuario()?.nome }}</span>
        </header>

        <main class="p-5 md:p-8">
          @if (erro()) {
            <p role="alert" class="mb-5 rounded-lg bg-red-50 p-3 text-red-800">
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

  readonly saindo = signal(false);
  readonly erro = signal('');

  tituloPortal(): string {
    const nomes: Record<Perfil, string> = {
      DIRECAO: 'Portal da Direção',
      PROFESSOR: 'Portal do Professor',
      PAIS: 'Portal da Família',
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
        this.erro.set(
          'Não foi possível encerrar a sessão no servidor. Tente novamente.',
        );
      }
    } finally {
      this.saindo.set(false);
    }
  }
}
