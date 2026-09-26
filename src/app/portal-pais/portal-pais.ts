import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PortalPaisApi } from './portal-pais.api';
import { TermoStatus } from './portal-pais.model';

@Component({
  selector: 'app-portal-pais',
  imports: [CommonModule],
  templateUrl: './portal-pais.html',
  styleUrl: './portal-pais.css',
})
export class PortalPais implements OnInit {
  private readonly api = inject(PortalPaisApi);
  private readonly router = inject(Router);

  readonly termo = signal<TermoStatus | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly leuTermo = signal(false);
  readonly leuPrivacidade = signal(false);

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
          this.router.navigate(['/informacoes']);
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

  aoRolar(evento: Event, qual: 'termo' | 'privacidade'): void {
    const el = evento.target as HTMLElement;
    const chegouAoFim = el.scrollTop + el.clientHeight >= el.scrollHeight - 5;
    if (chegouAoFim) {
      if (qual === 'termo') {
        this.leuTermo.set(true);
      } else {
        this.leuPrivacidade.set(true);
      }
    }
  }

  alternarAceite(evento: Event): void {
    this.aceito.set((evento.target as HTMLInputElement).checked);
  }

  confirmar(): void {
    if (!this.aceito()) {
      return;
    }
    this.carregando.set(true);
    this.api.aceitarTermo().subscribe({
      next: () => {
        this.carregando.set(false);
        this.router.navigate(['/informacoes']);
      },
      error: () => {
        this.erro.set('Nao foi possivel registrar o aceite.');
        this.carregando.set(false);
      },
    });
  }
}
