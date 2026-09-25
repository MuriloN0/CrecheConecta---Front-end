import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PortalPaisApi } from './portal-pais.api';
import { TermoStatus } from './portal-pais.model';

@Component({
  selector: 'app-portal-pais',
  imports: [CommonModule],
  templateUrl: './portal-pais.html',
  styleUrl: './portal-pais.scss',
})
export class PortalPais implements OnInit {
  private readonly api = inject(PortalPaisApi);
  private readonly router = inject(Router);

  readonly termo = signal<TermoStatus | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly aceito = signal(false);

  ngOnInit(): void {
    this.carregarStatus();
  }

  carregarStatus(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.statusTermo().subscribe({
      next: (status) => {
       
        if (!status.precisaAceitar) {
          this.router.navigate(['/saude']);
          return;
        }
        this.termo.set(status);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Nao foi possivel carregar o termo.');
        this.carregando.set(false);
      },
    });
  }

  alternarAceite(evento: Event): void {
    const alvo = evento.target as HTMLInputElement;
    this.aceito.set(alvo.checked);
  }

  confirmar(): void {
    if (!this.aceito()) {
      return;
    }
    this.carregando.set(true);
    this.api.aceitarTermo().subscribe({
      next: () => {
        this.carregando.set(false);
        this.router.navigate(['/saude']);
      },
      error: () => {
        this.erro.set('Nao foi possivel registrar o aceite.');
        this.carregando.set(false);
      },
    });
  }
}
