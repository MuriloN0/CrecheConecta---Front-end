import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permitirPerfis } from './core/guards/perfil.guard';
import { aceiteObrigatorioGuard, termoAceitoGuard } from './portal-pais/termo.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        title: 'Entrar | CrecheConecta',
        loadComponent: () => import('./pages/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'recuperar-senha',
        title: 'Recuperar senha | CrecheConecta',
        loadComponent: () =>
          import('./pages/auth/recuperacao/recuperacao').then((m) => m.Recuperacao),
      },
      {
        path: 'cadastro/direcao',
        title: 'Cadastro de direção | CrecheConecta',
        loadComponent: () =>
          import('./pages/auth/cadastro-direcao/cadastro-direcao').then(
            (m) => m.CadastroDirecao,
          ),
      },
      {
        path: 'cadastro',
        pathMatch: 'full',
        title: 'Cadastro de professor | CrecheConecta',
        loadComponent: () =>
          import('./pages/auth/cadastro-professor/cadastro-professor').then(
            (m) => m.CadastroProfessor,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: '',
    canActivateChild: [authGuard, aceiteObrigatorioGuard],
    loadComponent: () =>
      import('./layouts/portal-layout/portal-layout').then((m) => m.PortalLayout),
    children: [
      {
        path: 'home',
        title: 'Início | CrecheConecta',
        loadComponent: () => import('./pages/home/home').then((m) => m.Home),
      },
      {
        path: 'atividades',
        title: 'Atividades | CrecheConecta',
        canActivate: [permitirPerfis('PROFESSOR')],
        loadComponent: () =>
          import('./atividades/atividades.component').then((m) => m.AtividadesComponent),
      },
      {
        path: 'mala-virtual',
        title: 'Mala Virtual | CrecheConecta',
        canActivate: [permitirPerfis('PROFESSOR')],
        loadComponent: () =>
          import('./mala-virtual/mala-virtual.component').then((m) => m.MalaVirtualComponent),
      },
      {
        path: 'familia/mala-virtual',
        canActivate: [permitirPerfis('RESPONSAVEL')],
        canActivateChild: [termoAceitoGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            title: 'Mala Virtual | CrecheConecta',
            loadComponent: () =>
              import('./mala-virtual/mala-virtual-filho.component').then(
                (m) => m.MalaVirtualFilhoComponent,
              ),
          },
        ],
      },
      {
        path: 'chamada',
        title: 'Chamada do dia | CrecheConecta',
        canActivate: [permitirPerfis('PROFESSOR')],
        loadComponent: () => import('./chamada/chamada').then((m) => m.Chamada),
      },
      {
        path: 'diario',
        title: 'Diário de rotina | CrecheConecta',
        canActivate: [permitirPerfis('PROFESSOR')],
        loadComponent: () => import('./diario/diario').then((m) => m.Diario),
      },
      {
        path: 'alunos',
        title: 'Alunos | CrecheConecta',
        canActivate: [permitirPerfis('DIRECAO')],
        loadComponent: () => import('./alunos/alunos').then((m) => m.Alunos),
      },
      {
        path: 'turmas',
        title: 'Turmas | CrecheConecta',
        canActivate: [permitirPerfis('DIRECAO')],
        loadComponent: () => import('./turmas/turmas').then((m) => m.Turmas),
      },
      {
        path: 'professores',
        title: 'Professores | CrecheConecta',
        canActivate: [permitirPerfis('DIRECAO')],
        loadComponent: () => import('./professores/professores').then((m) => m.Professores),
      },
      {
        path: 'direcao',
        title: 'Equipe de Direção | CrecheConecta',
        canActivate: [permitirPerfis('DIRECAO')],
        loadComponent: () => import('./direcao/direcao').then((m) => m.Direcao),
      },
      {
        path: 'comunicados',
        title: 'Comunicados | CrecheConecta',
        canActivate: [permitirPerfis('DIRECAO', 'PROFESSOR', 'RESPONSAVEL')],
        loadComponent: () =>
          import('./comunicados/comunicados').then((m) => m.Comunicados),
      },
      {
        path: 'portal-pais',
        title: 'Aceite dos termos | CrecheConecta',
        loadComponent: () =>
          import('./portal-pais/portal-pais').then((m) => m.PortalPais),
      },
      {
        path: 'informacoes/termos',
        title: 'Termos e privacidade | CrecheConecta',
        loadComponent: () =>
          import('./portal-pais/termos-leitura').then((m) => m.TermosLeitura),
      },
      {
        path: 'observacoes',
        title: 'Observações | CrecheConecta',
        canActivate: [permitirPerfis('RESPONSAVEL')],
        loadComponent: () =>
          import('./observacoes/observacoes').then((m) => m.Observacoes),
      },
      {
        path: 'informacoes',
        title: 'Informações relevantes | CrecheConecta',
        canActivate: [permitirPerfis('RESPONSAVEL')],
        loadComponent: () => import('./saude/saude').then((m) => m.Saude),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
