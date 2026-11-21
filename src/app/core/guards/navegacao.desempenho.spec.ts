import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Route,
  Router,
  RouterOutlet,
} from '@angular/router';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { routes } from '../../app.routes';
import { atualizacaoInterceptor } from '../interceptors/atualizacao.interceptor';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class PortalTeste {}

@Component({
  standalone: true,
  template: '<p>Tela aberta</p>',
})
class PaginaTeste {}

function substituirTelas(rota: Route): Route {
  const { loadComponent, children, ...configuracao } = rota;

  return {
    ...configuracao,
    component: children ? PortalTeste : PaginaTeste,
    ...(children
      ? { children: children.map(substituirTelas) }
      : {}),
  };
}

describe('Tempo de liberação das rotas protegidas', () => {
  let http: HttpTestingController;
  let router: Router;
  let perfil: string;
  let precisaAceitar: boolean;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-21T12:00:00Z'));

    perfil = 'RESPONSAVEL';
    precisaAceitar = false;

    const portal = routes.find(
      (rota) => rota.canActivateChild,
    )!;

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          substituirTelas(portal),
          { path: 'login', component: PaginaTeste },
        ]),
        provideHttpClient(
          withInterceptors([atualizacaoInterceptor]),
        ),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            obterToken: () => 'token-de-teste',
            identificarSessao: () => 1,
            possuiSessao: () => true,
            restaurarSessao: async () => true,
            carregarUsuario: async () => ({ perfil }),
            usuario: () => ({ perfil }),
          },
        },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  async function medir(caminho: string) {
    const inicio = Date.now();
    let terminou = false;
    let consultas = 0;

    const navegacao = router.navigateByUrl(caminho)
      .finally(() => {
        terminou = true;
      });

    for (
      let passo = 0;
      passo < 240 && !terminou;
      passo++
    ) {
      await vi.advanceTimersByTimeAsync(50);

      for (const pedido of http.match('/api/termo/status')) {
        consultas++;

        setTimeout(
          () => pedido.flush({ precisaAceitar }),
          100,
        );
      }
    }

    expect(terminou).toBe(true);
    await navegacao;

    return {
      milissegundos: Date.now() - inicio,
      consultas,
    };
  }

  it.each([
    ['/familia/observacoes', 'RESPONSAVEL'],
    ['/familia/atividades', 'RESPONSAVEL'],
    ['/familia/mala-virtual', 'RESPONSAVEL'],
    ['/informacoes', 'RESPONSAVEL'],
    ['/comunicados', 'RESPONSAVEL'],
    ['/conversas', 'RESPONSAVEL'],
    ['/notificacoes', 'RESPONSAVEL'],
    ['/home', 'RESPONSAVEL'],
    ['/informacoes/termos', 'RESPONSAVEL'],
    ['/observacoes', 'PROFESSOR'],
    ['/diario', 'PROFESSOR'],
    ['/chamada', 'PROFESSOR'],
    ['/alunos', 'DIRECAO'],
    ['/turmas', 'DIRECAO'],
    ['/professores', 'DIRECAO'],
    ['/direcao', 'DIRECAO'],
    ['/auditoria', 'DIRECAO'],
    ['/termos', 'DIRECAO'],
    ['/solicitacoes-materiais', 'DIRECAO'],
  ])(
    'mede %s para %s com HTTP simulado de 100 ms',
    async (caminho, papel) => {
      perfil = papel;

      const resultado = await medir(caminho);

      console.info(
        'MEDICAO',
        caminho,
        papel,
        JSON.stringify(resultado),
      );

      expect(router.url).toBe(caminho);
      expect(resultado.milissegundos).toBeLessThan(1_000);
    },
  );

  it('continua bloqueando o responsável quando há aceite pendente', async () => {
    precisaAceitar = true;

    await medir('/familia/observacoes');

    expect(router.url).toBe('/portal-pais');
  });

  it('continua impedindo o responsável de abrir a gestão de alunos', async () => {
    await medir('/alunos');

    expect(router.url).toBe('/home');
  });
});
