import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PortalPaisApi } from './portal-pais.api';
import { TermoStatus } from './portal-pais.model';

@Component({
  selector: 'app-termos-leitura',
  imports: [CommonModule],
  templateUrl: './termos-leitura.html',
  styleUrl: './portal-pais.css',
})
export class TermosLeitura implements OnInit {
  private readonly api = inject(PortalPaisApi);
  private readonly router = inject(Router);

  readonly termo = signal<TermoStatus | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.carregando.set(true);
    this.api.statusTermo().subscribe({
      next: (status) => {
        this.termo.set(status);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Nao foi possivel carregar os termos.');
        this.carregando.set(false);
      },
    });
  }

  voltar(): void {
    this.router.navigate(['/informacoes']);
  }
}
