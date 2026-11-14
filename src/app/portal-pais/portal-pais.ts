import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { PortalPaisApi } from './portal-pais.api';
import { TermoStatus } from './portal-pais.model';

@Component({
  selector: 'app-portal-pais',
  standalone: true,
  templateUrl: './portal-pais.html',
})
export class PortalPais implements AfterViewInit {
  private readonly api = inject(PortalPaisApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  readonly termo = signal<TermoStatus | null>(null);
  readonly ocupada = signal(false);
  readonly erro = signal('');
  readonly aceito = signal(false);

  ngAfterViewInit(): void {
    this.dialogo().nativeElement.showModal();
    queueMicrotask(() => void this.carregar());
  }

  async carregar(aviso = ''): Promise<void> {
    if (this.ocupada()) return;

    this.ocupada.set(true);
    this.erro.set('');
    this.aceito.set(false);
    this.termo.set(null);

    try {
      const dados = await firstValueFrom(this.api.statusTermo());
      if (!dados.precisaAceitar) {
        await this.router.navigateByUrl('/home');
        return;
      }

      this.termo.set(dados);
      this.erro.set(aviso);
    } catch {
      this.erro.set('Não foi possível carregar os documentos. Tente novamente.');
    } finally {
      this.ocupada.set(false);
    }
  }

  alternarAceite(evento: Event): void {
    this.aceito.set((evento.target as HTMLInputElement).checked);
  }

  async confirmar(): Promise<void> {
    const dados = this.termo();
    if (!dados || !this.aceito() || this.ocupada()) return;

    this.ocupada.set(true);
    this.erro.set('');

    try {
      await firstValueFrom(this.api.aceitarTermo(dados.versao));
      await this.router.navigateByUrl('/home');
    } catch (erro: unknown) {
      if (erro instanceof HttpErrorResponse && erro.status === 409) {
        this.ocupada.set(false);
        await this.carregar('Os documentos mudaram. Leia a nova versão antes de aceitar.');
      } else {
        this.erro.set('Não foi possível registrar o aceite. Tente novamente.');
      }
    } finally {
      this.ocupada.set(false);
    }
  }

  async sair(): Promise<void> {
    if (this.ocupada()) return;

    this.ocupada.set(true);
    this.erro.set('');

    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login');
    } catch {
      this.erro.set('Não foi possível encerrar a sessão. Tente novamente.');
    } finally {
      this.ocupada.set(false);
    }
  }
}
