import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { PortalPaisApi } from './portal-pais.api';

/**
 * Só deixa passar quem já aceitou a versão vigente do termo.
 * Vai para a tela de aceite apenas quando o back diz que é preciso aceitar.
 * Se a consulta falhar (rede, 500), volta ao início em vez de empurrar para o aceite.
 */
export const termoAceitoGuard: CanActivateFn = () => {
  const api = inject(PortalPaisApi);
  const router = inject(Router);

  return api.statusTermo().pipe(
    map((status) =>
      status.precisaAceitar ? router.createUrlTree(['/portal-pais']) : true,
    ),
    catchError(() => of(router.createUrlTree(['/home']))),
  );
};

/**
 * Aceite obrigatório (LGPD): todo RESPONSAVEL que ainda não aceitou a versão vigente do termo
 * é levado para a tela de aceite, qualquer que seja a tela que tentou abrir.
 * Fica de fora a própria tela de aceite (evita loop) e a de consulta dos termos.
 * Se a consulta falhar (rede, 500) não bloqueia a navegação: as chamadas da API continuam protegidas pelo back.
 */
export const aceiteObrigatorioGuard: CanActivateChildFn = async (_rota, estado) => {
  const auth = inject(AuthService);
  const api = inject(PortalPaisApi);
  const router = inject(Router);

  const caminho = estado.url.split('?')[0];
  if (caminho === '/portal-pais' || caminho === '/informacoes/termos') {
    return true;
  }

  try {
    // O authGuard roda junto e pode ainda não ter carregado o usuário.
    const usuario = auth.usuario() ?? (await auth.carregarUsuario());
    if (usuario.perfil !== 'RESPONSAVEL') {
      return true;
    }
    const status = await firstValueFrom(api.statusTermo());
    return status.precisaAceitar ? router.createUrlTree(['/portal-pais']) : true;
  } catch {
    return true;
  }
};
