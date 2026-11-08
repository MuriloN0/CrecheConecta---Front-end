import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PortalPaisApi } from './portal-pais.api';
import { TermoStatus } from './portal-pais.model';

@Component({
  selector: 'app-termos-leitura',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './termos-leitura.html',
})
export class TermosLeitura implements OnInit {
  private readonly api = inject(PortalPaisApi);

  readonly termo = signal<TermoStatus | null>(null);
  readonly ocupada = signal(false);
  readonly erro = signal('');

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly documento = 'max-h-96 overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-xl border border-stone-300 bg-stone-50 p-4 text-sm leading-relaxed focus-visible:ring-2 focus-visible:ring-creche-verde';
  readonly botao = 'inline-block cursor-pointer rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-creche-verde';

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    if (this.ocupada()) return;
    this.ocupada.set(true);
    this.erro.set('');
    try {
      this.termo.set(await firstValueFrom(this.api.statusTermo()));
    } catch {
      this.termo.set(null);
      this.erro.set('Não foi possível carregar os termos. Tente novamente.');
    } finally {
      this.ocupada.set(false);
    }
  }
}
