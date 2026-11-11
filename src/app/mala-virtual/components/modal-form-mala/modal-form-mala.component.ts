import { DatePipe } from '@angular/common';
import { Component, effect, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AtualizarMalaRequest,
  CriarMalaRequest,
  ItemMalaRequest,
  MalaTurma,
} from '../../model/mala-virtual.model';
import { hojeEmSaoPaulo, normalizarNomeItem } from '../../service/mala-virtual-erros';
import { DialogoModalDirective } from '../dialogo-modal.directive';

interface LinhaItem {
  chave: number;
  id?: string;
  nome: string;
  quantidade: number | null;
}

const MAX_ITENS = 50;

@Component({
  selector: 'app-modal-form-mala',
  standalone: true,
  imports: [DatePipe, FormsModule, DialogoModalDirective],
  templateUrl: './modal-form-mala.component.html',
})
export class ModalFormMalaComponent {
  readonly mala = input<MalaTurma | null>(null);
  readonly nomeTurma = input('');
  readonly salvando = input(false);
  readonly erro = input('');
  readonly camposServidor = input<string[]>([]);

  readonly salvar = output<CriarMalaRequest | AtualizarMalaRequest>();
  readonly fechar = output<void>();

  readonly maxItens = MAX_ITENS;
  readonly hoje = hojeEmSaoPaulo();
  readonly tentouSalvar = signal(false);
  readonly camposDoServidor = linkedSignal(() => this.camposServidor());

  titulo = '';
  data = '';
  observacao = '';
  itens: LinhaItem[] = [];
  removidos: LinhaItem[] = [];

  private proximaChave = 0;

  constructor() {
    effect(() => this.preencher(this.mala()));
  }

  editando(): boolean {
    return this.mala() !== null;
  }

  dataMinima(): string | null {
    const mala = this.mala();
    return mala && mala.data < this.hoje ? null : this.hoje;
  }

  adicionarItem(): void {
    if (this.salvando() || this.itens.length >= MAX_ITENS) return;

    const linha = this.novaLinha();
    this.itens = [...this.itens, linha];
    this.descartarErrosDeItens();
    this.focar(`item-nome-${linha.chave}`);
  }

  removerItem(indice: number): void {
    if (this.salvando() || this.itens.length <= 1) return;

    const linha = this.itens[indice];
    this.itens = this.itens.filter((_, i) => i !== indice);

    if (linha.id) {
      this.removidos = [...this.removidos, linha];
    }

    this.descartarErrosDeItens();

    const vizinha = this.itens[Math.min(indice, this.itens.length - 1)];
    this.focar(vizinha ? `item-nome-${vizinha.chave}` : 'adicionar-item-mala');
  }

  restaurarItem(linha: LinhaItem): void {
    if (this.salvando() || this.itens.length >= MAX_ITENS) return;

    this.removidos = this.removidos.filter((item) => item.chave !== linha.chave);
    this.itens = [...this.itens, linha];
    this.descartarErrosDeItens();
    this.focar(`item-nome-${linha.chave}`);
  }

  erroTitulo(): string | null {
    const titulo = this.titulo.trim();

    if (this.tentouSalvar() && !titulo) return 'Informe o título da mala.';
    if (titulo.length > 150) return 'Use no máximo 150 caracteres.';
    if (this.campoServidor('titulo')) return 'Confira o título.';
    return null;
  }

  erroData(): string | null {
    const mala = this.mala();

    if (this.tentouSalvar() && !/^\d{4}-\d{2}-\d{2}$/.test(this.data)) {
      return 'Informe a data da aula.';
    }

    const dataMudou = !mala || this.data !== mala.data;
    if (this.data && dataMudou && this.data < this.hoje) {
      return 'A data da aula não pode estar no passado.';
    }

    if (this.campoServidor('data')) return 'Confira a data da aula.';
    return null;
  }

  erroObservacao(): string | null {
    if (this.observacao.trim().length > 1000) return 'Use no máximo 1000 caracteres.';
    if (this.campoServidor('observacao')) return 'Confira a observação.';
    return null;
  }

  erroLista(): string | null {
    if (this.itens.length === 0) return 'Inclua pelo menos um item.';
    if (this.itens.length > MAX_ITENS) return `Use no máximo ${MAX_ITENS} itens.`;
    if (this.campoServidor('itens')) return 'Confira a lista de itens.';
    return null;
  }

  erroNome(indice: number): string | null {
    const nome = this.itens[indice].nome.trim();

    if (this.tentouSalvar() && !nome) return 'Informe o nome do item.';
    if (nome.length > 100) return 'Use no máximo 100 caracteres.';
    if (nome && this.nomeRepetido(indice)) return 'Este item já está na lista.';
    if (this.campoServidor(`itens[${indice}].nome`)) return 'Confira o nome do item.';
    return null;
  }

  erroQuantidade(indice: number): string | null {
    const quantidade = this.itens[indice].quantidade;
    const valida = Number.isInteger(quantidade) && quantidade! >= 1 && quantidade! <= 999;

    if ((this.tentouSalvar() || quantidade !== null) && !valida) {
      return 'Use um número inteiro de 1 a 999.';
    }

    if (this.campoServidor(`itens[${indice}].quantidade`)) return 'Confira a quantidade.';
    return null;
  }

  enviar(): void {
    if (this.salvando()) return;

    this.tentouSalvar.set(true);

    const formularioValido =
      !this.erroTitulo()
      && !this.erroData()
      && !this.erroObservacao()
      && !this.erroLista()
      && this.itens.every((_, i) => !this.erroNome(i) && !this.erroQuantidade(i));

    if (!formularioValido) {
      this.focarPrimeiroErro();
      return;
    }

    const itens: ItemMalaRequest[] = this.itens.map((linha) => ({
      ...(linha.id ? { id: linha.id } : {}),
      nome: linha.nome.trim(),
      quantidade: Number(linha.quantidade),
    }));

    const observacao = this.observacao.trim();
    const dados: CriarMalaRequest = {
      titulo: this.titulo.trim(),
      data: this.data,
      ...(observacao ? { observacao } : {}),
      itens,
    };

    const mala = this.mala();
    this.salvar.emit(mala ? { ...dados, versao: mala.versao } : dados);
  }

  private preencher(mala: MalaTurma | null): void {
    this.tentouSalvar.set(false);
    this.removidos = [];

    if (!mala) {
      this.titulo = '';
      this.data = this.hoje;
      this.observacao = '';
      this.itens = [this.novaLinha()];
      return;
    }

    this.titulo = mala.titulo;
    this.data = mala.data;
    this.observacao = mala.observacao ?? '';
    this.itens = mala.itens.map((item) => ({
      chave: this.proximaChave++,
      id: item.id,
      nome: item.nome,
      quantidade: item.quantidade,
    }));
  }

  private novaLinha(): LinhaItem {
    return { chave: this.proximaChave++, nome: '', quantidade: 1 };
  }

  private nomeRepetido(indice: number): boolean {
    const nome = normalizarNomeItem(this.itens[indice].nome);
    return this.itens.some((linha, i) => i < indice && normalizarNomeItem(linha.nome) === nome);
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
        .querySelector<HTMLElement>('app-modal-form-mala [aria-invalid="true"]')
        ?.focus();
    });
  }

  private focar(id: string): void {
    setTimeout(() => document.getElementById(id)?.focus());
  }
}
