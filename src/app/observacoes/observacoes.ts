import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { FilhoSelecionadoService } from '../core/services/filho-selecionado.service';
import { ObservacoesApi } from './observacoes.api';
import { Observacao } from './observacoes.model';

/** Portal da família: o responsável lê as observações que os professores registraram sobre a criança. */
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

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:bg-stone-100';
  readonly botao = 'cursor-pointer rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';

  ngOnInit(): void {
    void this.atualizar();
  }

  atualizar(): Promise<void> {
    return this.executar(async () => {
      await this.familia.carregar();
      await this.buscar();
    });
  }

  selecionarFilho(alunoId: string): Promise<void> {
    return this.executar(async () => {
      this.familia.selecionar(alunoId);
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
    this.erro.set('');
    this.ocupada.set(true);
    try {
      await acao();
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.ocupada.set(false);
    }
  }

  private mensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      switch (erro.status) {
        case 0:
          return 'Não foi possível conectar à API.';
        case 401:
          return 'Sua sessão expirou. Entre novamente.';
        case 403:
          return 'Você não tem acesso às observações desta criança.';
        case 404:
          return 'A criança não está mais disponível. Atualize a tela.';
      }
    }
    return 'Não foi possível carregar as observações. Tente novamente.';
  }
}
