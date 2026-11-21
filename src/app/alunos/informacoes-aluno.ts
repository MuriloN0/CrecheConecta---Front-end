import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, Input, OnChanges, OnDestroy, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { InformacoesRelevantesApi } from '../informacoes-relevantes/informacoes-relevantes.api';
import {
  InformacaoRelevante,
  InformacaoRelevanteResumo,
} from '../informacoes-relevantes/informacoes-relevantes.model';

@Component({
  selector: 'app-informacoes-aluno',
  standalone: true,
  imports: [DatePipe],
  host: { class: 'block' },
  template: `
    <section
      class="space-y-3 border-t border-stone-200 pt-4"
      aria-labelledby="titulo-informacoes-aluno"
      [attr.aria-busy]="carregando()"
    >
      <h3 id="titulo-informacoes-aluno" class="font-semibold">
        Informações relevantes
      </h3>

      <p class="text-sm text-stone-600">
        Informações fornecidas pelos responsáveis.
      </p>

      @if (carregando()) {
        <p role="status" class="text-sm text-stone-600">
          Carregando informações…
        </p>
      } @else if (erro()) {
        <p role="alert" class="text-sm text-red-800">{{ erro() }}</p>
        <button type="button" [class]="botao" (click)="carregar()">
          Tentar novamente
        </button>
      } @else {
        <ul class="space-y-2">
          @for (informacao of informacoes(); track informacao.id) {
            <li
              class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-3"
            >
              <span class="min-w-0 flex-1 wrap-anywhere text-sm font-semibold">
                {{ informacao.nome }}
              </span>

              <button
                type="button"
                [class]="botao"
                (click)="consultar(informacao)"
                [attr.aria-label]="'Ver informação: ' + informacao.nome"
                [attr.aria-expanded]="detalhe()?.id === informacao.id"
              >
                Ver informação
              </button>
            </li>
          } @empty {
            <li class="text-sm text-stone-600">
              Nenhuma informação relevante cadastrada.
            </li>
          }
        </ul>
      }

      @if (carregandoDetalhe()) {
        <p role="status" class="text-sm text-stone-600">
          Carregando conteúdo…
        </p>
      }

      @if (erroDetalhe()) {
        <p role="alert" class="text-sm text-red-800">
          {{ erroDetalhe() }}
        </p>
      }

      @if (detalhe(); as informacao) {
        <article
          class="space-y-3 rounded-xl border border-stone-200 p-4"
          aria-labelledby="titulo-conteudo-informacao"
        >
          <h4
            id="titulo-conteudo-informacao"
            class="wrap-anywhere font-semibold"
          >
            {{ informacao.nome }}
          </h4>

          <p class="whitespace-pre-wrap wrap-anywhere text-sm">{{
            informacao.observacoes || 'Sem observações adicionais.'
          }}</p>

          <p class="text-xs text-stone-600">
            Atualizada em
            {{ informacao.dataAtualizacao | date: 'dd/MM/yyyy HH:mm' }}
          </p>

          <button
            type="button"
            [class]="botao"
            (click)="fecharInformacao()"
          >
            Fechar informação
          </button>
        </article>
      }
    </section>
  `,
})
export class InformacoesAluno implements OnChanges, OnDestroy {
  @Input({ required: true }) alunoId = '';

  private readonly api = inject(InformacoesRelevantesApi);
  private listagem?: Subscription;
  private consulta?: Subscription;

  readonly informacoes = signal<InformacaoRelevanteResumo[]>([]);
  readonly detalhe = signal<InformacaoRelevante | null>(null);
  readonly carregando = signal(false);
  readonly carregandoDetalhe = signal(false);
  readonly erro = signal('');
  readonly erroDetalhe = signal('');

  readonly botao =
    'cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-creche-verde';

  ngOnChanges(): void {
    this.carregar();
  }

  carregar(): void {
    this.listagem?.unsubscribe();
    this.fecharInformacao();
    this.informacoes.set([]);
    this.erro.set('');
    this.carregando.set(false);

    if (!this.alunoId) return;

    this.carregando.set(true);

    this.listagem = this.api.listar(this.alunoId).subscribe({
      next: (informacoes) => {
        this.informacoes.set(informacoes);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.erro.set(this.mensagemErro(erro));
        this.carregando.set(false);
      },
    });
  }

  consultar(informacao: InformacaoRelevanteResumo): void {
    if (
      this.carregando() ||
      !this.informacoes().some((item) => item.id === informacao.id)
    ) {
      return;
    }

    this.fecharInformacao();
    this.carregandoDetalhe.set(true);

    const alunoId = this.alunoId;

    this.consulta = this.api.visualizar(alunoId, informacao.id).subscribe({
      next: (detalhe) => {
        this.carregandoDetalhe.set(false);

        if (
          detalhe.alunoId !== alunoId ||
          detalhe.id !== informacao.id
        ) {
          this.erroDetalhe.set(
            'Não foi possível carregar esta informação. Tente novamente.',
          );
          return;
        }

        this.detalhe.set(detalhe);
      },
      error: (erro: unknown) => {
        this.erroDetalhe.set(this.mensagemErro(erro));
        this.carregandoDetalhe.set(false);
      },
    });
  }

  fecharInformacao(): void {
    this.consulta?.unsubscribe();
    this.detalhe.set(null);
    this.erroDetalhe.set('');
    this.carregandoDetalhe.set(false);
  }

  ngOnDestroy(): void {
    this.listagem?.unsubscribe();
    this.fecharInformacao();
    this.informacoes.set([]);
  }

  private mensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      if (erro.status === 401) {
        return 'Sua sessão expirou. Entre novamente.';
      }

      if (erro.status === 403) {
        return 'Você não tem permissão para consultar estas informações.';
      }

      if (erro.status === 429) {
        return 'Aguarde um momento antes de consultar novamente.';
      }
    }

    return 'Não foi possível carregar as informações relevantes. Tente novamente.';
  }
}
