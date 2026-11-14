import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { PortalPaisApi } from './portal-pais.api';

const verificarAceite: CanActivateFn = async (_rota, estado) => {
  const auth = inject(AuthService);
  const api = inject(PortalPaisApi);
  const router = inject(Router);

  if (estado.url.split(/[?#]/)[0] === '/portal-pais') return true;

  try {
    const usuario = auth.usuario() ?? (await auth.carregarUsuario());
    if (usuario.perfil !== 'RESPONSAVEL') return true;

    const status = await firstValueFrom(api.statusTermo());
    if (!status.precisaAceitar) return true;
  } catch {
    if (!auth.possuiSessao()) return router.createUrlTree(['/login']);
  }

  return router.createUrlTree(['/portal-pais']);
};

export const aceiteObrigatorioGuard: CanActivateChildFn = verificarAceite;
export const termoAceitoGuard: CanActivateFn = verificarAceite;
