import {
  afterRenderEffect,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injectable,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

interface PedidoConfirmacao {
  titulo: string;
  mensagem: string;
  acao: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmacaoService {
  private readonly pedidoAtual = signal<PedidoConfirmacao | null>(null);
  private resolver: ((confirmado: boolean) => void) | null = null;

  readonly pedido = this.pedidoAtual.asReadonly();

  perguntar(pedido: PedidoConfirmacao): Promise<boolean> {
    if (this.resolver) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.pedidoAtual.set(pedido);
    });
  }

  responder(confirmado: boolean): void {
    const resolver = this.resolver;
    this.resolver = null;
    this.pedidoAtual.set(null);
    resolver?.(confirmado);
  }
}

@Component({
  selector: 'app-confirmacao-dialogo',
  standalone: true,
  template: `
    <dialog
      #dialogo
      role="alertdialog"
      aria-labelledby="confirmacao-titulo"
      aria-describedby="confirmacao-mensagem"
      (cancel)="cancelar($event)"
      class="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md
             overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-xl
             backdrop:bg-stone-900/50 sm:p-6"
    >
      @if (confirmacao.pedido(); as pedido) {
        <h2 id="confirmacao-titulo" class="break-words text-lg font-bold text-stone-900">
          {{ pedido.titulo }}
        </h2>
        <p id="confirmacao-mensagem" class="mt-2 break-words text-sm leading-relaxed text-stone-700">
          {{ pedido.mensagem }}
        </p>
        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            autofocus
            (click)="responder(false)"
            class="min-h-11 cursor-pointer rounded-xl border border-stone-300 px-4
                   text-sm font-semibold text-stone-800 hover:bg-stone-100
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-creche-verde"
          >
            Cancelar
          </button>
          <button
            type="button"
            (click)="responder(true)"
            class="min-h-11 cursor-pointer rounded-xl bg-red-700 px-4 text-sm font-semibold
                   text-white hover:bg-red-800 focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            {{ pedido.acao }}
          </button>
        </div>
      }
    </dialog>
  `,
})
export class ConfirmacaoDialogo {
  readonly confirmacao = inject(ConfirmacaoService);

  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  constructor() {
    const router = inject(Router);
    const destroyRef = inject(DestroyRef);

    afterRenderEffect(() => {
      if (!this.confirmacao.pedido()) return;

      const dialogo = this.dialogo().nativeElement;
      if (!dialogo.open) dialogo.showModal();
    });

    router.events.pipe(
      filter((evento) => evento instanceof NavigationStart),
      takeUntilDestroyed(destroyRef),
    ).subscribe(() => this.responder(false));

    destroyRef.onDestroy(() => this.confirmacao.responder(false));
  }

  cancelar(evento: Event): void {
    evento.preventDefault();
    this.responder(false);
  }

  responder(confirmado: boolean): void {
    if (!this.confirmacao.pedido()) return;

    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open) dialogo.close();

    this.confirmacao.responder(confirmado);
  }
}
