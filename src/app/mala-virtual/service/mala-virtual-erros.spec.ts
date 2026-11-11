import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import {
  camposInvalidos,
  codigoErro,
  hojeEmSaoPaulo,
  MENSAGEM_CONFLITO_VERSAO,
  mensagemErroMala,
  normalizarNomeItem,
} from './mala-virtual-erros';

function erroHttp(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('mala-virtual-erros', () => {
  it('usa a mensagem do ProblemDetail quando existe', () => {
    const erro = erroHttp(400, {
      codigo: 'REGRA_NEGOCIO',
      mensagem: 'A data da aula não pode estar no passado.',
    });

    expect(mensagemErroMala(erro)).toBe('A data da aula não pode estar no passado.');
    expect(codigoErro(erro)).toBe('REGRA_NEGOCIO');
  });

  it('troca a mensagem genérica do 409 pela orientação da mala', () => {
    const erro = erroHttp(409, {
      codigo: 'CONFLITO_VERSAO',
      mensagem: 'Cadastro alterado por outra pessoa. Recarregue os dados.',
    });

    expect(mensagemErroMala(erro)).toBe(MENSAGEM_CONFLITO_VERSAO);
  });

  it('cai na mensagem padrão do código ou do status sem corpo', () => {
    expect(mensagemErroMala(erroHttp(404, { codigo: 'MALA_VIRTUAL_NAO_ENCONTRADA' })))
      .toBe('A mala não foi encontrada. Atualize a listagem.');
    expect(mensagemErroMala(erroHttp(403, null)))
      .toBe('Você não possui permissão para esta operação.');
    expect(mensagemErroMala(erroHttp(0, null)))
      .toBe('Não foi possível conectar à API.');
    expect(mensagemErroMala(new Error('x')))
      .toBe('Não foi possível concluir a operação. Tente novamente.');
  });

  it('só devolve campos em DADOS_INVALIDOS', () => {
    const invalido = erroHttp(400, {
      codigo: 'DADOS_INVALIDOS',
      campos: ['itens[0].quantidade', 'titulo', 3],
    });

    expect(camposInvalidos(invalido)).toEqual(['itens[0].quantidade', 'titulo']);
    expect(camposInvalidos(erroHttp(400, { codigo: 'REGRA_NEGOCIO', campos: ['x'] })))
      .toEqual([]);
  });

  it('calcula a data de hoje no fuso de São Paulo', () => {
    expect(hojeEmSaoPaulo(new Date('2026-11-08T02:30:00Z'))).toBe('2026-11-07');
    expect(hojeEmSaoPaulo(new Date('2026-11-08T03:30:00Z'))).toBe('2026-11-08');
  });

  it('normaliza nomes de itens como o backend', () => {
    expect(normalizarNomeItem('  Fralda ')).toBe(normalizarNomeItem('fralda'));
  });
});
