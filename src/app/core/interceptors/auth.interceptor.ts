import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
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
  const autorizacao = request.headers.get('Authorization');
  const token = autorizacao ? autorizacao.replace(/^Bearer /, '') : auth.obterToken();
  if (!token) return next(request);

  const autenticada = autorizacao
    ? request
    : request.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
  return next(autenticada).pipe(
    tap({
      error: (erro: unknown) => {
        if (erro instanceof HttpErrorResponse && erro.status === 401) {
          auth.encerrarSessaoExpirada(token);
        }
      },
    }),
  );
};
