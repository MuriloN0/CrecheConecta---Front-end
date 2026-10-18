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
      {
        path: 'observacoes',
        canActivateChild: [termoAceitoGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Observações do filho | CrecheConecta',
            loadComponent: () =>
              import('./observacoes/observacoes').then((m) => m.Observacoes),
          },
          {
            path: 'nova',
            title: 'Cadastrar observação | CrecheConecta',
            loadComponent: () =>
              import('./observacoes/observacoes-form').then(
                (m) => m.ObservacoesForm,
              ),
          },
          {
            path: ':id/editar',
            title: 'Editar observação | CrecheConecta',
            loadComponent: () =>
              import('./observacoes/observacoes-editar').then(
                (m) => m.ObservacoesEditar,
              ),
          },
          {
            path: ':id',
            title: 'Consultar observação | CrecheConecta',
            loadComponent: () =>
              import('./observacoes/observacoes-detalhe').then(
                (m) => m.ObservacoesDetalhe,
              ),
          },
        ],
      },
      {
        path: 'informacoes',
        canActivateChild: [termoAceitoGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Informações relevantes | CrecheConecta',
            loadComponent: () =>
              import('./saude/saude').then((m) => m.Saude),
          },
          {
            path: 'nova',
            title: 'Cadastrar informação | CrecheConecta',
            loadComponent: () =>
              import('./saude/saude-form').then((m) => m.SaudeForm),
          },
          {
            path: ':id/editar',
            title: 'Editar informação | CrecheConecta',
            loadComponent: () =>
              import('./saude/saude-editar').then((m) => m.SaudeEditar),
          },
          {
            path: ':id',
            title: 'Consultar informação | CrecheConecta',
            loadComponent: () =>
              import('./saude/saude-detalhe').then((m) => m.SaudeDetalhe),
          },
        ],
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
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
