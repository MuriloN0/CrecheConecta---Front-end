import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MalaTurma } from '../../model/mala-virtual.model';
import { hojeEmSaoPaulo } from '../../service/mala-virtual-erros';
import { ModalFormMalaComponent } from './modal-form-mala.component';

describe('ModalFormMalaComponent', () => {
  let fixture: ComponentFixture<ModalFormMalaComponent>;
  let form: ModalFormMalaComponent;

  const malaPassada: MalaTurma = {
    id: 'mala-1',
    turmaId: 'turma-1',
    professorId: 'prof-1',
    titulo: 'Passeio',
    data: '2020-01-10',
    observacao: null,
    criadoEm: '2020-01-01T10:00:00Z',
    atualizadoEm: '2020-01-01T10:00:00Z',
    versao: 3,
    itens: [
      { id: 'item-1', nome: 'Boné', quantidade: 1 },
      { id: 'item-2', nome: 'Garrafa', quantidade: 1 },
    ],
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalFormMalaComponent);
    form = fixture.componentInstance;
  });

  it('na criação começa com a data de hoje e uma linha vazia', () => {
    fixture.detectChanges();

    expect(form.data).toBe(hojeEmSaoPaulo());
    expect(form.itens).toHaveLength(1);
    expect(form.editando()).toBe(false);
  });

  it('não envia com data no passado nem com itens repetidos', () => {
    fixture.detectChanges();
    const salvar = vi.fn();
    form.salvar.subscribe(salvar);

    form.titulo = 'Aula de pintura';
    form.data = '2020-01-01';
    form.itens[0].nome = 'Avental';
    form.adicionarItem();
    form.itens[1].nome = '  avental ';
    form.enviar();

    expect(form.erroData()).toBe('A data da aula não pode estar no passado.');
    expect(form.erroNome(1)).toBe('Este item já está na lista.');
    expect(salvar).not.toHaveBeenCalled();
  });

  it('na edição aceita a data passada se ela não mudar e envia id e versão', () => {
    fixture.componentRef.setInput('mala', malaPassada);
    fixture.detectChanges();
    const salvar = vi.fn();
    form.salvar.subscribe(salvar);

    form.removerItem(1);
    form.adicionarItem();
    form.itens[1].nome = 'Protetor solar';
    form.itens[1].quantidade = 2;
    form.enviar();

    expect(form.removidos.map((item) => item.id)).toEqual(['item-2']);
    expect(salvar).toHaveBeenCalledWith({
      titulo: 'Passeio',
      data: '2020-01-10',
      itens: [
        { id: 'item-1', nome: 'Boné', quantidade: 1 },
        { nome: 'Protetor solar', quantidade: 2 },
      ],
      versao: 3,
    });
  });

  it('na edição recusa mudar para outra data passada', () => {
    fixture.componentRef.setInput('mala', malaPassada);
    fixture.detectChanges();

    form.data = '2020-01-11';

    expect(form.erroData()).toBe('A data da aula não pode estar no passado.');
  });

  it('destaca os campos apontados pelo servidor e os descarta ao mudar a lista', () => {
    fixture.componentRef.setInput('mala', malaPassada);
    fixture.componentRef.setInput('camposServidor', ['titulo', 'itens[0].quantidade']);
    fixture.detectChanges();

    expect(form.erroTitulo()).toBe('Confira o título.');
    expect(form.erroQuantidade(0)).toBe('Confira a quantidade.');

    form.adicionarItem();

    expect(form.erroQuantidade(0)).toBeNull();
    expect(form.erroTitulo()).toBe('Confira o título.');
  });

  it('restaura o item removido', () => {
    fixture.componentRef.setInput('mala', malaPassada);
    fixture.detectChanges();

    form.removerItem(0);
    form.restaurarItem(form.removidos[0]);

    expect(form.removidos).toHaveLength(0);
    expect(form.itens.map((item) => item.id).sort()).toEqual(['item-1', 'item-2']);
  });
});
