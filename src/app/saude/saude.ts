import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FilhoSelecionadoService } from '../core/services/filho-selecionado.service';
import { SaudeApi } from './saude.api';
import { FichaSaude, FichaSaudeResumo } from './saude.model';

@Component({
  selector: 'app-saude',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './saude.html',
})
export class Saude implements OnInit {
  private readonly api = inject(SaudeApi);
  readonly familia = inject(FilhoSelecionadoService);

  readonly fichas = signal<FichaSaudeResumo[]>([]);
  readonly ocupada = signal(false);
  readonly falhaListagem = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly formularioAberto = signal(false);
  readonly editando = signal<FichaSaude | null>(null);
  readonly detalhe = signal<FichaSaude | null>(null);
  readonly paraExcluir = signal<FichaSaudeResumo | null>(null);

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:bg-stone-100';
  readonly botao = 'cursor-pointer rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';
  readonly primario = 'cursor-pointer rounded-xl bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-creche-verde focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  nome = '';
  observacoes = '';

  ngOnInit(): void {
    void this.atualizar();
  }

  atualizar(): Promise<void> {
    return this.executar(async () => {
      this.fecharPaineis();
      await this.familia.carregar();
      await this.buscarFichas();
    });
  }

  selecionarFilho(alunoId: string): Promise<void> {
    return this.executar(async () => {
      this.fecharPaineis();
      this.familia.selecionar(alunoId);
      await this.buscarFichas();
    });
  }

  abrirNovo(): void {
    if (this.ocupada() || !this.familia.alunoId()) return;
    this.fecharPaineis();
    this.limparMensagens();
    this.nome = '';
    this.observacoes = '';
    this.formularioAberto.set(true);
  }

  ver(ficha: FichaSaudeResumo): Promise<void> {
    return this.executar(async () => {
      this.fecharPaineis();
      this.detalhe.set(await firstValueFrom(this.api.visualizar(this.familia.alunoId(), ficha.id)));
    });
  }

  editar(ficha: FichaSaudeResumo | FichaSaude): Promise<void> {
    return this.executar(async () => {
      this.fecharPaineis();
      const completa = await firstValueFrom(this.api.visualizar(this.familia.alunoId(), ficha.id));
      this.editando.set(completa);
      this.nome = completa.nome;
      this.observacoes = completa.observacoes ?? '';
      this.formularioAberto.set(true);
    });
  }

  pedirExclusao(ficha: FichaSaudeResumo): void {
    if (this.ocupada()) return;
    this.fecharPaineis();
    this.limparMensagens();
    this.paraExcluir.set(ficha);
  }

  fecharPaineis(): void {
    this.formularioAberto.set(false);
    this.editando.set(null);
    this.detalhe.set(null);
    this.paraExcluir.set(null);
  }

  salvar(): Promise<void> {
    if (!this.formularioAberto() || this.ocupada()) return Promise.resolve();
    return this.executar(async () => {
      const nome = this.nome.trim();
      const observacoes = this.observacoes.trim();
      if (!nome || nome.length > 120) {
        this.erro.set('Informe um título com até 120 caracteres.');
        return;
      }
      if (observacoes.length > 5000) {
        this.erro.set('As observações podem ter no máximo 5.000 caracteres.');
        return;
      }
      const alunoId = this.familia.alunoId();
      const ficha = this.editando();
      if (ficha) {
        await firstValueFrom(
          this.api.editar(alunoId, ficha.id, { nome, observacoes, versao: ficha.versao }),
        );
      } else {
        await firstValueFrom(this.api.cadastrar(alunoId, { nome, observacoes }));
      }
      this.fecharPaineis();
      this.sucesso.set(ficha ? 'Informação atualizada.' : 'Informação cadastrada.');
      await this.buscarFichas();
    });
  }

  confirmarExclusao(): Promise<void> {
    const ficha = this.paraExcluir();
    if (!ficha || this.ocupada()) return Promise.resolve();
    return this.executar(async () => {
      await firstValueFrom(this.api.excluir(this.familia.alunoId(), ficha.id));
      this.fecharPaineis();
      this.sucesso.set('Informação excluída.');
      await this.buscarFichas();
    });
  }

  private async buscarFichas(): Promise<void> {
    const alunoId = this.familia.alunoId();
    if (!alunoId) {
      this.fichas.set([]);
      this.falhaListagem.set(false);
      return;
    }
    try {
      this.fichas.set(await firstValueFrom(this.api.listar(alunoId)));
      this.falhaListagem.set(false);
    } catch (erro: unknown) {
      this.fichas.set([]);
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
          return 'Confira o título e as observações.';
        case 401:
          return 'Sua sessão expirou. Entre novamente.';
        case 403:
          return 'Somente o responsável pela criança pode gerenciar estas informações.';
        case 404:
          return 'A informação ou a criança não está mais disponível. Atualize a tela.';
        case 409:
          return 'A informação foi alterada por outra pessoa. Atualize a tela e tente de novo.';
      }
    }
    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
