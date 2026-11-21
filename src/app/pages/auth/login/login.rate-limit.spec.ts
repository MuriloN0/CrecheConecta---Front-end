import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { Login } from './login';

describe('Login: limite de requisições', () => {
  const chave = 'crecheconecta.login.bloqueio-codigo';

  let login: Login;
  let auth: {
    iniciarLogin: ReturnType<typeof vi.fn>;
    confirmarLogin: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T12:00:00Z'));
    sessionStorage.removeItem(chave);

    auth = {
      iniciarLogin: vi.fn(),
      confirmarLogin: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        {
          provide: Router,
          useValue: { navigateByUrl: vi.fn() },
        },
      ],
    });

    login = TestBed.runInInjectionContext(() => new Login());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    sessionStorage.removeItem(chave);
    vi.useRealTimers();
  });

  it('respeita o tempo retornado pelo rate limit no envio de credenciais', async () => {
    auth.iniciarLogin.mockRejectedValue(new HttpErrorResponse({
      status: 429,
      error: {
        codigo: 'RATE_LIMIT_EXCEDIDO',
        segundosRestantes: 45,
      },
    }));

    await login.entrar();

    expect(login.tempoBloqueio()).toBe('0:45');

    await login.entrar();

    expect(auth.iniciarLogin).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(45_000);

    expect(login.bloqueado()).toBe(false);
  });

  it('usa o tempo do rate limit na confirmação sem impor cinco minutos', async () => {
    login.acao.set({
      acaoId: 'acao-1',
      expiraEm: new Date(Date.now() + 300_000).toISOString(),
      mensagem: 'Código enviado',
    });

    login.codigo = '123456';

    auth.confirmarLogin.mockRejectedValue(new HttpErrorResponse({
      status: 429,
      error: {
        codigo: 'RATE_LIMIT_EXCEDIDO',
        segundosRestantes: 17,
      },
    }));

    await login.confirmar();

    expect(login.tempoBloqueio()).toBe('0:17');

    vi.advanceTimersByTime(17_000);

    expect(login.bloqueado()).toBe(false);
  });

  it('preserva o prazo de rate limit ao recriar a tela', async () => {
    auth.iniciarLogin.mockRejectedValue(new HttpErrorResponse({
      status: 429,
      error: {
        codigo: 'RATE_LIMIT_EXCEDIDO',
        segundosRestantes: 45,
      },
    }));

    await login.entrar();
    vi.advanceTimersByTime(10_000);

    const recriada = TestBed.runInInjectionContext(() => new Login());

    expect(recriada.tempoBloqueio()).toBe('0:35');
  });

  it('não inventa cinco minutos quando falta o tempo do rate limit', async () => {
    login.acao.set({
      acaoId: 'acao-1',
      expiraEm: new Date(Date.now() + 300_000).toISOString(),
      mensagem: 'Código enviado',
    });

    login.codigo = '123456';

    auth.confirmarLogin.mockRejectedValue(new HttpErrorResponse({
      status: 429,
      error: { codigo: 'RATE_LIMIT_EXCEDIDO' },
    }));

    await login.confirmar();

    expect(login.bloqueado()).toBe(false);
    expect(login.erro()).toBe(
      'Limite de tentativas atingido. Aguarde antes de tentar novamente.',
    );
  });
});
