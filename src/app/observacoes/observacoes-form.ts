import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ObservacoesApi } from './observacoes.api';
import { SalvarObservacao } from './observacoes.model';

@Component({
  selector: 'app-observacoes-form',
  imports: [],
  templateUrl: './observacoes-form.html',
  styleUrl: './observacoes.css',
})
export class ObservacoesForm {
  private readonly api = inject(ObservacoesApi);
  private readonly router = inject(Router);

  readonly alunoId = '11111111-1111-1111-1111-111111111111';

  readonly titulo = signal('');
  readonly conteudo = signal('');
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  atualizarTitulo(valor: string): void {
    this.titulo.set(valor);
  }

  atualizarConteudo(valor: string): void {
    this.conteudo.set(valor);
  }

  salvar(): void {
    if (this.titulo().trim().length === 0) {
      this.erro.set('O titulo da observacao e obrigatorio.');
      return;
    }
    this.salvando.set(true);
    this.erro.set(null);
    const dados: SalvarObservacao = {
      titulo: this.titulo(),
      conteudo: this.conteudo(),
    };
    this.api.cadastrar(this.alunoId, dados).subscribe({
      next: () => {
        this.salvando.set(false);
        this.router.navigate(['/observacoes']);
      },
      error: () => {
        this.erro.set('Nao foi possivel salvar a observacao.');
        this.salvando.set(false);
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/observacoes']);
  }
}
