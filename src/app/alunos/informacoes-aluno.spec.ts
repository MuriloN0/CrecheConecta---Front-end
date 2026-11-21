import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Alunos } from './alunos';
import { InformacoesAluno } from './informacoes-aluno';

describe('Informações relevantes nos detalhes do aluno', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<InformacoesAluno>;

  const base = '/api/alunos/aluno-a/informacoes-relevantes';
  const resumo = { id: 'info-a', nome: 'Alergia alimentar' };

  const detalhe = {
    ...resumo,
    alunoId: 'aluno-a',
    observacoes: 'Evitar leite.\nAvisar o responsável.',
    versao: 0,
    dataCriacao: '2026-11-20T12:00:00Z',
    dataAtualizacao: '2026-11-20T12:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InformacoesAluno, Alunos],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  function abrir() {
    fixture = TestBed.createComponent(InformacoesAluno);
    fixture.componentRef.setInput('alunoId', 'aluno-a');
    fixture.detectChanges();
  }

  function listar() {
    abrir();
    http.expectOne(base).flush([resumo]);
    fixture.detectChanges();
  }

  it('busca somente os títulos até a direção abrir uma informação', () => {
    listar();

    expect(fixture.nativeElement.textContent).toContain('Alergia alimentar');
    expect(fixture.nativeElement.textContent).not.toContain('Evitar leite.');
    http.expectNone(`${base}/info-a`);

    const botao = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    botao.click();

    const pedido = http.expectOne(`${base}/info-a`);
    expect(pedido.request.method).toBe('GET');

    pedido.flush(detalhe);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(detalhe.observacoes);
    expect(fixture.nativeElement.textContent).toContain('Fechar informação');
    expect(fixture.nativeElement.textContent).not.toContain('Editar');
    expect(fixture.nativeElement.textContent).not.toContain('Excluir');
  });

  it('informa quando não há informações cadastradas', () => {
    abrir();
    http.expectOne(base).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Nenhuma informação relevante cadastrada.',
    );
  });

  it('distingue falha de carregamento de ausência de informações e permite tentar novamente', () => {
    abrir();

    http.expectOne(base).flush({}, {
      status: 500,
      statusText: 'Erro',
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(
      'Nenhuma informação relevante cadastrada.',
    );

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    http.expectOne(base).flush([resumo]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(resumo.nome);
    expect(fixture.componentInstance.erro()).toBe('');
  });

  it('não exibe conteúdo nem detalhes internos quando o backend nega acesso', () => {
    listar();
    fixture.componentInstance.consultar(resumo);

    http.expectOne(`${base}/info-a`).flush(
      { detail: 'Mensagem interna confidencial' },
      { status: 403, statusText: 'Proibido' },
    );

    fixture.detectChanges();

    expect(fixture.componentInstance.detalhe()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Você não tem permissão');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Mensagem interna confidencial',
    );
  });

  it('cancela a consulta anterior e limpa o conteúdo ao trocar de aluno', () => {
    listar();
    fixture.componentInstance.consultar(resumo);

    const anterior = http.expectOne(`${base}/info-a`);

    fixture.componentRef.setInput('alunoId', 'aluno-b');
    fixture.detectChanges();

    expect(anterior.cancelled).toBe(true);
    expect(fixture.componentInstance.detalhe()).toBeNull();
    expect(fixture.componentInstance.informacoes()).toEqual([]);

    http.expectOne('/api/alunos/aluno-b/informacoes-relevantes').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain(resumo.nome);
  });

  it('cancela a listagem se os detalhes forem fechados antes da resposta', () => {
    abrir();
    const pedido = http.expectOne(base);

    fixture.destroy();

    expect(pedido.cancelled).toBe(true);
  });

  it('fecha a informação e cancela uma consulta ainda em andamento', () => {
    listar();
    fixture.componentInstance.consultar(resumo);

    const pedido = http.expectOne(`${base}/info-a`);

    fixture.componentInstance.fecharInformacao();

    expect(pedido.cancelled).toBe(true);
    expect(fixture.componentInstance.detalhe()).toBeNull();
    expect(fixture.componentInstance.carregandoDetalhe()).toBe(false);
  });

  it('recusa uma resposta que pertença a outro aluno', () => {
    listar();
    fixture.componentInstance.consultar(resumo);

    http.expectOne(`${base}/info-a`).flush({
      ...detalhe,
      alunoId: 'aluno-b',
    });

    expect(fixture.componentInstance.detalhe()).toBeNull();
    expect(fixture.componentInstance.erroDetalhe()).not.toBe('');
  });

  it('renderiza conteúdo como texto e permite observações ausentes', () => {
    listar();
    fixture.componentInstance.consultar(resumo);

    http.expectOne(`${base}/info-a`).flush({
      ...detalhe,
      observacoes: '<img src=x onerror=alert(1)>',
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      '<img src=x onerror=alert(1)>',
    );

    fixture.componentInstance.consultar(resumo);

    http.expectOne(`${base}/info-a`).flush({
      ...detalhe,
      observacoes: null,
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Sem observações adicionais.',
    );
  });

  it('mostra a seção no aluno consultado e a remove ao fechar os detalhes', async () => {
    const tela = TestBed.createComponent(Alunos);
    tela.detectChanges();

    http.expectOne((pedido) => pedido.url === '/api/alunos').flush({
      content: [],
      totalPages: 0,
    });

    await tela.whenStable();

    const aluno = {
      id: 'aluno-a',
      nome: 'Ana',
      dataNascimento: '2025-06-18',
      anoNascimento: null,
      ativo: true,
      versao: 0,
      anonimizado: false,
    };

    const consulta = tela.componentInstance.consultar(aluno);

    http.expectOne('/api/alunos/aluno-a').flush(aluno);
    http.expectOne('/api/alunos/aluno-a/responsaveis').flush([]);

    await consulta;
    tela.detectChanges();

    http.expectOne(base).flush([resumo]);
    tela.detectChanges();

    const secao = tela.debugElement.query(By.directive(InformacoesAluno));

    expect(secao.componentInstance.alunoId).toBe(aluno.id);

    secao.componentInstance.consultar(resumo);
    http.expectOne(`${base}/info-a`).flush(detalhe);

    tela.detectChanges();

    expect(tela.nativeElement.textContent).toContain(detalhe.observacoes);

    tela.componentInstance.fecharPaineis();
    tela.detectChanges();

    expect(tela.debugElement.query(By.directive(InformacoesAluno))).toBeNull();
    expect(tela.nativeElement.textContent).not.toContain(detalhe.observacoes);
    expect(secao.componentInstance.detalhe()).toBeNull();
  });
});
