import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SolicitacaoMaterial } from '../../model/solicitacao-material.model';
import { ModalFormSolicitacaoComponent } from './modal-form-solicitacao.component';

describe('ModalFormSolicitacaoComponent', () => {
  let fixture: ComponentFixture<ModalFormSolicitacaoComponent>;
  let form: ModalFormSolicitacaoComponent;

  const solicitacaoAberta: SolicitacaoMaterial = {
    id: 'solicitacao-1',
    professorId: 'professor-1',
    professorNome: 'Ana Souza',
    sala: 'Sala 3',
    titulo: 'Material de lousa',
    descricao: 'Para as aulas da semana',
    prioridade: 'ALTA',
    status: 'ABERTA',
    criadoEm: '2026-11-07T18:00:22Z',
    atualizadoEm: '2026-11-07T18:00:22Z',
    finalizadoEm: null,
    versao: 4,
    itens: [
      { id: 'item-1', nome: 'Apagador', quantidade: 2 },
      { id: 'item-2', nome: 'Canetão', quantidade: 5 },
    ],
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalFormSolicitacaoComponent);
    form = fixture.componentInstance;
  });


  it('na criação começa vazio, com uma linha de item', () => {
    fixture.detectChanges();

    expect(form.editando()).toBe(false);

    expect(form.titulo).toBe('');

    expect(form.prioridade).toBe('');

    expect(form.itens).toHaveLength(1);
  });


  it('não envia sem os campos obrigatórios', () => {
    fixture.detectChanges();

    const salvar = vi.fn();
    form.salvar.subscribe(salvar);

    form.itens[0].nome = '';
    form.enviar();

    expect(form.erroTitulo()).toBe('Informe o título da solicitação.');

    expect(form.erroSala()).toBe('Informe a sala.');

    expect(form.erroPrioridade()).toBe('Selecione a prioridade.');

    expect(form.erroNome(0)).toBe('Informe o nome do item.');

    expect(salvar).not.toHaveBeenCalled();
  });


  it('não aceita itens repetidos, ignorando maiúsculas e espaços', () => {
    fixture.detectChanges();

    const salvar = vi.fn();
    form.salvar.subscribe(salvar);

    form.titulo = 'Material de lousa';
    form.sala = 'Sala 3';
    form.prioridade = 'MEDIA';

    form.itens[0].nome = 'Apagador';
    form.adicionarItem();
    form.itens[1].nome = '  apagador ';

    form.enviar();

    expect(form.erroNome(1)).toBe('Este item já está na lista.');

    expect(salvar).not.toHaveBeenCalled();
  });


  it('envia os dados limpos e transforma descrição só com espaços em null', () => {
    fixture.detectChanges();

    const salvar = vi.fn();
    form.salvar.subscribe(salvar);

    form.titulo = '  Material de lousa ';
    form.sala = ' Brinquedoteca ';
    form.descricao = '    ';
    form.prioridade = 'BAIXA';
    form.itens[0].nome = ' Giz de cera ';
    form.itens[0].quantidade = 3;

    form.enviar();

    expect(salvar).toHaveBeenCalledWith({
      titulo: 'Material de lousa',
      sala: 'Brinquedoteca',
      descricao: null,
      prioridade: 'BAIXA',
      itens: [{ nome: 'Giz de cera', quantidade: 3 }],
    });
  });


  it('na edição preenche os dados atuais e envia a lista inteira com a versão', () => {
    fixture.componentRef.setInput('solicitacao', solicitacaoAberta);
    fixture.detectChanges();

    const salvar = vi.fn();
    form.salvar.subscribe(salvar);

    expect(form.titulo).toBe('Material de lousa');

    expect(form.itens).toHaveLength(2);

    form.removerItem(0);
    form.adicionarItem();
    form.itens[1].nome = 'Lousa nova';
    form.itens[1].quantidade = 1;

    form.enviar();

    expect(salvar).toHaveBeenCalledWith({
      titulo: 'Material de lousa',
      sala: 'Sala 3',
      descricao: 'Para as aulas da semana',
      prioridade: 'ALTA',
      itens: [
        { nome: 'Canetão', quantidade: 5 },
        { nome: 'Lousa nova', quantidade: 1 },
      ],
      versao: 4,
    });
  });


  it('destaca os campos apontados pelo servidor e os descarta ao mudar a lista', () => {
    fixture.componentRef.setInput('solicitacao', solicitacaoAberta);
    fixture.componentRef.setInput('camposServidor', ['sala', 'itens[0].quantidade']);
    fixture.detectChanges();

    expect(form.erroSala()).toBe('Confira a sala.');

    expect(form.erroQuantidade(0)).toBe('Confira a quantidade.');

    form.adicionarItem();

    expect(form.erroQuantidade(0)).toBeNull();

    expect(form.erroSala()).toBe('Confira a sala.');
  });

});
