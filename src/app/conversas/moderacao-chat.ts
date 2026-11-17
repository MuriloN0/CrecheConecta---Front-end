import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Observable } from 'rxjs';

interface SituacaoModeracao {
  bloqueado: boolean;
  expiraEm: string | null;
}

@Component({
  selector: 'app-moderacao-chat',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <button type="button" [class]="botao" aria-haspopup="dialog" (click)="abrir(dialogo)">
      Moderar chat
    </button>

    <dialog #dialogo aria-labelledby="titulo-moderacao-chat"
      class="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md
             overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 text-creche-texto
             shadow-xl backdrop:bg-stone-900/50">
      <header class="flex items-start justify-between gap-3">
        <h2 id="titulo-moderacao-chat" class="wrap-anywhere text-lg font-bold">
          Moderar chat de {{ nome() }}
        </h2>
        <button type="button" autofocus [class]="botao" (click)="dialogo.close()">Fechar</button>
      </header>

      @if (ocupada()) {
        <p role="status" class="mt-3 text-sm text-stone-600">Processando…</p>
      }
      @if (erro()) {
        <p role="alert" class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{{ erro() }}</p>
      }

      @if (situacao(); as atual) {
        <p class="mt-4 text-sm" role="status">
          @if (!atual.bloqueado) {
            O envio de mensagens está liberado.
          } @else if (atual.expiraEm) {
            Envio suspenso até {{ atual.expiraEm | date: 'dd/MM/yyyy HH:mm' }}.
          } @else {
            Envio suspenso até desbloqueio pela direção.
          }
        </p>

        @if (atual.bloqueado) {
          <button type="button" [class]="botao + ' mt-4'" [disabled]="ocupada()"
            (click)="desbloquear()">
            Desbloquear envio
          </button>
        } @else {
          <form class="mt-4 space-y-3" #form="ngForm" (ngSubmit)="bloquear()">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" name="permanente" [(ngModel)]="permanente"
                [disabled]="ocupada()" class="size-4 accent-creche-verde" />
              Suspender até desbloqueio manual
            </label>

            @if (!permanente) {
              <label class="grid gap-1 text-sm font-semibold">
                Duração em minutos
                <input type="number" name="minutos" [(ngModel)]="minutos" required
                  min="1" max="43200" step="1" [disabled]="ocupada()"
                  class="rounded-xl border border-stone-300 px-3 py-2" />
              </label>
            }

            <p class="text-sm text-stone-600">O responsável continuará podendo ler as conversas.</p>

            <button type="submit" [disabled]="ocupada() || form.invalid"
              class="min-h-10 rounded-xl bg-creche-verde px-3 text-sm font-semibold text-white
                     disabled:opacity-50">
              Suspender envio
            </button>
          </form>
        }
      } @else if (!ocupada()) {
        <button type="button" [class]="botao + ' mt-4'" (click)="consultar()">Tentar novamente</button>
      }
    </dialog>
  `,
})
export class ModeracaoChat {
  readonly responsavelId = input.required<string>();
  readonly nome = input.required<string>();

  private readonly http = inject(HttpClient);
  private readonly destroy = inject(DestroyRef);

  readonly situacao = signal<SituacaoModeracao | null>(null);
  readonly ocupada = signal(false);
  readonly erro = signal('');
  readonly botao =
    'min-h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-creche-verde hover:bg-creche-creme disabled:opacity-50';

  permanente = false;
  minutos: number | null = 60;

  abrir(dialogo: HTMLDialogElement): void {
    dialogo.showModal();

    if (!this.ocupada()) {
      this.situacao.set(null);
      this.permanente = false;
      this.minutos = 60;
      this.consultar();
    }
  }

  consultar(): void {
    void this.executar(this.http.get<SituacaoModeracao>(this.url()));
  }

  bloquear(): void {
    const minutos = this.permanente ? null : this.minutos;

    if (!this.permanente && (minutos === null || !Number.isInteger(minutos) || minutos < 1 || minutos > 43200)) {
      this.erro.set('Informe uma duração inteira entre 1 e 43.200 minutos.');
      return;
    }

    void this.executar(this.http.put<SituacaoModeracao>(this.url(), {
      permanente: this.permanente,
      minutos,
    }));
  }

  desbloquear(): void {
    void this.executar(this.http.delete<SituacaoModeracao>(this.url()));
  }

  private url(): string {
    return `/api/chat/moderacao/${encodeURIComponent(this.responsavelId())}`;
  }

  private async executar(requisicao: Observable<SituacaoModeracao>): Promise<void> {
    if (this.ocupada()) return;

    this.ocupada.set(true);
    this.erro.set('');

    try {
      const dados = await firstValueFrom(
        requisicao.pipe(takeUntilDestroyed(this.destroy)),
        { defaultValue: null },
      );
      if (dados) this.situacao.set(dados);
    } catch (erro: unknown) {
      const detalhe: unknown = erro instanceof HttpErrorResponse && erro.status === 400
        ? erro.error?.detail
        : null;

      this.erro.set(typeof detalhe === 'string' ? detalhe : 'Não foi possível atualizar a moderação.');
    } finally {
      this.ocupada.set(false);
    }
  }
}
