import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Alunos } from '../alunos/alunos';
import { AlunosApi } from '../alunos/alunos.service';
import { AuthService } from '../core/services/auth.service';
import { InformacoesRelevantesApi } from '../informacoes-relevantes/informacoes-relevantes.api';
import { ConfirmacaoService } from '../shared/components/confirmacao-dialogo/confirmacao-dialogo';
import { Direcao } from './direcao';
import { ContaDirecao, DirecaoService } from './direcao.service';

describe('Contatos da equipe e dos responsáveis', () => {
  const conta: ContaDirecao = {
    id: 'direcao-a',
    nome: 'Ana',
    email: 'ana@example.invalid',
    telefone: '11912345678',
    ativo: true,
    situacaoCadastro: 'APROVADO',
    versao: 0,
  };

  const outra: ContaDirecao = {
    ...conta,
    id: 'direcao-b',
    nome: 'Beatriz',
    email: 'beatriz@example.invalid',
    telefone: null,
  };

  const aluno = {
    id: 'aluno-a',
    nome: 'Aluno de teste',
    dataNascimento: '2025-01-01',
    anoNascimento: null,
    ativo: true,
    versao: 0,
    anonimizado: false,
  };

  let servico: {
    minhaConta: ReturnType<typeof vi.fn>;
    listar: ReturnType<typeof vi.fn>;
  };

  let alunos: {
    listar: ReturnType<typeof vi.fn>;
    consultar: ReturnType<typeof vi.fn>;
    listarResponsaveis: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    servico = {
      minhaConta: vi.fn(() => of(conta)),
      listar: vi.fn(() =>
        of({
          content: [conta, outra],
          totalPages: 2,
        }),
      ),
    };

    alunos = {
      listar: vi.fn(() =>
        of({
          content: [aluno],
          totalPages: 1,
        }),
      ),
      consultar: vi.fn(() => of(aluno)),
      listarResponsaveis: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [Direcao, Alunos],
      providers: [
        { provide: DirecaoService, useValue: servico },
        { provide: AlunosApi, useValue: alunos },
        {
          provide: InformacoesRelevantesApi,
          useValue: { listar: () => of([]) },
        },
        { provide: AuthService, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: ConfirmacaoService, useValue: {} },
      ],
    });
  });

  afterEach(() => TestBed.resetTestingModule());

  it('lista só nome e situação e abre nome, e-mail e telefone pelo botão Consultar', async () => {
    const tela = TestBed.createComponent(Direcao);
    tela.detectChanges();

    await vi.waitFor(() =>
      expect(tela.componentInstance.equipe()).toHaveLength(2),
    );

    tela.detectChanges();

    const lista = tela.nativeElement.querySelector('ul') as HTMLUListElement;

    expect(lista.textContent).toContain(conta.nome);
    expect(lista.textContent).not.toContain(conta.email);
    expect(lista.textContent).not.toContain(conta.telefone);

    const botao = lista.querySelector(
      '[aria-label="Consultar Ana"]',
    ) as HTMLButtonElement;

    botao.click();
    tela.detectChanges();

    const painel = tela.nativeElement.querySelector(
      '[aria-labelledby="titulo-consulta-integrante"]',
    );

    expect(painel.textContent).toContain(conta.nome);
    expect(painel.textContent).toContain(conta.email);
    expect(painel.textContent).toContain(conta.telefone);

    (painel.querySelector('button') as HTMLButtonElement).click();
    tela.detectChanges();

    expect(tela.componentInstance.consultando()).toBeNull();
    expect(
      tela.nativeElement.querySelector(
        '[aria-labelledby="titulo-consulta-integrante"]',
      ),
    ).toBeNull();
  });

  it('informa ausência de telefone e fecha a consulta ao mudar de página', async () => {
    const tela = TestBed.createComponent(Direcao);
    tela.detectChanges();

    await vi.waitFor(() =>
      expect(tela.componentInstance.equipe()).toHaveLength(2),
    );

    tela.detectChanges();
    tela.componentInstance.consultar(outra);
    tela.detectChanges();

    const painel = tela.nativeElement.querySelector(
      '[aria-labelledby="titulo-consulta-integrante"]',
    );

    expect(painel.textContent).toContain('Não informado');
    expect(painel.textContent).toContain(outra.email);

    await tela.componentInstance.carregarEquipe(1);
    tela.detectChanges();

    expect(tela.componentInstance.consultando()).toBeNull();
  });

  it('não abre consulta enquanto outra operação estiver em andamento', async () => {
    const tela = TestBed.createComponent(Direcao);
    tela.detectChanges();

    await vi.waitFor(() =>
      expect(tela.componentInstance.equipe()).toHaveLength(2),
    );

    tela.detectChanges();
    tela.componentInstance.ocupada.set(true);
    tela.componentInstance.consultar(conta);

    expect(tela.componentInstance.consultando()).toBeNull();
  });

  it.each(['11987654321', null, '  '])(
    'exibe o telefone do responsável ou a indicação de ausência: %s',
    async (telefone) => {
      alunos.listarResponsaveis.mockReturnValue(
        of([
          {
            id: 'vinculo-a',
            responsavelId: 'responsavel-a',
            nome: 'Camila',
            email: 'camila@example.invalid',
            telefone,
          },
        ]),
      );

      const tela = TestBed.createComponent(Alunos);
      tela.detectChanges();

      await tela.whenStable();
      await tela.componentInstance.consultar(aluno);

      tela.detectChanges();

      const responsaveis = tela.nativeElement.querySelector(
        'ul',
      ) as HTMLUListElement;

      expect(responsaveis.textContent).toContain('Telefone:');
      expect(responsaveis.textContent).toContain(
        telefone?.trim() || 'Não informado',
      );
    },
  );
});
