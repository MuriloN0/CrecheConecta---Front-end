import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthBrand } from '../../shared/components/auth-brand/auth-brand';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, AuthBrand],
  template: `
    <main
      class="group/auth flex min-h-dvh items-center justify-center bg-creche-creme px-4 py-8
             has-[app-login]:block has-[app-login]:bg-white
             has-[app-login]:px-0 has-[app-login]:py-0
             has-[app-cadastro-responsavel]:items-start
             has-[app-cadastro-responsavel]:py-4
             md:has-[app-cadastro-responsavel]:px-6"
    >
      <div
        class="grid w-full max-w-3xl overflow-hidden rounded-2xl border border-stone-200
               bg-white shadow-sm md:min-h-104 md:grid-cols-2
               group-has-[app-login]/auth:contents
               group-has-[app-cadastro-responsavel]/auth:max-w-none
               md:group-has-[app-cadastro-responsavel]/auth:min-h-[calc(100dvh-2rem)]"
      >
        <app-auth-brand class="group-has-[app-login]/auth:hidden" />

        <div
          class="flex min-w-0 items-center p-7 md:p-10 group-has-[app-login]/auth:contents
                 group-has-[app-cadastro-responsavel]/auth:items-start
                 group-has-[app-cadastro-responsavel]/auth:p-5
                 sm:group-has-[app-cadastro-responsavel]/auth:p-8
                 lg:group-has-[app-cadastro-responsavel]/auth:p-12"
        >
          <div class="mx-auto w-full group-has-[app-login]/auth:contents">
            <router-outlet />
          </div>
        </div>
      </div>
    </main>
  `,
})
export class AuthLayout {}
