import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Perfil } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

export function permitirPerfis(...perfis: Perfil[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const usuario = auth.usuario();

    if (!auth.possuiSessao() || !usuario) {
      return router.createUrlTree(['/login']);
    }

    return perfis.includes(usuario.perfil)
      ? true
      : router.createUrlTree(['/home']);
  };
}
