import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const chamadaApiLocal = request.url.startsWith('/api/');

  if (!chamadaApiLocal || request.headers.has('Authorization')) {
    return next(request);
  }

  const token = inject(AuthService).obterToken();

  if (!token) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
