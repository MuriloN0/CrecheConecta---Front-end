import { Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside
      class="flex h-full flex-col gap-6 bg-creche-verde
             p-5 text-white md:min-h-dvh"
    >
      <a routerLink="/home" class="text-xl font-bold">
        CrecheConecta
      </a>

      <nav aria-label="Menu principal" class="space-y-2 md:mt-6">
        <a
          routerLink="/home"
          routerLinkActive="bg-creche-pessego text-stone-900"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          class="block rounded-full px-4 py-3 text-sm font-semibold"
        >
          Início
        </a>

        @if (auth.usuario()?.perfil === 'DIRECAO') {
          <a
            routerLink="/alunos"
            routerLinkActive="bg-creche-pessego text-stone-900"
            ariaCurrentWhenActive="page"
            class="block rounded-full px-4 py-3 text-sm font-semibold"
          >
            Alunos
          </a>
        }
      </nav>

      <button
        type="button"
        (click)="sair.emit()"
        [disabled]="saindo()"
        class="cursor-pointer rounded-xl border border-white/40 px-4 py-3
               text-sm hover:bg-white/10 disabled:cursor-wait
               disabled:opacity-60 md:mt-auto"
      >
        {{ saindo() ? 'Saindo…' : 'Sair da conta' }}
      </button>
    </aside>
  `,
})
export class Sidebar {
  readonly auth = inject(AuthService);
  readonly saindo = input(false);
  readonly sair = output<void>();
}
