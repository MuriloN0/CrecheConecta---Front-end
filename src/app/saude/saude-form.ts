import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SaudeApi } from './saude.api';
import { SalvarFichaSaude } from './saude.model';

@Component({
  selector: 'app-saude-form',
  imports: [],
  templateUrl: './saude-form.html',
  styleUrl: './saude.scss',
})
export class SaudeForm {
  private readonly api = inject(SaudeApi);
  private readonly router = inject(Router);

  readonly alunoId = '11111111-1111-1111-1111-111111111111';

  readonly nome = signal('');
  readonly observacoes = signal('');
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  atualizarNome(valor: string): void {
    this.nome.set(valor);
  }

  atualizarObservacoes(valor: string): void {
    this.observacoes.set(valor);
  }

  salvar(): void {
    if (this.nome().trim().length === 0) {
      this.erro.set('O nome da ficha é obrigatório.');
      return;
    }
    this.salvando.set(true);
    this.erro.set(null);

    const dados: SalvarFichaSaude = {
      nome: this.nome(),
      observacoes: this.observacoes(),
    };

    this.api.cadastrar(this.alunoId, dados, []).subscribe({
      next: () => {
        this.salvando.set(false);
        this.router.navigate(['/saude']);
      },
      error: () => {
        this.erro.set('Não foi possível salvar a ficha.');
        this.salvando.set(false);
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/saude']);
  }
}
