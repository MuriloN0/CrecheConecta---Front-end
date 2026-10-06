import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { PortalPaisApi } from './portal-pais.api';

export const termoAceitoGuard: CanActivateFn = () => {
  const api = inject(PortalPaisApi);
  const router = inject(Router);

  return api.statusTermo().pipe(
    map((status) => {
      if (status.precisaAceitar) {
        return router.createUrlTree(['/portal-pais']);
      }
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/portal-pais']))),
  );
};