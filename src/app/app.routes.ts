import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        title: 'Entrar | CrecheConecta',
        loadComponent: () =>
          import('./pages/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'recuperar-senha',
        title: 'Recuperar senha | CrecheConecta',
        loadComponent: () =>
          import('./pages/auth/recuperacao/recuperacao').then(
            (m) => m.Recuperacao,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
    ],
  },
  {
    path: '',
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layouts/portal-layout/portal-layout').then(
        (m) => m.PortalLayout,
      ),
    children: [
      {
        path: 'home',
        title: 'Início | CrecheConecta',
        loadComponent: () =>
          import('./pages/home/home').then((m) => m.Home),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
