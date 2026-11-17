import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessaoResponse, UsuarioLogado } from '../models/auth.models';
import { AuthService, AvisoSessao } from './auth.service';

describe('AuthService', () => {
  const agora = new Date('2026-10-07T12:00:00Z');
  const quinzeMinutos = 15 * 60_000;
  const chaveTrocaSessao = 'crecheconecta.troca-sessao';
  const usuario: UsuarioLogado = {
    id: 'usuario-1',
    nome: 'Direção',
    email: 'direcao@example.test',
    perfil: 'DIRECAO',
  };

  let service: AuthService;
  let http: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  function sessao(
    accessToken = 'token-teste',
    expiraEm = new Date(agora.getTime() + quinzeMinutos).toISOString(),
  ): SessaoResponse {
    return {
      accessToken,
      tokenType: 'Bearer',
      expiraEm,
      usuarioId: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(agora);

    http = { post: vi.fn(), get: vi.fn() };
    router = { navigateByUrl: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: Router, useValue: router },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.removeItem(chaveTrocaSessao);
    vi.useRealTimers();
  });

  it('solicita o código sem abrir sessão', async () => {
    const acao = { acaoId: 'acao-1', mensagem: 'Código enviado' };
    http.post.mockReturnValue(of(acao));

    await expect(service.iniciarLogin(usuario.email, 'senha')).resolves.toEqual(acao);
    expect(http.post).toHaveBeenCalledWith(
      '/api/auth/login',
      { email: usuario.email, senha: 'senha' },
    );
    expect(service.possuiSessao()).toBe(false);
  });

  it('pede o cookie na confirmação do login', async () => {
    http.post.mockReturnValue(of(sessao()));

    await service.confirmarLogin('acao-1', '012345');

    expect(http.post).toHaveBeenCalledWith(
      '/api/auth/confirmar-login',
      { acaoId: 'acao-1', codigo: '012345' },
      { headers: { 'X-CrecheConecta-Refresh': '1' } },
    );
    expect(service.obterToken()).toBe('token-teste');
    expect(service.possuiSessao()).toBe(true);
  });

  it('propaga a rejeição da confirmação sem abrir sessão', async () => {
    const erro = new Error('Código incorreto');
    http.post.mockReturnValue(throwError(() => erro));

    await expect(service.confirmarLogin('acao-1', '999999')).rejects.toBe(erro);
    expect(service.possuiSessao()).toBe(false);
  });

  it('preserva a sessão anterior se o novo código for recusado', async () => {
    const erro = new Error('Código incorreto');
    http.post.mockReturnValueOnce(of(sessao())).mockReturnValueOnce(throwError(() => erro));

    await service.confirmarLogin('acao-1', '012345');
    await expect(service.confirmarLogin('acao-2', '999999')).rejects.toBe(erro);

    expect(service.obterToken()).toBe('token-teste');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it.each([agora.toISOString(), 'data-invalida'])(
    'rejeita uma data de expiração imprópria: %s',
    async (expiraEm) => {
      http.post.mockReturnValue(of(sessao('token-teste', expiraEm)));

      await expect(service.confirmarLogin('acao-1', '012345'))
        .rejects.toThrow('A sessão recebida já expirou.');
      expect(service.obterToken()).toBeNull();
    },
  );

  it('restaura a sessão sem token em memória e compartilha a renovação', async () => {
    const resposta = new Subject<SessaoResponse>();
    http.post.mockReturnValue(resposta);

    const primeira = service.restaurarSessao();
    const segunda = service.restaurarSessao();

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith(
      '/api/auth/refresh',
      {},
      { headers: { 'X-CrecheConecta-Refresh': '1' } },
    );

    resposta.next(sessao('token-renovado'));
    resposta.complete();

    await expect(Promise.all([primeira, segunda])).resolves.toEqual([true, true]);
    expect(service.obterToken()).toBe('token-renovado');
  });

  it('permanece sem sessão quando o cookie é recusado', async () => {
    http.post.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(service.restaurarSessao()).resolves.toBe(false);
    expect(service.obterToken()).toBeNull();
  });

  it('expira após 50 minutos sem renovar em segundo plano', async () => {
    http.post.mockReturnValue(of(sessao()));
    await service.confirmarLogin('acao-1', '012345');

    vi.advanceTimersByTime(quinzeMinutos);

    expect(service.obterToken()).toBeNull();
    expect(service.possuiSessao()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    vi.advanceTimersByTime(35 * 60_000 - 1);
    expect(service.possuiSessao()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(service.possuiSessao()).toBe(false);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(TestBed.inject(AvisoSessao).expirou()).toBe(true);
  });

  it('encerra a aba anterior após a troca sem apresentar aviso de expiração', async () => {
    http.post.mockReturnValue(of(sessao()));
    await service.confirmarLogin('acao-1', '012345');

    window.dispatchEvent(new StorageEvent('storage', {
      key: chaveTrocaSessao,
      newValue: 'outra-confirmacao',
    }));

    expect(service.obterToken()).toBeNull();
    expect(service.possuiSessao()).toBe(false);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(TestBed.inject(AvisoSessao).expirou()).toBe(false);
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('recusa trocar de usuário silenciosamente durante uma renovação', async () => {
    const novoPrazo = new Date(agora.getTime() + 2 * quinzeMinutos).toISOString();
    http.post.mockReturnValueOnce(of(sessao())).mockReturnValueOnce(of({
      ...sessao('outro-token', novoPrazo),
      usuarioId: 'usuario-2',
      nome: 'Responsável',
      perfil: 'RESPONSAVEL',
    }));
    await service.confirmarLogin('acao-1', '012345');

    vi.advanceTimersByTime(quinzeMinutos);

    await expect(service.restaurarSessao()).resolves.toBe(false);
    expect(service.obterToken()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('rejeita a consulta do usuário sem sessão', async () => {
    await expect(service.carregarUsuario()).rejects.toThrow('Sessão indisponível.');
    expect(http.get).not.toHaveBeenCalled();
  });

  it('carrega o usuário com o token de acesso', async () => {
    http.post.mockReturnValue(of(sessao()));
    http.get.mockReturnValue(of(usuario));
    await service.confirmarLogin('acao-1', '012345');

    await expect(service.carregarUsuario()).resolves.toEqual(usuario);
    expect(service.usuario()).toEqual(usuario);

    const [url, opcoes] = http.get.mock.calls[0];
    expect(url).toBe('/api/auth/me');
    expect(opcoes.headers.get('Authorization')).toBe('Bearer token-teste');
  });

  it('revoga a sessão no logout', async () => {
    http.post.mockReturnValueOnce(of(sessao())).mockReturnValueOnce(of(undefined));
    await service.confirmarLogin('acao-1', '012345');

    await service.logout();

    const [url, corpo, opcoes] = http.post.mock.calls[1];
    expect(url).toBe('/api/auth/logout');
    expect(corpo).toEqual({});
    expect(opcoes.headers.get('Authorization')).toBe('Bearer token-teste');
    expect(service.possuiSessao()).toBe(false);
  });
});
