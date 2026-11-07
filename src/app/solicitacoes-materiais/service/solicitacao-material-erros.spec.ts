import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import {
  camposInvalidos,
  conflitoVersao,
  MENSAGEM_CONFLITO_VERSAO,
  MENSAGEM_SEM_PERMISSAO,
  mensagemErroSolicitacao,
  normalizarNomeItem,
  precisaRecarregarDetalhe,
  solicitacaoJaFinalizada,
} from './solicitacao-material-erros';

function erroHttp(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('solicitacao-material-erros', () => {

  it('usa a mensagem do ProblemDetail em regra de negócio', () => {
    const erro = erroHttp(400, {
      codigo: 'REGRA_NEGOCIO',
      mensagem: 'Esta solicitação já foi finalizada.',
    });

    const mensagem = mensagemErroSolicitacao(erro);

    expect(mensagem).toBe('Esta solicitação já foi finalizada.');
  });


  it('mantém a mensagem do backend no conflito de versão', () => {
    const erroComCorpo = erroHttp(409, {
      codigo: 'CONFLITO_VERSAO',
      mensagem: 'Cadastro alterado por outra pessoa. Recarregue os dados.',
    });

    const erroSemCorpo = erroHttp(409, null);

    expect(conflitoVersao(erroComCorpo)).toBe(true);

    expect(mensagemErroSolicitacao(erroComCorpo)).toBe(MENSAGEM_CONFLITO_VERSAO);

    expect(mensagemErroSolicitacao(erroSemCorpo)).toBe(MENSAGEM_CONFLITO_VERSAO);
  });


  it('trata 403 pelo status, com ou sem corpo', () => {
    const erroSemCorpo = erroHttp(403, null);

    const erroComCorpo = erroHttp(403, {
      codigo: 'ACESSO_NEGADO',
      mensagem: 'Outra mensagem qualquer',
    });

    expect(mensagemErroSolicitacao(erroSemCorpo)).toBe(MENSAGEM_SEM_PERMISSAO);

    expect(mensagemErroSolicitacao(erroComCorpo)).toBe(MENSAGEM_SEM_PERMISSAO);
  });


  it('cai na mensagem padrão do código ou do status quando não há mensagem', () => {
    const naoEncontrada = erroHttp(404, {
      codigo: 'SOLICITACAO_MATERIAL_NAO_ENCONTRADA',
    });

    const sessaoExpirada = erroHttp(401, null);

    const semConexao = erroHttp(0, null);

    const erroDesconhecido = new Error('falha qualquer');


    expect(mensagemErroSolicitacao(naoEncontrada))
      .toBe('A solicitação não foi encontrada. Atualize a listagem.');

    expect(mensagemErroSolicitacao(sessaoExpirada))
      .toBe('Sua sessão expirou. Entre novamente.');

    expect(mensagemErroSolicitacao(semConexao))
      .toBe('Não foi possível conectar à API.');

    expect(mensagemErroSolicitacao(erroDesconhecido))
      .toBe('Não foi possível concluir a operação. Tente novamente.');
  });


  it('só devolve campos em DADOS_INVALIDOS', () => {
    const dadosInvalidos = erroHttp(400, {
      codigo: 'DADOS_INVALIDOS',
      campos: ['sala', 'itens[0].quantidade', 7],
    });

    const regraNegocio = erroHttp(400, {
      codigo: 'REGRA_NEGOCIO',
      campos: ['titulo'],
    });

    expect(camposInvalidos(dadosInvalidos)).toEqual(['sala', 'itens[0].quantidade']);

    expect(camposInvalidos(regraNegocio)).toEqual([]);
  });


  it('pede para recarregar o detalhe em conflito, pedido finalizado ou não encontrado', () => {
    const conflito = erroHttp(409, null);

    const finalizada = erroHttp(400, {
      codigo: 'REGRA_NEGOCIO',
      mensagem: 'Esta solicitação já foi finalizada.',
    });

    const naoEncontrada = erroHttp(404, null);

    const itensRepetidos = erroHttp(400, {
      codigo: 'REGRA_NEGOCIO',
      mensagem: 'A solicitação possui itens repetidos.',
    });


    expect(solicitacaoJaFinalizada(finalizada)).toBe(true);

    expect(precisaRecarregarDetalhe(conflito)).toBe(true);

    expect(precisaRecarregarDetalhe(finalizada)).toBe(true);

    expect(precisaRecarregarDetalhe(naoEncontrada)).toBe(true);

    expect(precisaRecarregarDetalhe(itensRepetidos)).toBe(false);
  });


  it('normaliza nomes de itens como o backend', () => {
    const comEspacosEMaiuscula = normalizarNomeItem('  Apagador ');

    const minusculo = normalizarNomeItem('apagador');

    expect(comEspacosEMaiuscula).toBe(minusculo);
  });

});
