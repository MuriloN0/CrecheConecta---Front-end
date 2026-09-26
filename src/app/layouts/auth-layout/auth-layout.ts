import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthBrand } from '../../shared/components/auth-brand/auth-brand';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, AuthBrand],
  template: `
    <main
      class="flex min-h-dvh items-center justify-center
             bg-creche-creme px-4 py-8"
    >
      <div
        class="grid w-full max-w-3xl overflow-hidden rounded-2xl
        border border-stone-200 bg-white shadow-sm
        md:min-h-104 md:grid-cols-2"
      >
        <app-auth-brand />

        <div class="flex min-w-0 items-center p-7 md:p-10">
          <div class="w-full">
            <router-outlet />
          </div>
        </div>
      </div>
    </main>
  `,
})
export class AuthLayout {}
