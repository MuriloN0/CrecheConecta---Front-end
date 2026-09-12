import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SaudeApi } from './saude.api';
import { FichaSaude } from './saude.model';

@Component({
  selector: 'app-saude-detalhe',
  imports: [CommonModule],
  templateUrl: './saude-detalhe.html',
  styleUrl: './saude.scss',
})
export class SaudeDetalhe implements OnInit {
  private readonly api = inject(SaudeApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly alunoId = '11111111-1111-1111-1111-111111111111';

  readonly ficha = signal<FichaSaude | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    const fichaId = this.route.snapshot.paramMap.get('id');
    if (!fichaId) {
      this.erro.set('Ficha não encontrada.');
      return;
    }
    this.carregar(fichaId);
  }

  carregar(fichaId: string): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.visualizar(this.alunoId, fichaId).subscribe({
      next: (f) => {
        this.ficha.set(f);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar a ficha.');
        this.carregando.set(false);
      },
    });
  }

  editar(): void {
    const f = this.ficha();
    if (f) {
      this.router.navigate(['/saude', f.id, 'editar']);
    }
  }

  voltar(): void {
    this.router.navigate(['/saude']);
  }
}
