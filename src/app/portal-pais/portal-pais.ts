import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PortalPaisApi } from './portal-pais.api';
import { TermoStatus } from './portal-pais.model';

type Documento = 'termo' | 'privacidade';

@Component({
  selector: 'app-portal-pais',
  standalone: true,
  templateUrl: './portal-pais.html',
})
export class PortalPais implements OnInit {
  private readonly api = inject(PortalPaisApi);
  private readonly router = inject(Router);

  readonly termo = signal<TermoStatus | null>(null);
  readonly ocupada = signal(false);
  readonly erro = signal('');
  readonly leuTermo = signal(false);
  readonly leuPrivacidade = signal(false);
  readonly aceito = signal(false);

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly documento = 'max-h-72 overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-xl border border-stone-300 bg-stone-50 p-4 text-sm leading-relaxed focus-visible:ring-2 focus-visible:ring-creche-verde';
  readonly primario = 'cursor-pointer rounded-xl bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-creche-verde focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    if (this.ocupada()) return;
    this.ocupada.set(true);
    this.erro.set('');
    try {
      const status = await firstValueFrom(this.api.statusTermo());
      if (!status.precisaAceitar) {
        await this.irParaInicio();
        return;
      }
      this.termo.set(status);
      this.conferirSemRolagem('termo');
    } catch {
      this.erro.set('Não foi possível carregar os termos. Tente novamente.');
    } finally {
      this.ocupada.set(false);
    }
  }

  aoRolar(evento: Event, documento: Documento): void {
    const el = evento.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
      this.marcarLido(documento);
    }
  }

  alternarAceite(evento: Event): void {
    this.aceito.set((evento.target as HTMLInputElement).checked);
  }

  async confirmar(): Promise<void> {
    if (!this.aceito() || this.ocupada()) return;
    this.ocupada.set(true);
    this.erro.set('');
    try {
      await firstValueFrom(this.api.aceitarTermo());
      await this.irParaInicio();
    } catch (erro: unknown) {
      this.erro.set(
        erro instanceof HttpErrorResponse && erro.status === 0
          ? 'Não foi possível conectar à API.'
          : 'Não foi possível registrar o aceite. Tente novamente.',
      );
    } finally {
      this.ocupada.set(false);
    }
  }

  private marcarLido(documento: Documento): void {
    if (documento === 'termo') {
      this.leuTermo.set(true);
      this.conferirSemRolagem('privacidade');
    } else {
      this.leuPrivacidade.set(true);
    }
  }

  // Documento curto cabe na caixa e nunca dispara o evento de rolagem: já conta como lido.
  private conferirSemRolagem(documento: Documento): void {
    setTimeout(() => {
      const el = document.getElementById(`documento-${documento}`);
      if (el && el.scrollHeight <= el.clientHeight + 5) {
        this.marcarLido(documento);
      }
    });
  }

  private async irParaInicio(): Promise<void> {
    await this.router.navigateByUrl('/home');
  }
}
