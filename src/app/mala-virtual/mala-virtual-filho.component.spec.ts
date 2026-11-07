import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Filho, PainelFamiliaService } from '../pages/home/painel-familia.service';
import { MalaVirtualFilhoComponent } from './mala-virtual-filho.component';
import { MalaFilho } from './model/mala-virtual.model';
import { hojeEmSaoPaulo } from './service/mala-virtual-erros';
import { MalaVirtualService } from './service/mala-virtual.service';

describe('MalaVirtualFilhoComponent', () => {
  let fixture: ComponentFixture<MalaVirtualFilhoComponent>;
  let tela: MalaVirtualFilhoComponent;

  let familia: { listarFilhos: ReturnType<typeof vi.fn> };
  let api: {
    listarDoFilho: ReturnType<typeof vi.fn>;
    marcarItem: ReturnType<typeof vi.fn>;
  };

  const filho: Filho = {
    id: 'aluno-1',
    nome: 'Ana',
    turma: { id: 'turma-1', nome: 'Maternal', numeroSala: '2' },
  };

  function mala(id: string, enviado = false): MalaFilho {
    return {
      id,
      titulo: `Mala ${id}`,
      data: '2999-01-01',
      observacao: null,
      podeMarcar: true,
      itensPendentes: enviado ? 0 : 1,
      itens: [{ id: `item-${id}`, nome: 'Toalha', quantidade: 1, enviado, observacao: null }],
    };
  }

  beforeEach(async () => {
    familia = { listarFilhos: vi.fn().mockReturnValue(of([filho])) };
    api = {
      listarDoFilho: vi.fn().mockReturnValue(of([mala('a'), mala('b')])),
      marcarItem: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PainelFamiliaService, useValue: familia },
        { provide: MalaVirtualService, useValue: api },
      ],
    });

    fixture = TestBed.createComponent(MalaVirtualFilhoComponent);
    tela = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('seleciona o único filho e carrega as malas dele', () => {
    expect(tela.alunoId()).toBe('aluno-1');
    expect(api.listarDoFilho).toHaveBeenCalledWith('aluno-1');
    expect(tela.malas()).toHaveLength(2);
  });

  it('mostra a mala de hoje primeiro, depois as próximas e por fim as que já passaram', async () => {
    const hoje = hojeEmSaoPaulo();
    api.listarDoFilho.mockReturnValue(of([
      { ...mala('futura-longe'), data: '2999-01-02' },
      { ...mala('futura-perto'), data: '2999-01-01' },
      { ...mala('hoje'), data: hoje },
      { ...mala('passada-recente'), data: '2000-01-02', podeMarcar: false },
      { ...mala('passada-antiga'), data: '2000-01-01', podeMarcar: false },
    ]));

    await tela.carregarMalas();

    expect(tela.malas().map((item) => item.id)).toEqual([
      'hoje',
      'futura-perto',
      'futura-longe',
      'passada-recente',
      'passada-antiga',
    ]);
  });

  it('atualiza só a mala marcada com a resposta do PUT, enviando a observação', async () => {
    const [primeira, segunda] = tela.malas();
    api.marcarItem.mockReturnValue(
      of({ ...mala('a', true), itens: [{ ...mala('a', true).itens[0], observacao: 'Na mochila' }] }),
    );

    tela.alterarRascunho(primeira, primeira.itens[0], '  Na mochila ');
    tela.alternarEnviado(primeira, primeira.itens[0], { target: { checked: true } } as unknown as Event);
    await fixture.whenStable();

    expect(api.marcarItem).toHaveBeenCalledWith('aluno-1', 'a', 'item-a', {
      enviado: true,
      observacao: 'Na mochila',
    });
    expect(tela.malas()[0].itensPendentes).toBe(0);
    expect(tela.malas()[0].itens[0].observacao).toBe('Na mochila');
    expect(tela.malas()[1]).toBe(segunda);
  });

  it('recarrega os filhos e avisa quando a API responde 404', async () => {
    const [primeira] = tela.malas();
    api.marcarItem.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 404,
        error: { codigo: 'MALA_VIRTUAL_NAO_ENCONTRADA' },
      })),
    );
    familia.listarFilhos.mockClear();

    tela.alternarEnviado(primeira, primeira.itens[0], { target: { checked: true } } as unknown as Event);
    await fixture.whenStable();

    expect(familia.listarFilhos).toHaveBeenCalledTimes(1);
    expect(tela.aviso()).toContain('O acesso a esta criança ou a esta mala mudou');
  });

  it('mostra a mensagem da regra de negócio na própria mala', async () => {
    const [primeira] = tela.malas();
    api.marcarItem.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 400,
        error: {
          codigo: 'REGRA_NEGOCIO',
          mensagem: 'Não é possível marcar itens depois da data da aula.',
        },
      })),
    );

    tela.alternarEnviado(primeira, primeira.itens[0], { target: { checked: true } } as unknown as Event);
    await fixture.whenStable();

    expect(tela.erroPorMala()['a']).toBe('Não é possível marcar itens depois da data da aula.');
    expect(tela.malas()[0].itens[0].enviado).toBe(false);
  });
});
