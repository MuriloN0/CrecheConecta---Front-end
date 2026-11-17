import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter([
      {
        path: '',
        pathMatch: 'full',
        title: 'CrecheConecta',
        loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing),
      },
      ...routes,
    ]),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
