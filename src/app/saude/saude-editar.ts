import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SaudeApi } from './saude.api';
import { SalvarFichaSaude } from './saude.model';

@Component({
  selector: 'app-saude-editar',
  imports: [],
  templateUrl: './saude-editar.html',
  styleUrl: './saude.scss',
})
export class SaudeEditar implements OnInit {
  private readonly api = inject(SaudeApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly alunoId = '11111111-1111-1111-1111-111111111111';
  private fichaId = '';

  // ids dos anexos existentes que devem ser mantidos
  private anexosMantidos: string[] = [];

  readonly nome = signal('');
  readonly observacoes = signal('');
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.erro.set('Ficha não encontrada.');
      return;
    }
    this.fichaId = id;
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.api.visualizar(this.alunoId, this.fichaId).subscribe({
      next: (f) => {
        this.nome.set(f.nome);
        this.observacoes.set(f.observacoes ?? '');
        this.anexosMantidos = f.anexos.map((a) => a.id);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar a ficha.');
        this.carregando.set(false);
      },
    });
  }

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
      anexosMantidos: this.anexosMantidos,
    };

    this.api.editar(this.alunoId, this.fichaId, dados, []).subscribe({
      next: () => {
        this.salvando.set(false);
        this.router.navigate(['/saude', this.fichaId]); // volta pro detalhe
      },
      error: () => {
        this.erro.set('Não foi possível salvar as alterações.');
        this.salvando.set(false);
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/saude', this.fichaId]);
  }
}