import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from './dashboard.service';
import { Home } from './home';

describe('Home: atualização com limite', () => {
  const usuario = signal({ perfil: 'DIRECAO' });

  const resumo = {
    alunosAtivos: 1,
    alunosInativos: 0,
    turmasAtivas: 1,
    turmasInativas: 0,
  };

  const comunicado = {
    id: '1',
    titulo: 'Aviso',
    conteudo: 'Conteúdo',
    ativo: true,
    versao: 0,
    criadoEm: '2026-11-18T12:00:00Z',
    atualizadoEm: '2026-11-18T12:00:00Z',
  };

  let home: Home;

  let dashboard: {
    consultarMural: ReturnType<typeof vi.fn>;
    consultarResumoDirecao: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T12:00:00Z'));

    usuario.set({ perfil: 'DIRECAO' });

    dashboard = {
      consultarMural: vi.fn(() =>
        of({ content: [comunicado], totalElements: 1 }),
      ),
      consultarResumoDirecao: vi.fn(() => of(resumo)),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { usuario },
        },
        {
          provide: DashboardService,
          useValue: dashboard,
        },
      ],
    });

    home = TestBed.runInInjectionContext(() => new Home());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('impede novas consultas durante dez segundos', async () => {
    await home.atualizar();

    expect(home.segundosAteAtualizar()).toBe(10);

    await home.atualizar();

    vi.advanceTimersByTime(9_999);
    await home.atualizar();

    expect(dashboard.consultarMural).toHaveBeenCalledTimes(1);
    expect(dashboard.consultarResumoDirecao).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await home.atualizar();

    expect(dashboard.consultarMural).toHaveBeenCalledTimes(2);
  });

  it('perfis sem direção atualizam somente o mural', async () => {
    usuario.set({ perfil: 'PROFESSOR' });

    await home.atualizar();

    expect(dashboard.consultarMural).toHaveBeenCalledTimes(1);
    expect(dashboard.consultarResumoDirecao).not.toHaveBeenCalled();
  });

  it('respeita o prazo do servidor e preserva os últimos dados ao receber 429', async () => {
    await home.atualizar();
    vi.advanceTimersByTime(10_000);

    dashboard.consultarMural.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 429,
        error: { segundosRestantes: 45 },
      })),
    );

    await home.atualizar();

    expect(home.segundosAteAtualizar()).toBe(45);
    expect(home.comunicados()).toEqual([comunicado]);
    expect(home.erroMural()).toContain('45 segundos');

    vi.advanceTimersByTime(44_999);
    await home.atualizar();

    expect(dashboard.consultarMural).toHaveBeenCalledTimes(2);
  });

  it('usa Retry-After quando não há segundos no corpo', async () => {
    dashboard.consultarMural.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({
          'Retry-After': '31',
        }),
      })),
    );

    await home.atualizar();

    expect(home.segundosAteAtualizar()).toBe(31);
  });

  it('não encurta a espera quando duas consultas retornam limites diferentes', async () => {
    dashboard.consultarMural.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 429,
        error: { segundosRestantes: 45 },
      })),
    );

    dashboard.consultarResumoDirecao.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 429,
        error: { segundosRestantes: 20 },
      })),
    );

    await home.atualizar();

    expect(home.segundosAteAtualizar()).toBe(45);
  });

  it('mantém mensagem de falha comum e libera o carregamento', async () => {
    dashboard.consultarMural.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 500,
      })),
    );

    await home.atualizar();

    expect(home.erroMural()).toBe(
      'Não foi possível carregar os comunicados recentes.',
    );

    expect(home.carregando()).toBe(false);
  });
});
