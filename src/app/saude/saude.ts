import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SaudeApi } from './saude.api';
import { FichaSaudeResumo } from './saude.model';

@Component({
  selector: 'app-saude',
  imports: [CommonModule],
  templateUrl: './saude.html',
  styleUrl: './saude.scss',
})
export class Saude implements OnInit {
  private readonly api = inject(SaudeApi);
  private readonly router = inject(Router);

  readonly alunoId = '11111111-1111-1111-1111-111111111111';

  readonly fichas = signal<FichaSaudeResumo[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly fichaParaExcluir = signal<FichaSaudeResumo | null>(null);

  ngOnInit(): void {
    this.carregarFichas();
  }

  carregarFichas(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.listar(this.alunoId).subscribe({
      next: (lista) => {
        this.fichas.set(lista);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Nao foi possivel carregar as fichas.');
        this.carregando.set(false);
      },
    });
  }

  irParaCadastro(): void {
    this.router.navigate(['/saude/nova']);
  }

  visualizar(ficha: FichaSaudeResumo): void {
    this.router.navigate(['/saude', ficha.id]);
  }

  pedirExclusao(ficha: FichaSaudeResumo): void {
    this.fichaParaExcluir.set(ficha);
  }

  cancelarExclusao(): void {
    this.fichaParaExcluir.set(null);
  }

  confirmarExclusao(): void {
    const ficha = this.fichaParaExcluir();
    if (!ficha) {
      return;
    }
    this.api.excluir(this.alunoId, ficha.id).subscribe({
      next: () => {
        this.fichaParaExcluir.set(null);
        this.carregarFichas();
      },
      error: () => {
        this.erro.set('Nao foi possivel excluir a ficha.');
        this.fichaParaExcluir.set(null);
      },
    });
  }
}
