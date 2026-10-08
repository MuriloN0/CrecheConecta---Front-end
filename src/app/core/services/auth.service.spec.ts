import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { SessaoResponse } from '../models/auth.models';
import { AuthService } from './auth.service';

describe('AuthService: sessão do login', () => {
  const agora = new Date('2026-10-07T12:00:00Z');

  let service: AuthService;

  let http: {
    post: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  };

  let router: {
    navigateByUrl: ReturnType<typeof vi.fn>;
  };

  function criarSessao(
    expiraEm = new Date(
      agora.getTime() + 900_000,
    ).toISOString(),
  ): SessaoResponse {
    return {
      accessToken: 'token-teste',
      tokenType: 'Bearer',
      expiraEm,
      usuarioId: 'usuario-1',
      nome: 'Direção',
      perfil: 'DIRECAO',
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(agora);

    http = {
      post: vi.fn(),
      get: vi.fn(),
    };

    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: HttpClient,
          useValue: http,
        },
        {
          provide: Router,
          useValue: router,
        },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    service.limparSessao();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('deve solicitar código sem abrir uma sessão', async () => {
    // Arrange
    const acao = {
      acaoId: 'acao-1',
      expiraEm: new Date(
        agora.getTime() + 300_000,
      ).toISOString(),
      mensagem: 'Código enviado',
    };

    http.post.mockReturnValue(of(acao));

    // Act
    const resposta = await service.iniciarLogin(
      'direcao@example.test',
      'senha',
    );

    // Assert
    expect(resposta).toEqual(acao);

    expect(http.post).toHaveBeenCalledWith(
      '/api/auth/login',
      {
        email: 'direcao@example.test',
        senha: 'senha',
      },
    );

    expect(service.possuiSessao()).toBe(false);
    expect(service.obterToken()).toBeNull();
  });

  it('deve armazenar sessão quando a confirmação for aceita', async () => {
    // Arrange
    http.post.mockReturnValue(of(criarSessao()));

    // Act
    await service.confirmarLogin(
      'acao-1',
      '012345',
    );

    // Assert
    expect(http.post).toHaveBeenCalledWith(
      '/api/auth/confirmar-login',
      {
        acaoId: 'acao-1',
        codigo: '012345',
      },
    );

    expect(service.possuiSessao()).toBe(true);
    expect(service.obterToken()).toBe('token-teste');
  });

  it('deve propagar erro da API sem criar sessão', async () => {
    // Arrange
    const erro = new Error('Código incorreto');

    http.post.mockReturnValue(
      throwError(() => erro),
    );

    // Act + Assert
    await expect(
      service.confirmarLogin('acao-1', '999999'),
    ).rejects.toBe(erro);

    expect(service.possuiSessao()).toBe(false);
    expect(service.obterToken()).toBeNull();
  });

  it.each([
    {
      cenario: 'expiração no instante atual',
      expiraEm: agora.toISOString(),
    },
    {
      cenario: 'data inválida',
      expiraEm: 'data-invalida',
    },
  ])(
    'deve rejeitar sessão com $cenario',
    async ({ expiraEm }) => {
      // Arrange
      http.post.mockReturnValue(
        of(criarSessao(expiraEm)),
      );

      // Act + Assert
      await expect(
        service.confirmarLogin('acao-1', '012345'),
      ).rejects.toThrow(
        'A sessão recebida já expirou.',
      );

      expect(service.possuiSessao()).toBe(false);
      expect(service.obterToken()).toBeNull();
    },
  );

  it('deve limpar sessão exatamente no instante de expiração', async () => {
    // Arrange
    http.post.mockReturnValue(of(criarSessao()));

    await service.confirmarLogin(
      'acao-1',
      '012345',
    );

    // Act
    vi.advanceTimersByTime(899_999);

    // Assert
    expect(service.possuiSessao()).toBe(true);

    expect(
      router.navigateByUrl,
    ).not.toHaveBeenCalled();

    // Act
    vi.advanceTimersByTime(1);

    // Assert
    expect(service.possuiSessao()).toBe(false);
    expect(service.obterToken()).toBeNull();

    expect(router.navigateByUrl).toHaveBeenCalledWith(
      '/login',
    );
  });

  it('deve rejeitar consulta do usuário sem sessão e sem chamar a API', async () => {
    // Act + Assert
    await expect(
      service.carregarUsuario(),
    ).rejects.toThrow('Sessão indisponível.');

    expect(http.get).not.toHaveBeenCalled();
  });

  it('deve carregar usuário com cabeçalho Bearer', async () => {
    // Arrange
    http.post.mockReturnValue(of(criarSessao()));

    await service.confirmarLogin(
      'acao-1',
      '012345',
    );

    const usuario = {
      id: 'usuario-1',
      nome: 'Direção',
      email: 'direcao@example.test',
      perfil: 'DIRECAO',
    };

    http.get.mockReturnValue(of(usuario));

    // Act
    const resposta = await service.carregarUsuario();

    // Assert
    expect(resposta).toEqual(usuario);
    expect(service.usuario()).toEqual(usuario);

    expect(http.get).toHaveBeenCalledTimes(1);

    const [url, opcoes] = http.get.mock.calls[0];

    expect(url).toBe('/api/auth/me');

    expect(
      opcoes.headers.get('Authorization'),
    ).toBe('Bearer token-teste');
  });
});
