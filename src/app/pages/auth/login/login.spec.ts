import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AuthService } from '../../../core/services/auth.service';
import { Login } from './login';

describe('Login: regras das duas etapas', () => {
  const agora = new Date('2026-10-07T12:00:00Z');

  let login: Login;

  let auth: {
    iniciarLogin: ReturnType<typeof vi.fn>;
    confirmarLogin: ReturnType<typeof vi.fn>;
  };

  let router: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  function criarAcao() {
    return {
      acaoId: 'acao-1',
      expiraEm: new Date(
        Date.now() + 300_000,
      ).toISOString(),
      mensagem: 'Código enviado',
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(agora);

    auth = {
      iniciarLogin: vi.fn(),
      confirmarLogin: vi.fn(),
    };

    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: auth,
        },
        {
          provide: Router,
          useValue: router,
        },
      ],
    });

    login = TestBed.runInInjectionContext(
      () => new Login(),
    );
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('deve normalizar email e avançar para a etapa de código', async () => {
    // Arrange
    login.email = '  DIRECAO@example.test  ';
    login.senha = 'senha-correta';

    const resposta = criarAcao();

    auth.iniciarLogin.mockResolvedValue(resposta);

    // Act
    await login.entrar();

    // Assert
    expect(auth.iniciarLogin).toHaveBeenCalledWith(
      'direcao@example.test',
      'senha-correta',
    );

    expect(login.etapa()).toBe('codigo');
    expect(login.acao()).toEqual(resposta);

    expect(login.senha).toBe('');
    expect(login.codigo).toBe('');
    expect(login.erro()).toBe('');
    expect(login.carregando()).toBe(false);
  });

  it('deve mostrar erro de credenciais e permanecer na primeira etapa', async () => {
    // Arrange
    auth.iniciarLogin.mockRejectedValue(
      new HttpErrorResponse({
        status: 401,
      }),
    );

    // Act
    await login.entrar();

    // Assert
    expect(login.erro()).toBe(
      'E-mail ou senha inválidos, ou acesso temporariamente bloqueado.',
    );

    expect(login.etapa()).toBe('credenciais');
    expect(login.acao()).toBeNull();
    expect(login.carregando()).toBe(false);

    expect(
      router.navigateByUrl,
    ).not.toHaveBeenCalled();
  });

  it('deve permitir reenvio exatamente após sessenta segundos', async () => {
    // Arrange
    auth.iniciarLogin.mockImplementation(
      async () => criarAcao(),
    );

    await login.entrar();

    login.voltar();

    // Act
    vi.advanceTimersByTime(59_999);

    await login.entrar();

    // Assert
    expect(
      auth.iniciarLogin,
    ).toHaveBeenCalledTimes(1);

    expect(login.erro()).toBe(
      'Aguarde 1 segundos antes de solicitar outro código.',
    );

    expect(login.etapa()).toBe('credenciais');

    // Act
    vi.advanceTimersByTime(1);

    await login.entrar();

    // Assert
    expect(
      auth.iniciarLogin,
    ).toHaveBeenCalledTimes(2);

    expect(login.etapa()).toBe('codigo');
    expect(login.erro()).toBe('');
  });

  it('deve confirmar código e navegar para home', async () => {
    // Arrange
    login.acao.set(criarAcao());
    login.codigo = '012345';

    auth.confirmarLogin.mockResolvedValue(undefined);

    // Act
    await login.confirmar();

    // Assert
    expect(auth.confirmarLogin).toHaveBeenCalledWith(
      'acao-1',
      '012345',
    );

    expect(router.navigateByUrl).toHaveBeenCalledWith(
      '/home',
    );

    expect(login.codigo).toBe('');
    expect(login.acao()).toBeNull();
    expect(login.carregando()).toBe(false);
  });

  it.each([
    {
      cenario: 'vazio',
      codigo: '',
    },
    {
      cenario: 'com cinco dígitos',
      codigo: '12345',
    },
    {
      cenario: 'com sete dígitos',
      codigo: '1234567',
    },
    {
      cenario: 'com letras',
      codigo: 'abcdef',
    },
  ])(
    'deve rejeitar código $cenario sem chamar o serviço',
    async ({ codigo }) => {
      // Arrange
      login.acao.set(criarAcao());
      login.codigo = codigo;

      // Act
      await login.confirmar();

      // Assert
      expect(login.erro()).toBe(
        'Informe os seis dígitos do código.',
      );

      expect(
        auth.confirmarLogin,
      ).not.toHaveBeenCalled();

      expect(
        router.navigateByUrl,
      ).not.toHaveBeenCalled();

      expect(login.carregando()).toBe(false);
    },
  );

  it('deve rejeitar código no instante exato da expiração', async () => {
    // Arrange
    login.acao.set({
      ...criarAcao(),
      expiraEm: agora.toISOString(),
    });

    login.codigo = '012345';

    // Act
    await login.confirmar();

    // Assert
    expect(login.erro()).toBe(
      'O código expirou. Volte e solicite um novo.',
    );

    expect(
      auth.confirmarLogin,
    ).not.toHaveBeenCalled();

    expect(
      router.navigateByUrl,
    ).not.toHaveBeenCalled();
  });

  it('deve impedir nova solicitação enquanto estiver carregando', async () => {
    // Arrange
    login.carregando.set(true);

    // Act
    await login.entrar();

    // Assert
    expect(
      auth.iniciarLogin,
    ).not.toHaveBeenCalled();

    expect(login.carregando()).toBe(true);
  });
});
