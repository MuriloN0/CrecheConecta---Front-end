import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-revogar-aceite',
  standalone: true,
  template: `
    <section class="mt-5 space-y-3" aria-labelledby="titulo-revogar-aceite">
      <h4 id="titulo-revogar-aceite" class="font-semibold">Aceite dos termos</h4>

      @if (!confirmando()) {
        <button type="button" (click)="confirmando.set(true)" [disabled]="bloqueada()"
          class="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold
                 text-creche-verde hover:bg-creche-creme">
          Revogar aceite dos termos
        </button>
      } @else {
        <p class="rounded-xl bg-amber-50 p-3 text-sm">
          A revogação encerrará suas sessões de acesso. Ao entrar novamente, será necessário
          ler e aceitar os documentos vigentes para voltar a usar o portal.
          Esta ação não exclui seus dados automaticamente.
        </p>

        <div class="flex flex-wrap gap-2">
          <button type="button" (click)="cancelar()" [disabled]="ocupada() || bloqueada()"
            class="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold
                   disabled:opacity-50">
            Cancelar
          </button>

          <button type="button" (click)="confirmar()" [disabled]="ocupada() || bloqueada()"
            class="rounded-xl bg-creche-verde px-4 py-2 text-sm font-semibold
                   text-white disabled:opacity-50">
            {{ ocupada() ? 'Revogando…' : 'Confirmar revogação' }}
          </button>
        </div>
      }

      @if (erro()) {
        <p role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {{ erro() }}
        </p>
      }
    </section>
  `,
})
export class RevogarAceite {
  private readonly http = inject(HttpClient);

  readonly revogado = output<void>();
  readonly ocupacao = output<boolean>();
  readonly bloqueada = input(false);
  readonly confirmando = signal(false);
  readonly ocupada = signal(false);
  readonly erro = signal('');

  cancelar(): void {
    if (this.ocupada() || this.bloqueada()) return;
    this.confirmando.set(false);
    this.erro.set('');
  }

  async confirmar(): Promise<void> {
    if (!this.confirmando() || this.ocupada() || this.bloqueada()) return;

    this.ocupada.set(true);
    this.ocupacao.emit(true);
    this.erro.set('');

    let sucesso = false;

    try {
      await firstValueFrom(
        this.http.post<void>('/api/perfil/termos/revogar', null),
      );
      sucesso = true;
    } catch (falha: unknown) {
      const detalhe: unknown = falha instanceof HttpErrorResponse
        ? falha.error?.detail
        : null;

      this.erro.set(
        typeof detalhe === 'string' && detalhe.trim()
          ? detalhe
          : 'Não foi possível revogar o aceite. Tente novamente.',
      );
    } finally {
      this.ocupada.set(false);
      this.ocupacao.emit(false);
    }

    if (sucesso) this.revogado.emit();
  }
}
