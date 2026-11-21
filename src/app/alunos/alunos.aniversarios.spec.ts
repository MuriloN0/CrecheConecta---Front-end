import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Alunos } from './alunos';

describe('Filtro de aniversariantes', () => {
  let http: HttpTestingController;

  const pagina = {
    content: [],
    totalPages: 3,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Alunos],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('oferece todos os meses e envia o mês selecionado à API', async () => {
    const tela = TestBed.createComponent(Alunos);
    tela.detectChanges();

    const inicial = http.expectOne(
      (pedido) => pedido.url === '/api/alunos',
    );

    expect(inicial.request.params.has('mesNascimento')).toBe(false);

    inicial.flush(pagina);
    await tela.whenStable();

    const seletor = tela.nativeElement.querySelector(
      'select[name="mesNascimento"]',
    ) as HTMLSelectElement;

    expect(seletor.options.length).toBe(13);
    expect(seletor.options[0].textContent).toContain('Todos os meses');

    seletor.selectedIndex = 6;
    seletor.dispatchEvent(new Event('change'));

    const junho = http.expectOne(
      (pedido) => pedido.url === '/api/alunos',
    );

    expect(junho.request.params.get('mesNascimento')).toBe('6');
    expect(junho.request.params.get('pagina')).toBe('0');

    junho.flush(pagina);
    await tela.whenStable();
  });

  it('preserva mês, nome e situação ao paginar e atualizar e permite limpar o mês', async () => {
    const tela = TestBed.createComponent(Alunos);
    tela.detectChanges();

    http.expectOne(
      (pedido) => pedido.url === '/api/alunos',
    ).flush(pagina);

    await tela.whenStable();

    tela.componentInstance.mudarMesNascimento(12);

    http.expectOne(
      (pedido) => pedido.url === '/api/alunos',
    ).flush(pagina);

    await tela.whenStable();

    tela.componentInstance.nomeBusca = '  Ana  ';
    tela.componentInstance.aplicarBusca();

    http.expectOne(
      (pedido) => pedido.url === '/api/alunos',
    ).flush(pagina);

    await tela.whenStable();

    tela.componentInstance.mudarPagina(1);

    const segunda = http.expectOne(
      (pedido) => pedido.url === '/api/alunos',
    );

    expect(segunda.request.params.get('pagina')).toBe('1');
    expect(segunda.request.params.get('mesNascimento')).toBe('12');
    expect(segunda.request.params.get('nome')).toBe('Ana');
    expect(segunda.request.params.get('ativo')).toBe('true');

    segunda.flush(pagina);
    await tela.whenStable();

    tela.componentInstance.atualizarLista();

    const atualizar = http.expectOne(
      (pedido) => pedido.url === '/api/alunos',
    );

    expect(atualizar.request.params.get('mesNascimento')).toBe('12');

    atualizar.flush(pagina);
    await tela.whenStable();

    tela.componentInstance.mudarFiltro('todos');

    const todos = http.expectOne(
      (pedido) => pedido.url === '/api/alunos',
    );

    expect(todos.request.params.has('ativo')).toBe(false);
    expect(todos.request.params.get('mesNascimento')).toBe('12');

    todos.flush(pagina);
    await tela.whenStable();

    tela.componentInstance.mudarMesNascimento(null);

    const semMes = http.expectOne(
      (pedido) => pedido.url === '/api/alunos',
    );

    expect(semMes.request.params.has('mesNascimento')).toBe(false);
    expect(semMes.request.params.get('nome')).toBe('Ana');
    expect(semMes.request.params.get('pagina')).toBe('0');

    semMes.flush(pagina);
    await tela.whenStable();
  });
});
