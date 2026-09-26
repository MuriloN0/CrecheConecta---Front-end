import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { termoAceitoGuard } from './portal-pais/termo.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then(
        (m) => m.AuthLayout,
      ),
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
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: 'portal-pais',
        title: 'Termos e privacidade | CrecheConecta',
        loadComponent: () =>
          import('./portal-pais/portal-pais').then(
            (m) => m.PortalPais,
          ),
      },
      {
        path: 'informacoes/termos',
        title: 'Consultar termos | CrecheConecta',
        loadComponent: () =>
          import('./portal-pais/termos-leitura').then(
            (m) => m.TermosLeitura,
          ),
      },
      {
        path: 'informacoes',
        canActivateChild: [termoAceitoGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Fichas de saúde | CrecheConecta',
            loadComponent: () =>
              import('./saude/saude').then((m) => m.Saude),
          },
          {
            path: 'nova',
            title: 'Cadastrar ficha | CrecheConecta',
            loadComponent: () =>
              import('./saude/saude-form').then(
                (m) => m.SaudeForm,
              ),
          },
          {
            path: ':id/editar',
            title: 'Editar ficha | CrecheConecta',
            loadComponent: () =>
              import('./saude/saude-editar').then(
                (m) => m.SaudeEditar,
              ),
          },
          {
            path: ':id',
            title: 'Consultar ficha | CrecheConecta',
            loadComponent: () =>
              import('./saude/saude-detalhe').then(
                (m) => m.SaudeDetalhe,
              ),
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
