import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FilhoSelecionadoService } from '../core/services/filho-selecionado.service';
import { ObservacoesApi } from './observacoes.api';
import { Observacao } from './observacoes.model';

@Component({
  selector: 'app-observacoes',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './observacoes.html',
})
export class Observacoes implements OnInit {
  private readonly api = inject(ObservacoesApi);
  readonly familia = inject(FilhoSelecionadoService);

  readonly observacoes = signal<Observacao[]>([]);
  readonly ocupada = signal(false);
  readonly falhaListagem = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly formularioAberto = signal(false);
  readonly editando = signal<Observacao | null>(null);
  readonly paraExcluir = signal<Observacao | null>(null);

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:bg-stone-100';
  readonly botao = 'cursor-pointer rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';
  readonly primario = 'cursor-pointer rounded-xl bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-creche-verde focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  titulo = '';
  conteudo = '';

  ngOnInit(): void {
    void this.atualizar();
  }

  atualizar(): Promise<void> {
    return this.executar(async () => {
      this.fecharPaineis();
      await this.familia.carregar();
      await this.buscar();
    });
  }

  selecionarFilho(alunoId: string): Promise<void> {
    return this.executar(async () => {
      this.fecharPaineis();
      this.familia.selecionar(alunoId);
      await this.buscar();
    });
  }

  abrirFormulario(observacao: Observacao | null = null): void {
    if (this.ocupada() || !this.familia.alunoId()) return;
    this.fecharPaineis();
    this.limparMensagens();
    this.editando.set(observacao);
    this.titulo = observacao?.titulo ?? '';
    this.conteudo = observacao?.conteudo ?? '';
    this.formularioAberto.set(true);
  }

  pedirExclusao(observacao: Observacao): void {
    if (this.ocupada()) return;
    this.fecharPaineis();
    this.limparMensagens();
    this.paraExcluir.set(observacao);
  }

  fecharPaineis(): void {
    this.formularioAberto.set(false);
    this.editando.set(null);
    this.paraExcluir.set(null);
  }

  salvar(): Promise<void> {
    if (!this.formularioAberto() || this.ocupada()) return Promise.resolve();
    return this.executar(async () => {
      const titulo = this.titulo.trim();
      const conteudo = this.conteudo.trim();
      if (!titulo || titulo.length > 120) {
        this.erro.set('Informe um título com até 120 caracteres.');
        return;
      }
      if (conteudo.length > 5000) {
        this.erro.set('O texto pode ter no máximo 5.000 caracteres.');
        return;
      }
      const alunoId = this.familia.alunoId();
      const observacao = this.editando();
      if (observacao) {
        await firstValueFrom(
          this.api.editar(alunoId, observacao.id, { titulo, conteudo, versao: observacao.versao }),
        );
      } else {
        await firstValueFrom(this.api.cadastrar(alunoId, { titulo, conteudo }));
      }
      this.fecharPaineis();
      this.sucesso.set(observacao ? 'Observação atualizada.' : 'Observação cadastrada.');
      await this.buscar();
    });
  }

  confirmarExclusao(): Promise<void> {
    const observacao = this.paraExcluir();
    if (!observacao || this.ocupada()) return Promise.resolve();
    return this.executar(async () => {
      await firstValueFrom(this.api.excluir(this.familia.alunoId(), observacao.id));
      this.fecharPaineis();
      this.sucesso.set('Observação excluída.');
      await this.buscar();
    });
  }

  private async buscar(): Promise<void> {
    const alunoId = this.familia.alunoId();
    if (!alunoId) {
      this.observacoes.set([]);
      this.falhaListagem.set(false);
      return;
    }
    try {
      this.observacoes.set(await firstValueFrom(this.api.listar(alunoId)));
      this.falhaListagem.set(false);
    } catch (erro: unknown) {
      this.observacoes.set([]);
      this.falhaListagem.set(true);
      throw erro;
    }
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupada()) return;
    this.limparMensagens();
    this.ocupada.set(true);
    try {
      await acao();
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.ocupada.set(false);
    }
  }

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private mensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      switch (erro.status) {
        case 0:
          return 'Não foi possível conectar à API.';
        case 400:
          return 'Confira o título e o texto da observação.';
        case 401:
          return 'Sua sessão expirou. Entre novamente.';
        case 403:
          return 'Somente o responsável pela criança pode gerenciar as observações.';
        case 404:
          return 'A observação ou a criança não está mais disponível. Atualize a tela.';
        case 409:
          return 'A observação foi alterada por outra pessoa. Atualize a tela e tente de novo.';
      }
    }
    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
