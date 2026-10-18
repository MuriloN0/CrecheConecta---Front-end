import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ObservacoesApi } from './observacoes.api';
import { Observacao } from './observacoes.model';

@Component({
  selector: 'app-observacoes',
  imports: [CommonModule],
  templateUrl: './observacoes.html',
  styleUrl: './observacoes.css',
})
export class Observacoes implements OnInit {
  private readonly api = inject(ObservacoesApi);
  private readonly router = inject(Router);

  readonly alunoId = '11111111-1111-1111-1111-111111111111';

  readonly observacoes = signal<Observacao[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly observacaoParaExcluir = signal<Observacao | null>(null);

  ngOnInit(): void {
    this.carregarObservacoes();
  }

  carregarObservacoes(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.listar(this.alunoId).subscribe({
      next: (lista) => {
        this.observacoes.set(lista);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Nao foi possivel carregar as observacoes.');
        this.carregando.set(false);
      },
    });
  }

  irParaCadastro(): void {
    this.router.navigate(['/observacoes/nova']);
  }

  visualizar(observacao: Observacao): void {
    this.router.navigate(['/observacoes', observacao.id]);
  }

  pedirExclusao(observacao: Observacao): void {
    this.observacaoParaExcluir.set(observacao);
  }

  cancelarExclusao(): void {
    this.observacaoParaExcluir.set(null);
  }

  confirmarExclusao(): void {
    const observacao = this.observacaoParaExcluir();
    if (!observacao) {
      return;
    }
    this.api.excluir(this.alunoId, observacao.id).subscribe({
      next: () => {
        this.observacaoParaExcluir.set(null);
        this.carregarObservacoes();
      },
      error: () => {
        this.erro.set('Nao foi possivel excluir a observacao.');
        this.observacaoParaExcluir.set(null);
      },
    });
  }
}
