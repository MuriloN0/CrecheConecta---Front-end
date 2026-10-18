import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ObservacoesApi } from './observacoes.api';
import { Observacao } from './observacoes.model';

@Component({
  selector: 'app-observacoes-detalhe',
  imports: [CommonModule],
  templateUrl: './observacoes-detalhe.html',
  styleUrl: './observacoes.css',
})
export class ObservacoesDetalhe implements OnInit {
  private readonly api = inject(ObservacoesApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly alunoId = '11111111-1111-1111-1111-111111111111';

  readonly observacao = signal<Observacao | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    const observacaoId = this.route.snapshot.paramMap.get('id');
    if (!observacaoId) {
      this.erro.set('Observacao nao encontrada.');
      return;
    }
    this.carregar(observacaoId);
  }

  carregar(observacaoId: string): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.visualizar(this.alunoId, observacaoId).subscribe({
      next: (o) => {
        this.observacao.set(o);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Nao foi possivel carregar a observacao.');
        this.carregando.set(false);
      },
    });
  }

  editar(): void {
    const o = this.observacao();
    if (o) {
      this.router.navigate(['/observacoes', o.id, 'editar']);
    }
  }

  voltar(): void {
    this.router.navigate(['/observacoes']);
  }
}
