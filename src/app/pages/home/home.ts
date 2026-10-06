import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <section class="rounded-2xl border border-stone-200 bg-white p-7 md:p-10">
      <p class="text-xs font-semibold tracking-wider text-creche-verde">
        INÍCIO
      </p>

      <h1 class="mt-3 text-3xl font-bold wrap-break-word">
        Olá, {{ auth.usuario()?.nome }}!
      </h1>

      <p class="mt-3 text-stone-600">
        Bem-vindo ao CrecheConecta.
      </p>
    </section>
  `,
})
export class Home {
  readonly auth = inject(AuthService);
}
