import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-brand',
  standalone: true,
  template: `
    <div class="flex h-full items-center bg-creche-verde px-5 py-5 text-white md:px-10 md:py-10">
      <div class="flex min-w-0 items-center gap-3 md:block">
        <img
          src="crecheconecta.svg"
          alt=""
          width="64"
          height="64"
          class="size-12 shrink-0 md:mb-5 md:size-16"
        />
        <div class="min-w-0">
          <p class="wrap-anywhere text-xl font-bold tracking-tight md:text-3xl">
            CrecheConecta
          </p>
          <p class="mt-2 hidden max-w-64 text-sm leading-relaxed text-white/85 md:block">
            O elo carinhoso entre famílias, professores e direção.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class AuthBrand {}
