import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-brand',
  standalone: true,
  template: `
    <div
      class="flex h-full items-center bg-creche-verde
      px-8 py-10 text-white md:px-10"
    >
      <div>
        <div
          class="mb-3 h-2 w-10 bg-creche-pessego"
          aria-hidden="true"
        ></div>

        <h2 class="text-3xl font-bold tracking-tight">
          CrecheConecta
        </h2>

        <p class="mt-3 max-w-64 text-sm leading-relaxed text-white/85">
          O elo carinhoso entre famílias, professores e direção.
        </p>

        <div class="mt-6 flex gap-2">
          <span
            class="rounded-full bg-teal-100 px-3 py-1
            text-xs text-creche-verde"
          >
            Conexão
          </span>

          <span
            class="rounded-full bg-emerald-300 px-3 py-1
            text-xs text-creche-verde"
          >
            Rotina
          </span>
        </div>
      </div>
    </div>
  `,
})
export class AuthBrand {}
