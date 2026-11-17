import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { Login } from './login';

describe('Login: regras das duas etapas', () => {
  const agora = new Date('2026-10-07T12:00:00Z');
  const chaveBloqueio = 'crecheconecta.login.bloqueio-codigo';

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
      expiraEm: new Date(Date.now() + 300_000).toISOString(),
      mensagem: 'Código enviado',
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(agora);
    window.sessionStorage.removeItem(chaveBloqueio);

    auth = { iniciarLogin: vi.fn(), confirmarLogin: vi.fn() };
    router = { navigateByUrl: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });

    login = TestBed.runInInjectionContext(() => new Login());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    window.sessionStorage.removeItem(chaveBloqueio);
    vi.useRealTimers();
  });

  it('normaliza o e-mail e avança para a etapa de código', async () => {
    login.email = '  DIRECAO@example.test  ';
    login.senha = 'senha-correta';
    const resposta = criarAcao();
    auth.iniciarLogin.mockResolvedValue(resposta);

    await login.entrar();

    expect(auth.iniciarLogin).toHaveBeenCalledWith('direcao@example.test', 'senha-correta');
    expect(login.etapa()).toBe('codigo');
    expect(login.acao()).toEqual(resposta);
    expect(login.senha).toBe('');
    expect(login.codigo).toBe('');
    expect(login.erro()).toBe('');
    expect(login.carregando()).toBe(false);
  });

  it('mostra erro de credenciais sem iniciar a contagem ao receber 401', async () => {
    auth.iniciarLogin.mockRejectedValue(new HttpErrorResponse({ status: 401 }));

    await login.entrar();

    expect(login.erro()).toBe('E-mail ou senha inválidos.');
    expect(login.bloqueado()).toBe(false);
    expect(login.etapa()).toBe('credenciais');
    expect(login.acao()).toBeNull();
    expect(login.carregando()).toBe(false);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('permite reenvio exatamente após sessenta segundos', async () => {
    auth.iniciarLogin.mockImplementation(async () => criarAcao());
    await login.entrar();
    login.voltar();

    vi.advanceTimersByTime(59_999);
    await login.entrar();

    expect(auth.iniciarLogin).toHaveBeenCalledTimes(1);
    expect(login.erro()).toBe('Aguarde 1 segundo antes de solicitar outro código.');
    expect(login.etapa()).toBe('credenciais');

    vi.advanceTimersByTime(1);
    await login.entrar();

    expect(auth.iniciarLogin).toHaveBeenCalledTimes(2);
    expect(login.etapa()).toBe('codigo');
    expect(login.erro()).toBe('');
  });

  it('confirma o código e navega para home', async () => {
    login.acao.set(criarAcao());
    login.codigo = '012345';
    auth.confirmarLogin.mockResolvedValue(undefined);

    await login.confirmar();

    expect(auth.confirmarLogin).toHaveBeenCalledWith('acao-1', '012345');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
    expect(login.codigo).toBe('');
    expect(login.acao()).toBeNull();
    expect(login.carregando()).toBe(false);
  });

  it('impede novo login por cinco minutos após 429 na confirmação', async () => {
    auth.iniciarLogin.mockImplementation(async () => criarAcao());
    auth.confirmarLogin.mockRejectedValue(new HttpErrorResponse({ status: 429 }));
    await login.entrar();

    login.codigo = '012345';
    await login.confirmar();

    expect(login.etapa()).toBe('credenciais');
    expect(login.acao()).toBeNull();
    expect(login.bloqueado()).toBe(true);
    expect(login.tempoBloqueio()).toBe('5:00');

    vi.advanceTimersByTime(299_999);
    await login.entrar();

    expect(login.bloqueado()).toBe(true);
    expect(auth.iniciarLogin).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(login.bloqueado()).toBe(false);
    await login.entrar();

    expect(auth.iniciarLogin).toHaveBeenCalledTimes(2);
    expect(login.etapa()).toBe('codigo');
    expect(window.sessionStorage.getItem(chaveBloqueio)).toBeNull();
  });

  it('bloqueia o envio de credenciais pelo prazo restante informado pela API', async () => {
    auth.iniciarLogin.mockRejectedValueOnce(new HttpErrorResponse({
      status: 429,
      error: { codigo: 'LOGIN_BLOQUEADO', segundosRestantes: 90 },
    }));
    auth.iniciarLogin.mockResolvedValueOnce(criarAcao());

    await login.entrar();

    expect(login.bloqueado()).toBe(true);
    expect(login.tempoBloqueio()).toBe('1:30');
    expect(login.etapa()).toBe('credenciais');

    vi.advanceTimersByTime(89_999);
    await login.entrar();
    expect(auth.iniciarLogin).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(login.bloqueado()).toBe(false);
    await login.entrar();
    expect(auth.iniciarLogin).toHaveBeenCalledTimes(2);
    expect(window.sessionStorage.getItem(chaveBloqueio)).toBeNull();
  });

  it('mantém o envio disponível quando o 429 é do limite de reenvio', async () => {
    auth.iniciarLogin.mockRejectedValue(new HttpErrorResponse({
      status: 429,
      error: { codigo: 'LIMITE_TENTATIVAS' },
    }));

    await login.entrar();

    expect(login.bloqueado()).toBe(false);
    expect(login.erro()).toBe('Limite de tentativas atingido. Aguarde antes de tentar novamente.');
  });

  it('retoma somente o tempo restante ao recriar a tela na mesma aba', async () => {
    window.sessionStorage.setItem(chaveBloqueio, String(agora.getTime() + 90_000));

    const telaRecarregada = TestBed.runInInjectionContext(() => new Login());

    expect(telaRecarregada.tempoBloqueio()).toBe('1:30');
    await telaRecarregada.entrar();
    expect(auth.iniciarLogin).not.toHaveBeenCalled();

    vi.advanceTimersByTime(90_000);
    expect(telaRecarregada.bloqueado()).toBe(false);
  });

  it.each(['', '12345', '1234567', 'abcdef'])(
    'rejeita código fora do formato: %s',
    async (codigo) => {
      login.acao.set(criarAcao());
      login.codigo = codigo;

      await login.confirmar();

      expect(login.erro()).toBe('Informe os seis dígitos do código.');
      expect(auth.confirmarLogin).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(login.carregando()).toBe(false);
    },
  );

  it('rejeita o código no instante exato da expiração', async () => {
    login.acao.set({ ...criarAcao(), expiraEm: agora.toISOString() });
    login.codigo = '012345';

    await login.confirmar();

    expect(login.erro()).toBe('O código expirou. Volte e solicite um novo.');
    expect(auth.confirmarLogin).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('impede nova solicitação enquanto está carregando', async () => {
    login.carregando.set(true);

    await login.entrar();

    expect(auth.iniciarLogin).not.toHaveBeenCalled();
    expect(login.carregando()).toBe(true);
  });
});
