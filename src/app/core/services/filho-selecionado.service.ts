import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Filho, PainelFamiliaService } from '../../pages/home/painel-familia.service';

/**
 * Criança selecionada pelo responsável. Compartilhada pelas telas da família
 * (informações relevantes, observações), para não repetir o seletor nem fixar ID no código.
 */
@Injectable({ providedIn: 'root' })
export class FilhoSelecionadoService {
  private readonly api = inject(PainelFamiliaService);

  readonly filhos = signal<Filho[]>([]);
  readonly alunoId = signal('');
  readonly filho = computed(
    () => this.filhos().find((filho) => filho.id === this.alunoId()) ?? null,
  );

  // Busca as crianças vinculadas e mantém a selecionada, se ela ainda existir.
  async carregar(): Promise<void> {
    const filhos = await firstValueFrom(this.api.listarFilhos());
    this.filhos.set(filhos);
    const atual = filhos.find((filho) => filho.id === this.alunoId());
    this.alunoId.set((atual ?? filhos[0])?.id ?? '');
  }

  selecionar(alunoId: string): void {
    if (this.filhos().some((filho) => filho.id === alunoId)) {
      this.alunoId.set(alunoId);
    }
  }
}
