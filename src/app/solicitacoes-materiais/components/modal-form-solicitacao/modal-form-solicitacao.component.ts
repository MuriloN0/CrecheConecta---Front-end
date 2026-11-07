import { Component, effect, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DialogoModalDirective } from '../../../mala-virtual/components/dialogo-modal.directive';
import {
  AtualizarSolicitacaoRequest,
  CriarSolicitacaoRequest,
  ItemSolicitacaoRequest,
  LISTA_PRIORIDADES,
  PrioridadeSolicitacao,
  ROTULOS_PRIORIDADE,
  SolicitacaoMaterial,
} from '../../model/solicitacao-material.model';
import { normalizarNomeItem } from '../../service/solicitacao-material-erros';

interface LinhaItem {
  chave: number;
  nome: string;
  quantidade: number | null;
}

const MAX_ITENS = 50;

const MAX_TITULO = 150;
const MAX_SALA = 50;
const MAX_DESCRICAO = 2000;
const MAX_NOME_ITEM = 100;

@Component({
  selector: 'app-modal-form-solicitacao',
  standalone: true,
  imports: [FormsModule, DialogoModalDirective],
  templateUrl: './modal-form-solicitacao.component.html',
})
export class ModalFormSolicitacaoComponent {
  readonly solicitacao = input<SolicitacaoMaterial | null>(null);
  readonly salvando = input(false);
  readonly erro = input('');
  readonly camposServidor = input<string[]>([]);

  readonly salvar = output<CriarSolicitacaoRequest | AtualizarSolicitacaoRequest>();
  readonly fechar = output<void>();


  readonly maxItens = MAX_ITENS;
  readonly maxTitulo = MAX_TITULO;
  readonly maxSala = MAX_SALA;
  readonly maxDescricao = MAX_DESCRICAO;
  readonly maxNomeItem = MAX_NOME_ITEM;

  readonly prioridades = LISTA_PRIORIDADES;
  readonly rotulosPrioridade = ROTULOS_PRIORIDADE;

  readonly tentouSalvar = signal(false);
  readonly camposDoServidor = linkedSignal(() => this.camposServidor());


  titulo = '';
  sala = '';
  descricao = '';
  prioridade: PrioridadeSolicitacao | '' = '';
  itens: LinhaItem[] = [];

  private proximaChave = 0;


  constructor() {
    effect(() => this.preencher(this.solicitacao()));
  }

  editando(): boolean {
    return this.solicitacao() !== null;
  }


  adicionarItem(): void {
    if (this.salvando() || this.itens.length >= MAX_ITENS) {
      return;
    }

    const linha = this.novaLinha();

    this.itens = [...this.itens, linha];
    this.descartarErrosDeItens();

    this.focar(`item-nome-solicitacao-${linha.chave}`);
  }

  removerItem(indice: number): void {
    if (this.salvando() || this.itens.length <= 1) {
      return;
    }

    this.itens = this.itens.filter((_, posicao) => posicao !== indice);
    this.descartarErrosDeItens();

    const vizinha = this.itens[Math.min(indice, this.itens.length - 1)];

    this.focar(vizinha ? `item-nome-solicitacao-${vizinha.chave}` : 'adicionar-item-solicitacao');
  }


  erroTitulo(): string | null {
    const titulo = this.titulo.trim();

    if (this.tentouSalvar() && !titulo) {
      return 'Informe o título da solicitação.';
    }

    if (titulo.length > MAX_TITULO) {
      return `Use no máximo ${MAX_TITULO} caracteres.`;
    }

    if (this.campoServidor('titulo')) {
      return 'Confira o título.';
    }

    return null;
  }

  erroSala(): string | null {
    const sala = this.sala.trim();

    if (this.tentouSalvar() && !sala) {
      return 'Informe a sala.';
    }

    if (sala.length > MAX_SALA) {
      return `Use no máximo ${MAX_SALA} caracteres.`;
    }

    if (this.campoServidor('sala')) {
      return 'Confira a sala.';
    }

    return null;
  }

  erroDescricao(): string | null {
    if (this.descricao.trim().length > MAX_DESCRICAO) {
      return `Use no máximo ${MAX_DESCRICAO} caracteres.`;
    }

    if (this.campoServidor('descricao')) {
      return 'Confira a descrição.';
    }

    return null;
  }

  erroPrioridade(): string | null {
    if (this.tentouSalvar() && !this.prioridade) {
      return 'Selecione a prioridade.';
    }

    if (this.campoServidor('prioridade')) {
      return 'Confira a prioridade.';
    }

    return null;
  }

  erroLista(): string | null {
    if (this.itens.length === 0) {
      return 'Inclua pelo menos um item.';
    }

    if (this.itens.length > MAX_ITENS) {
      return `Use no máximo ${MAX_ITENS} itens.`;
    }

    if (this.campoServidor('itens')) {
      return 'Confira a lista de itens.';
    }

    return null;
  }

  erroNome(indice: number): string | null {
    const nome = this.itens[indice].nome.trim();

    if (this.tentouSalvar() && !nome) {
      return 'Informe o nome do item.';
    }

    if (nome.length > MAX_NOME_ITEM) {
      return `Use no máximo ${MAX_NOME_ITEM} caracteres.`;
    }

    if (nome && this.nomeRepetido(indice)) {
      return 'Este item já está na lista.';
    }

    if (this.campoServidor(`itens[${indice}].nome`)) {
      return 'Confira o nome do item.';
    }

    return null;
  }

  erroQuantidade(indice: number): string | null {
    const quantidade = this.itens[indice].quantidade;

    const quantidadeValida =
      Number.isInteger(quantidade) && quantidade! >= 1 && quantidade! <= 999;

    const deveValidar = this.tentouSalvar() || quantidade !== null;

    if (deveValidar && !quantidadeValida) {
      return 'Use um número inteiro de 1 a 999.';
    }

    if (this.campoServidor(`itens[${indice}].quantidade`)) {
      return 'Confira a quantidade.';
    }

    return null;
  }


  enviar(): void {
    if (this.salvando()) {
      return;
    }

    this.tentouSalvar.set(true);

    if (!this.formularioValido()) {
      this.focarPrimeiroErro();
      return;
    }

    const itens: ItemSolicitacaoRequest[] = this.itens.map((linha) => ({
      nome: linha.nome.trim(),
      quantidade: Number(linha.quantidade),
    }));

    const descricao = this.descricao.trim();

    const dados: CriarSolicitacaoRequest = {
      titulo: this.titulo.trim(),
      sala: this.sala.trim(),
      descricao: descricao || null,
      prioridade: this.prioridade as PrioridadeSolicitacao,
      itens,
    };

    const solicitacao = this.solicitacao();

    if (solicitacao) {
      this.salvar.emit({ ...dados, versao: solicitacao.versao });
    } else {
      this.salvar.emit(dados);
    }
  }


  private formularioValido(): boolean {
    const camposPrincipaisValidos =
      !this.erroTitulo()
      && !this.erroSala()
      && !this.erroDescricao()
      && !this.erroPrioridade()
      && !this.erroLista();

    const itensValidos = this.itens.every(
      (_, indice) => !this.erroNome(indice) && !this.erroQuantidade(indice),
    );

    return camposPrincipaisValidos && itensValidos;
  }

  private preencher(solicitacao: SolicitacaoMaterial | null): void {
    this.tentouSalvar.set(false);

    if (!solicitacao) {
      this.titulo = '';
      this.sala = '';
      this.descricao = '';
      this.prioridade = '';
      this.itens = [this.novaLinha()];
      return;
    }

    this.titulo = solicitacao.titulo;
    this.sala = solicitacao.sala;
    this.descricao = solicitacao.descricao ?? '';
    this.prioridade = solicitacao.prioridade;

    this.itens = solicitacao.itens.map((item) => ({
      chave: this.proximaChave++,
      nome: item.nome,
      quantidade: item.quantidade,
    }));
  }

  private novaLinha(): LinhaItem {
    return { chave: this.proximaChave++, nome: '', quantidade: 1 };
  }

  private nomeRepetido(indice: number): boolean {
    const nome = normalizarNomeItem(this.itens[indice].nome);

    return this.itens.some(
      (linha, posicao) => posicao < indice && normalizarNomeItem(linha.nome) === nome,
    );
  }

  private campoServidor(campo: string): boolean {
    return this.camposDoServidor().includes(campo);
  }

  private descartarErrosDeItens(): void {
    this.camposDoServidor.update((campos) =>
      campos.filter((campo) => !campo.startsWith('itens')),
    );
  }

  private focarPrimeiroErro(): void {
    setTimeout(() => {
      document
        .querySelector<HTMLElement>('app-modal-form-solicitacao [aria-invalid="true"]')
        ?.focus();
    });
  }

  private focar(id: string): void {
    setTimeout(() => document.getElementById(id)?.focus());
  }
}
