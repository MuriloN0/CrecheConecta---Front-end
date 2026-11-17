import { Component, ElementRef, computed, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, of, switchMap, timer } from 'rxjs';

export interface OpcaoVinculo {
  id: string;
  nome: string;
  detalhe?: string;
}

interface PaginaOpcoes {
  content: OpcaoVinculo[];
  totalPages: number;
}

export type BuscaVinculo = (nome: string, pagina: number, tamanho: number) => Observable<PaginaOpcoes>;

interface Pedido {
  nome: string;
  pagina: number;
  esperaMs: number;
}

const OPCOES_POR_PAGINA = 5;

@Component({
  selector: 'app-seletor-vinculo',
  standalone: true,
  template: `
    <div class="relative" (focusout)="aoSair($event)" (keydown.escape)="aoPressionarEscape($event, campo)">
      <label class="grid gap-1 text-sm font-semibold">
        {{ rotulo() }}
        <input #campo [id]="idCampo()" type="search" autocomplete="off" maxlength="150"
          [placeholder]="placeholder()" [value]="valorCampo()" [disabled]="desabilitado()"
          [attr.aria-controls]="aberto() ? idCampo() + '-opcoes' : null"
          (focus)="abrir()" (click)="abrir()" (input)="digitar(campo.value)"
          class="min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2
                 font-normal focus-visible:ring-2 focus-visible:ring-creche-verde disabled:opacity-50" />
      </label>

      @if (aberto()) {
        <div [id]="idCampo() + '-opcoes'" role="group" aria-label="Resultados da pesquisa"
          class="absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
          @if (carregando()) {
            <p role="status" class="px-2 py-2 text-sm text-stone-600">Buscando…</p>
          } @else if (erro()) {
            <p role="alert" class="px-2 py-2 text-sm text-red-800">Não foi possível carregar as opções.</p>
            <button type="button" class="px-2 py-2 text-sm font-semibold text-creche-verde"
              (click)="mudarPagina(pagina(), campo)">Tentar novamente</button>
          } @else if (opcoes().length === 0) {
            <p role="status" class="px-2 py-2 text-sm text-stone-600">Nenhum resultado.</p>
          } @else {
            <ul class="divide-y divide-stone-100">
              @for (opcao of opcoes(); track opcao.id) {
                <li>
                  <button type="button" (click)="selecionar(opcao, campo)"
                    class="block w-full cursor-pointer wrap-anywhere rounded-lg px-2 py-2 text-left text-sm
                           hover:bg-creche-creme focus-visible:ring-2 focus-visible:ring-creche-verde">
                    <span class="font-semibold">{{ opcao.nome }}</span>
                    @if (opcao.detalhe) {
                      <span class="text-stone-600"> · {{ opcao.detalhe }}</span>
                    }
                  </button>
                </li>
              }
            </ul>

            @if (totalPaginas() > 1) {
              <nav class="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-2"
                aria-label="Páginas dos resultados">
                <button type="button" [disabled]="pagina() === 0"
                  class="rounded-lg px-2 py-2 text-sm font-semibold text-creche-verde disabled:opacity-50"
                  (click)="mudarPagina(pagina() - 1, campo)">Anterior</button>
                <span class="text-xs text-stone-600">Página {{ pagina() + 1 }} de {{ totalPaginas() }}</span>
                <button type="button" [disabled]="pagina() + 1 >= totalPaginas()"
                  class="rounded-lg px-2 py-2 text-sm font-semibold text-creche-verde disabled:opacity-50"
                  (click)="mudarPagina(pagina() + 1, campo)">Próxima</button>
              </nav>
            }
          }
        </div>
      }
    </div>
  `,
})
export class SeletorVinculo {
  readonly idCampo = input.required<string>();
  readonly rotulo = input.required<string>();
  readonly placeholder = input.required<string>();
  readonly carregar = input.required<BuscaVinculo>();
  readonly desabilitado = input(false);
  readonly preservarSelecaoNaBusca = input(false);
  readonly selecionado = model<OpcaoVinculo | null>(null);

  readonly aberto = signal(false);
  readonly carregando = signal(false);
  readonly erro = signal(false);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly opcoes = signal<OpcaoVinculo[]>([]);
  private readonly termo = signal('');
  private readonly pedidos = new Subject<Pedido | null>();

  readonly valorCampo = computed(() =>
    this.aberto() ? this.termo() : this.selecionado()?.nome ?? '',
  );

  constructor(private readonly elemento: ElementRef<HTMLElement>) {
    this.pedidos.pipe(
      switchMap((pedido) => {
        if (!pedido) return EMPTY;

        return timer(pedido.esperaMs).pipe(
          switchMap(() => this.carregar()(pedido.nome, pedido.pagina, OPCOES_POR_PAGINA)),
          catchError(() => of(null)),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe((resultado) => {
      if (!resultado) {
        this.erro.set(true);
      } else {
        const ultima = Math.max(0, resultado.totalPages - 1);
        if (this.pagina() > ultima) {
          this.buscar(ultima);
          return;
        }
        this.opcoes.set(resultado.content);
        this.totalPaginas.set(resultado.totalPages);
      }
      this.carregando.set(false);
    });
  }

  abrir(): void {
    if (this.aberto() || this.desabilitado()) return;

    this.termo.set('');
    this.aberto.set(true);
    this.buscar(0);
  }

  digitar(valor: string): void {
    if (this.desabilitado()) return;

    if (!this.preservarSelecaoNaBusca()) this.selecionado.set(null);
    this.termo.set(valor);
    this.aberto.set(true);
    this.buscar(0, 250);
  }

  mudarPagina(pagina: number, campo: HTMLInputElement): void {
    campo.focus({ preventScroll: true });
    this.buscar(pagina);
  }

  selecionar(opcao: OpcaoVinculo, campo: HTMLInputElement): void {
    this.selecionado.set(opcao);
    campo.focus({ preventScroll: true });
    this.fechar();
  }

  aoSair(evento: FocusEvent): void {
    const proximo = evento.relatedTarget;
    if (proximo instanceof Node && this.elemento.nativeElement.contains(proximo)) return;

    this.fechar();
  }

  aoPressionarEscape(evento: Event, campo: HTMLInputElement): void {
    if (!this.aberto()) return;

    evento.preventDefault();
    evento.stopPropagation();
    campo.focus({ preventScroll: true });
    this.fechar();
  }

  private buscar(pagina: number, esperaMs = 0): void {
    this.pagina.set(pagina);
    this.carregando.set(true);
    this.erro.set(false);
    this.pedidos.next({ nome: this.termo().trim(), pagina, esperaMs });
  }

  private fechar(): void {
    if (!this.aberto()) return;

    this.aberto.set(false);
    this.pedidos.next(null);
    this.carregando.set(false);
  }
}
