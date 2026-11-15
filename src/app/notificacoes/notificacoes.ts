import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, firstValueFrom } from 'rxjs';
import { Comunicado } from '../comunicados/comunicados.service';
import { NotificacaoComunicado, NotificacoesService } from './notificacoes.service';

@Component({
  selector: 'app-notificacoes',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './notificacoes.html',
})
export class Notificacoes implements OnInit {
  private readonly api = inject(NotificacoesService);
  private readonly destroy = inject(DestroyRef);

  readonly itens = signal<NotificacaoComunicado[]>([]);
  readonly pagina = signal(0);
  readonly temProxima = signal(false);
  readonly carregando = signal(false);
  readonly abrindo = signal(false);
  readonly erro = signal('');
  readonly aberto = signal<Comunicado | null>(null);

  ngOnInit(): void {
    void this.carregar(0);
  }

  async carregar(pagina: number): Promise<void> {
    if (this.carregando() || this.abrindo()) return;

    this.carregando.set(true);
    this.erro.set('');
    this.aberto.set(null);

    try {
      const dados = await firstValueFrom(
        this.api.listar(pagina).pipe(takeUntilDestroyed(this.destroy)),
        { defaultValue: null },
      );
      if (!dados) return;

      this.itens.set(dados.itens);
      this.temProxima.set(dados.temProxima);
      this.pagina.set(pagina);
    } catch {
      this.erro.set('Não foi possível atualizar as notificações.');
    } finally {
      this.carregando.set(false);
    }
  }

  async abrir(item: NotificacaoComunicado): Promise<void> {
    if (this.abrindo() || this.carregando()) return;
    if (this.aberto()?.id === item.comunicadoId && item.lida) {
      this.aberto.set(null);
      return;
    }

    this.abrindo.set(true);
    this.erro.set('');
    this.aberto.set(null);

    try {
      const comunicado = await firstValueFrom(
        this.api.lerComunicado(item.comunicadoId).pipe(takeUntilDestroyed(this.destroy)),
        { defaultValue: null },
      );
      if (!comunicado) return;

      this.aberto.set(comunicado);
      if (item.lida) return;

      await firstValueFrom(
        this.api.marcarLida(item.comunicadoId).pipe(takeUntilDestroyed(this.destroy)),
        { defaultValue: undefined },
      );
      if (this.destroy.destroyed) return;

      this.itens.update((lista) => lista.map((n) =>
        n.comunicadoId === item.comunicadoId ? { ...n, lida: true } : n,
      ));
      this.api.atualizarTotal().pipe(
        catchError(() => EMPTY),
        takeUntilDestroyed(this.destroy),
      ).subscribe();
    } catch {
      this.erro.set(this.aberto()
        ? 'O comunicado foi aberto, mas não foi possível marcar o aviso como lido.'
        : 'Não foi possível abrir o comunicado. Ele pode ter sido inativado.');
    } finally {
      this.abrindo.set(false);
    }
  }
}
