import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  try {
    if (await auth.restaurarSessao()) {
      await auth.carregarUsuario();
      return true;
    }
  } catch {

  }

  return router.createUrlTree(['/login']);
};
