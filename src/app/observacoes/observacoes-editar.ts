import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ObservacoesApi } from './observacoes.api';
import { SalvarObservacao } from './observacoes.model';

@Component({
  selector: 'app-observacoes-editar',
  imports: [],
  templateUrl: './observacoes-editar.html',
  styleUrl: './observacoes.css',
})
export class ObservacoesEditar implements OnInit {
  private readonly api = inject(ObservacoesApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly alunoId = '11111111-1111-1111-1111-111111111111';
  private observacaoId = '';
  private versao = 0;

  readonly titulo = signal('');
  readonly conteudo = signal('');
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.erro.set('Observacao nao encontrada.');
      return;
    }
    this.observacaoId = id;
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.api.visualizar(this.alunoId, this.observacaoId).subscribe({
      next: (o) => {
        this.titulo.set(o.titulo);
        this.conteudo.set(o.conteudo ?? '');
        this.versao = o.versao;
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Nao foi possivel carregar a observacao.');
        this.carregando.set(false);
      },
    });
  }

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
      versao: this.versao,
    };
    this.api.editar(this.alunoId, this.observacaoId, dados).subscribe({
      next: () => {
        this.salvando.set(false);
        this.router.navigate(['/observacoes', this.observacaoId]);
      },
      error: () => {
        this.erro.set('Nao foi possivel salvar as alteracoes.');
        this.salvando.set(false);
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/observacoes', this.observacaoId]);
  }
}
