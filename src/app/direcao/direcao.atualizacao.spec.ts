import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
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
import { AuthService } from '../core/services/auth.service';
import { ConfirmacaoService } from '../shared/components/confirmacao-dialogo/confirmacao-dialogo';
import { Direcao } from './direcao';
import { DirecaoService } from './direcao.service';

describe('Equipe de direção: intervalo de atualização', () => {
  let tela: Direcao;

  let servico: {
    minhaConta: ReturnType<typeof vi.fn>;
    listar: ReturnType<typeof vi.fn>;
    atualizarMinhaConta: ReturnType<typeof vi.fn>;
  };

  const conta = {
    id: '1',
    nome: 'Direção',
    telefone: '11999999999',
    email: 'teste@example.invalid',
    ativo: true,
    situacaoCadastro: 'APROVADO',
    versao: 0,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T12:00:00Z'));

    servico = {
      minhaConta: vi.fn(() => of(conta)),
      listar: vi.fn(() =>
        of({
          content: [conta],
          totalPages: 2,
        }),
      ),
      atualizarMinhaConta: vi.fn(() => of(conta)),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: DirecaoService,
          useValue: servico,
        },
        {
          provide: ConfirmacaoService,
          useValue: {},
        },
        {
          provide: AuthService,
          useValue: {
            carregarUsuario: vi.fn().mockResolvedValue({}),
          },
        },
        {
          provide: Router,
          useValue: {},
        },
      ],
    });

    tela = TestBed.runInInjectionContext(() => new Direcao());
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('bloqueia cliques consecutivos por dez segundos', async () => {
    await tela.recarregar();
    await tela.recarregar();

    expect(servico.minhaConta).toHaveBeenCalledTimes(1);
    expect(servico.listar).toHaveBeenCalledTimes(1);
    expect(tela.segundosAteAtualizar()).toBe(10);

    vi.advanceTimersByTime(10_000);

    await tela.recarregar();

    expect(servico.minhaConta).toHaveBeenCalledTimes(2);
  });

  it('mantém a paginação disponível', async () => {
    await tela.recarregar();
    await tela.carregarEquipe(1);

    expect(servico.listar).toHaveBeenLastCalledWith(1);
  });

  it('respeita o tempo maior enviado pela API', async () => {
    servico.minhaConta.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 429,
        error: {
          segundosRestantes: 45,
        },
      })),
    );

    await tela.recarregar();

    expect(tela.segundosAteAtualizar()).toBe(45);
    expect(tela.erro()).toContain('45 segundos');

    vi.advanceTimersByTime(10_000);

    await tela.recarregar();

    expect(servico.minhaConta).toHaveBeenCalledTimes(1);
  });

  it('permite salvar a conta durante a espera de atualização', async () => {
    await tela.recarregar();

    await tela.salvarConta({
      invalid: false,
    } as NgForm);

    expect(
      servico.atualizarMinhaConta,
    ).toHaveBeenCalledTimes(1);

    expect(tela.sucesso()).toBe(
      'Sua conta foi atualizada.',
    );
  });
});
