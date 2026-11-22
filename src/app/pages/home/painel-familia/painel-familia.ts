import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ROTULOS_DIARIO } from '../../../diario/diario.model';
import { ObservacoesApi } from '../../../observacoes/observacoes.api';
import { Observacao } from '../../../observacoes/observacoes.model';
import {
  DiarioFilho,
  Filho,
  FrequenciaFilho,
  MalaFilho,
  PainelFamiliaService,
} from './painel-familia.service';

@Component({
  selector: 'app-painel-familia',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './painel-familia.html',
})
export class PainelFamilia {
  private static readonly OBSERVACOES_NO_PAINEL = 3;

  private readonly servico = inject(PainelFamiliaService);
  private readonly observacoesApi = inject(ObservacoesApi);
  private readonly destroy = inject(DestroyRef);
  private dataSolicitada?: string;

  readonly limite = output<unknown>();
  readonly concluido = output<void>();

  readonly responsavel = inject(AuthService).usuario;
  readonly filhos = signal<Filho[]>([]);
  readonly alunoId = signal('');
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly diario = signal<DiarioFilho | null>(null);
  readonly frequencia = signal<FrequenciaFilho | null>(null);
  readonly malas = signal<MalaFilho[]>([]);
  readonly erroDiario = signal(false);
  readonly dataDiario = signal('');
  readonly carregandoDiario = signal(false);
  readonly erroFrequencia = signal(false);
  readonly erroMalas = signal(false);

  readonly hoje = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  readonly observacoes = signal<Observacao[]>([]);
  readonly totalObservacoes = signal(0);
  readonly erroObservacoes = signal(false);

  readonly filhoSelecionado = computed(
    () => this.filhos().find((filho) => filho.id === this.alunoId()),
  );

  readonly barrasFrequencia = computed(() => {
    const frequencia = this.frequencia();
    if (!frequencia) return [];

    const total = frequencia.presencas + frequencia.faltas;

    return [
      {
        titulo: 'Presenças',
        valor: frequencia.presencas,
        cor: 'bg-creche-verde',
      },
      {
        titulo: 'Faltas',
        valor: frequencia.faltas,
        cor: 'bg-amber-500',
      },
    ].map((item) => ({
      ...item,
      percentual: total > 0 ? (item.valor / total) * 100 : 0,
    }));
  });

  readonly rotulos = ROTULOS_DIARIO;

  async atualizar(): Promise<void> {
    if (this.carregando() || this.carregandoDiario()) return;

    this.carregando.set(true);
    this.erro.set('');

    try {
      const filhos = await firstValueFrom(this.servico.listarFilhos());
      this.filhos.set(filhos);

      const anterior = filhos.find((filho) => filho.id === this.alunoId());
      const filho = anterior ?? filhos[0];
      const data = anterior ? this.dataSolicitada : undefined;

      if (!anterior) this.limparDetalhes();

      this.alunoId.set(filho?.id ?? '');

      if (filho) {
        await this.carregarDetalhes(filho.id, data);
      }
    } catch (erro: unknown) {
      if (!this.notificarLimite(erro)) {
        this.filhos.set([]);
        this.alunoId.set('');
        this.limparDetalhes();
      }

      this.erro.set(
        'Não foi possível carregar as crianças vinculadas. Tente novamente.',
      );
    } finally {
      this.carregando.set(false);
      if (!this.destroy.destroyed) this.concluido.emit();
    }
  }

  async selecionar(alunoId: string): Promise<void> {
    if (
      this.carregando() ||
      !this.filhos().some((filho) => filho.id === alunoId)
    ) {
      return;
    }

    this.carregando.set(true);
    this.alunoId.set(alunoId);
    this.limparDetalhes();

    try {
      await this.carregarDetalhes(alunoId);
    } finally {
      this.carregando.set(false);
      if (!this.destroy.destroyed) this.concluido.emit();
    }
  }

  async buscarDiario(data: string | null): Promise<void> {
    const alunoId = this.alunoId();

    if (
      !alunoId ||
      this.carregandoDiario() ||
      this.carregando()
    ) {
      return;
    }

    if (
      data !== null &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(data) || data > this.hoje)
    ) {
      return;
    }

    this.carregandoDiario.set(true);
    this.erroDiario.set(false);
    this.dataSolicitada = data ?? undefined;

    try {
      const registro = await firstValueFrom(
        this.servico.consultarDiario(alunoId, data ?? undefined),
      );

      if (alunoId !== this.alunoId()) return;

      this.diario.set(registro);
      this.dataDiario.set(registro.data);
    } catch (erro: unknown) {
      if (alunoId !== this.alunoId()) return;
      if (this.notificarLimite(erro)) return;

      this.diario.set(null);
      if (data !== null) this.dataDiario.set(data);

      this.erroDiario.set(
        !(erro instanceof HttpErrorResponse && erro.status === 404),
      );
    } finally {
      this.carregandoDiario.set(false);
      if (!this.destroy.destroyed) this.concluido.emit();
    }
  }

  private limparDetalhes(): void {
    this.dataSolicitada = undefined;
    this.diario.set(null);
    this.dataDiario.set('');
    this.frequencia.set(null);
    this.malas.set([]);
    this.erroDiario.set(false);
    this.erroFrequencia.set(false);
    this.erroMalas.set(false);
    this.observacoes.set([]);
    this.totalObservacoes.set(0);
    this.erroObservacoes.set(false);
  }

  private async carregarDetalhes(
    alunoId: string,
    data?: string,
  ): Promise<void> {
    this.erroDiario.set(false);
    this.erroFrequencia.set(false);
    this.erroMalas.set(false);
    this.erroObservacoes.set(false);

    const [diario, frequencia, malas, observacoes] =
      await Promise.allSettled([
        firstValueFrom(this.servico.consultarDiario(alunoId, data)),
        firstValueFrom(this.servico.consultarFrequencia(alunoId)),
        firstValueFrom(this.servico.listarMalas(alunoId)),
        firstValueFrom(this.observacoesApi.listar(alunoId)),
      ]);

    for (const resultado of [diario, frequencia, malas, observacoes]) {
      if (resultado.status === 'rejected') {
        this.notificarLimite(resultado.reason);
      }
    }

    if (observacoes.status === 'fulfilled') {
      this.totalObservacoes.set(observacoes.value.length);
      this.observacoes.set(
        observacoes.value.slice(0, PainelFamilia.OBSERVACOES_NO_PAINEL),
      );
    } else {
      this.erroObservacoes.set(true);
    }

    if (diario.status === 'fulfilled') {
      this.diario.set(diario.value);
      this.dataDiario.set(diario.value.data);
    } else {
      const erro: unknown = diario.reason;

      if (!(erro instanceof HttpErrorResponse && erro.status === 429)) {
        this.diario.set(null);
      }

      this.erroDiario.set(
        !(erro instanceof HttpErrorResponse && erro.status === 404),
      );
    }

    if (frequencia.status === 'fulfilled') {
      this.frequencia.set(frequencia.value);
    } else {
      this.erroFrequencia.set(true);
    }

    if (malas.status === 'fulfilled') {
      this.malas.set(malas.value);
    } else {
      this.erroMalas.set(true);
    }
  }

  private notificarLimite(erro: unknown): boolean {
    if (!(erro instanceof HttpErrorResponse) || erro.status !== 429) {
      return false;
    }

    if (!this.destroy.destroyed) this.limite.emit(erro);
    return true;
  }
}
