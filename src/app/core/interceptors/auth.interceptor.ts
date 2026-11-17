import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (
    !request.url.startsWith('/api/') ||
    request.url.startsWith('/api/cadastro/') ||
    (request.url.startsWith('/api/auth/') &&
      request.url !== '/api/auth/me' &&
      request.url !== '/api/auth/logout')
  ) {
    return next(request);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const geracao = auth.identificarSessao();

  const enviar = (token: string | null) =>
    next(
      token
        ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : request,
    );

  return from(auth.aguardarRenovacao()).pipe(
    switchMap((token) => {
      if (geracao !== auth.identificarSessao()) {
        return throwError(() => new HttpErrorResponse({ status: 401, url: request.url }));
      }

      return enviar(token).pipe(
        catchError((erro: unknown) => {
          if (
            !(erro instanceof HttpErrorResponse) ||
            erro.status !== 401 ||
            erro.error?.codigo !== 'NAO_AUTENTICADO' ||
            request.url === '/api/auth/logout'
          ) {
            return throwError(() => erro);
          }

          return from(auth.aguardarRenovacao()).pipe(
            switchMap((novoToken) =>
              novoToken && novoToken !== token && geracao === auth.identificarSessao()
                ? enviar(novoToken)
                : throwError(() => erro),
            ),
          );
        }),
      );
    }),
    tap({
      error: (erro: unknown) => {
        if (
          erro instanceof HttpErrorResponse &&
          erro.status === 403 &&
          (erro.error?.codigo === 'ACEITE_OBRIGATORIO' || erro.error?.codigo === 'TERMO_PENDENTE') &&
          geracao === auth.identificarSessao() &&
          router.url.split(/[?#]/)[0] !== '/portal-pais'
        ) {
          void router.navigateByUrl('/portal-pais');
        }
      },
    }),
  );
};
