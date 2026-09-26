import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.possuiSessao()) {
    auth.limparSessao();
    return router.createUrlTree(['/login']);
  }

  try {
    await auth.carregarUsuario();
    return true;
  } catch {
    auth.limparSessao();
    return router.createUrlTree(['/login']);
  }
};
