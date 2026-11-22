import {
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { signal } from '@angular/core';
import {
  ComponentFixture,
  TestBed,
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AtividadesService } from '../../atividades/service/atividades.service';
import { ChamadaService } from '../../chamada/chamada.service';
import { AuthService } from '../../core/services/auth.service';
import { ObservacoesApi } from '../../observacoes/observacoes.api';
import { DashboardService } from './dashboard.service';
import { Home } from './home';
import { MinhaTurma } from './minha-turma/minha-turma';
import { PainelFamilia } from './painel-familia/painel-familia';
import { PainelFamiliaService } from './painel-familia/painel-familia.service';

describe('Atualização completa do painel', () => {
  const usuario = signal({
    nome: 'Pessoa de teste',
    perfil: 'RESPONSAVEL',
  });

  const filhos = [
    { id: 'a', nome: 'Ana', turma: null },
    { id: 'b', nome: 'Bruno', turma: null },
  ];

  const turmas = [
    { id: 'a', nome: 'Turma A', numeroSala: '1' },
    { id: 'b', nome: 'Turma B', numeroSala: '2' },
  ];

  const frequencia = {
    mes: '2026-11',
    presencas: 1,
    faltas: 0,
  };

  const paginaChamada = {
    content: [
      {
        alunoId: 'aluno',
        nome: 'Ana',
        presente: true,
        versao: 0,
      },
    ],
    totalPages: 1,
  };

  let dashboard: {
    consultarMural: ReturnType<typeof vi.fn>;
    consultarResumoDirecao: ReturnType<typeof vi.fn>;
  };

  let familia: {
    listarFilhos: ReturnType<typeof vi.fn>;
    consultarDiario: ReturnType<typeof vi.fn>;
    consultarFrequencia: ReturnType<typeof vi.fn>;
    listarMalas: ReturnType<typeof vi.fn>;
  };

  let observacoes: {
    listar: ReturnType<typeof vi.fn>;
  };

  let atividades: {
    listarTurmas: ReturnType<typeof vi.fn>;
  };

  let chamada: {
    consultar: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-21T12:00:00Z'));

    dashboard = {
      consultarMural: vi.fn(() =>
        of({ content: [], totalElements: 0 }),
      ),
      consultarResumoDirecao: vi.fn(),
    };

    familia = {
      listarFilhos: vi.fn(() => of(filhos)),
      consultarDiario: vi.fn(
        (_id: string, data?: string) =>
          of({
            data: data ?? '2026-11-21',
            alimentacao: 'COMEU_BEM',
            sono: 'DORMIU_BEM',
            evacuacao: true,
            humor: 'CALMO',
            higiene: 'HIGIENIZADO',
            observacaoProfessor: null,
          }),
      ),
      consultarFrequencia: vi.fn(() => of(frequencia)),
      listarMalas: vi.fn(() => of([])),
    };

    observacoes = {
      listar: vi.fn(() => of([])),
    };

    atividades = {
      listarTurmas: vi.fn(() => of(turmas)),
    };

    chamada = {
      consultar: vi.fn(() => of(paginaChamada)),
    };

    TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario } },
        { provide: DashboardService, useValue: dashboard },
        { provide: PainelFamiliaService, useValue: familia },
        { provide: ObservacoesApi, useValue: observacoes },
        { provide: AtividadesService, useValue: atividades },
        { provide: ChamadaService, useValue: chamada },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  async function abrir(
    perfil: string,
  ): Promise<ComponentFixture<Home>> {
    usuario.set({ nome: 'Pessoa de teste', perfil });

    const tela = TestBed.createComponent(Home);
    tela.detectChanges();

    await vi.advanceTimersByTimeAsync(0);
    tela.detectChanges();

    return tela;
  }

  it('carrega o painel da família uma vez e mantém apenas o botão global', async () => {
    const tela = await abrir('RESPONSAVEL');

    expect(dashboard.consultarMural).toHaveBeenCalledTimes(1);
    expect(familia.listarFilhos).toHaveBeenCalledTimes(1);
    expect(familia.consultarDiario).toHaveBeenCalledTimes(1);
    expect(familia.consultarFrequencia).toHaveBeenCalledTimes(1);
    expect(familia.listarMalas).toHaveBeenCalledTimes(1);
    expect(observacoes.listar).toHaveBeenCalledTimes(1);

    expect(tela.nativeElement.textContent)
      .not.toContain('Atualizar mural');
    expect(tela.nativeElement.textContent)
      .not.toContain('Atualizar acompanhamento');

    await vi.advanceTimersByTimeAsync(10_000);
    tela.detectChanges();

    expect(
      tela.nativeElement.querySelector('header button').textContent,
    ).toContain('Atualizar painel');
  });

  it('atualiza mural e acompanhamento preservando criança e dia escolhido', async () => {
    const tela = await abrir('RESPONSAVEL');

    const painel = tela.debugElement.query(
      By.directive(PainelFamilia),
    ).componentInstance as PainelFamilia;

    await painel.selecionar('b');
    await painel.buscarDiario('2026-11-20');
    await vi.advanceTimersByTimeAsync(10_000);

    await tela.componentInstance.atualizar();

    expect(dashboard.consultarMural).toHaveBeenCalledTimes(2);
    expect(familia.listarFilhos).toHaveBeenCalledTimes(2);
    expect(familia.consultarDiario)
      .toHaveBeenLastCalledWith('b', '2026-11-20');
    expect(familia.consultarFrequencia)
      .toHaveBeenLastCalledWith('b');
    expect(familia.listarMalas).toHaveBeenLastCalledWith('b');
    expect(observacoes.listar).toHaveBeenLastCalledWith('b');

    expect(painel.alunoId()).toBe('b');
    expect(painel.dataDiario()).toBe('2026-11-20');
  });

  it('atualiza mural e resumo do professor mantendo a turma selecionada', async () => {
    const tela = await abrir('PROFESSOR');

    expect(atividades.listarTurmas).toHaveBeenCalledTimes(1);
    expect(chamada.consultar).toHaveBeenCalledTimes(1);

    const painel = tela.debugElement.query(
      By.directive(MinhaTurma),
    ).componentInstance as MinhaTurma;

    await painel.selecionarTurma('b');

    chamada.consultar.mockReturnValue(
      of({
        content: [
          {
            alunoId: 'aluno',
            nome: 'Ana',
            presente: false,
            versao: 1,
          },
        ],
        totalPages: 1,
      }),
    );

    await vi.advanceTimersByTimeAsync(10_000);
    await tela.componentInstance.atualizar();
    tela.detectChanges();

    expect(dashboard.consultarMural).toHaveBeenCalledTimes(2);
    expect(atividades.listarTurmas).toHaveBeenCalledTimes(2);
    expect(chamada.consultar)
      .toHaveBeenLastCalledWith('b', '2026-11-21', 0);

    expect(painel.turmaId()).toBe('b');
    expect(painel.resumo()?.ausentes).toBe(1);

    expect(tela.nativeElement.textContent)
      .not.toContain('Atualizar resumo');
  });

  it.each(['RESPONSAVEL', 'PROFESSOR'])(
    'bloqueia atualização duplicada durante carga e após concluir: %s',
    async (perfil) => {
      const tela = await abrir(perfil);
      await vi.advanceTimersByTimeAsync(10_000);

      const pendente = new Subject<
        typeof frequencia | typeof paginaChamada
      >();

      if (perfil === 'RESPONSAVEL') {
        familia.consultarFrequencia.mockReturnValue(pendente);
      } else {
        chamada.consultar.mockReturnValue(pendente);
      }

      const primeira = tela.componentInstance.atualizar();

      await tela.componentInstance.atualizar();
      await vi.advanceTimersByTimeAsync(20_000);
      await tela.componentInstance.atualizar();

      expect(tela.componentInstance.carregando()).toBe(true);
      expect(dashboard.consultarMural).toHaveBeenCalledTimes(2);

      pendente.next(
        perfil === 'RESPONSAVEL'
          ? frequencia
          : paginaChamada,
      );
      pendente.complete();

      await primeira;

      expect(
        tela.componentInstance.segundosAteAtualizar(),
      ).toBe(10);

      await tela.componentInstance.atualizar();

      expect(dashboard.consultarMural).toHaveBeenCalledTimes(2);
    },
  );

  it('usa o maior 429 da família e do mural e preserva os dados anteriores', async () => {
    const tela = await abrir('RESPONSAVEL');

    const painel = tela.debugElement.query(
      By.directive(PainelFamilia),
    ).componentInstance as PainelFamilia;

    const anterior = painel.frequencia();

    await vi.advanceTimersByTimeAsync(10_000);

    familia.consultarFrequencia.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 429,
        error: { segundosRestantes: 45 },
      })),
    );

    dashboard.consultarMural.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 429,
        error: { segundosRestantes: 20 },
      })),
    );

    await tela.componentInstance.atualizar();

    expect(
      tela.componentInstance.segundosAteAtualizar(),
    ).toBe(45);

    expect(painel.frequencia()).toEqual(anterior);
    expect(tela.componentInstance.erroPainel()).toContain('45');

    await vi.advanceTimersByTimeAsync(44_000);
    await tela.componentInstance.atualizar();

    expect(dashboard.consultarMural).toHaveBeenCalledTimes(2);
  });

  it('respeita Retry-After retornado pela chamada do professor', async () => {
    const tela = await abrir('PROFESSOR');

    const painel = tela.debugElement.query(
      By.directive(MinhaTurma),
    ).componentInstance as MinhaTurma;

    const anterior = painel.resumo();

    await vi.advanceTimersByTimeAsync(10_000);

    chamada.consultar.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 429,
        headers: new HttpHeaders({
          'Retry-After': '31',
        }),
      })),
    );

    await tela.componentInstance.atualizar();

    expect(
      tela.componentInstance.segundosAteAtualizar(),
    ).toBe(31);

    expect(painel.resumo()).toEqual(anterior);
    expect(tela.componentInstance.erroPainel()).toContain('31');
  });

  it('não recria o contador quando a resposta chega depois de sair da tela', async () => {
    const tela = await abrir('RESPONSAVEL');
    await vi.advanceTimersByTimeAsync(10_000);

    const pendente = new Subject<typeof frequencia>();
    familia.consultarFrequencia.mockReturnValue(pendente);

    const atualizacao = tela.componentInstance.atualizar();
    const criarContador = vi.spyOn(globalThis, 'setInterval');
    const quantidade = criarContador.mock.calls.length;

    tela.destroy();

    pendente.next(frequencia);
    pendente.complete();

    await atualizacao;

    expect(criarContador.mock.calls.length).toBe(quantidade);
    criarContador.mockRestore();
  });
});
