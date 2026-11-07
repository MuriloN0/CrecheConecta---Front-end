import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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
  imports: [DatePipe, FormsModule],
  templateUrl: './painel-familia.html',
})
export class PainelFamilia implements OnInit {
  private readonly servico = inject(PainelFamiliaService);

  readonly filhos = signal<Filho[]>([]);
  readonly alunoId = signal('');
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly diario = signal<DiarioFilho | null>(null);
  readonly frequencia = signal<FrequenciaFilho | null>(null);
  readonly malas = signal<MalaFilho[]>([]);
  readonly erroDiario = signal(false);
  readonly erroFrequencia = signal(false);
  readonly erroMalas = signal(false);

  readonly filhoSelecionado = computed(
    () => this.filhos().find((filho) => filho.id === this.alunoId()),
  );

  readonly barrasFrequencia = computed(() => {
    const frequencia = this.frequencia();
    if (!frequencia) return [];

    const total = frequencia.presencas + frequencia.faltas;

    return [
      { titulo: 'Presenças', valor: frequencia.presencas, cor: 'bg-creche-verde' },
      { titulo: 'Faltas', valor: frequencia.faltas, cor: 'bg-amber-500' },
    ].map((item) => ({
      ...item,
      percentual: total > 0 ? (item.valor / total) * 100 : 0,
    }));
  });

  readonly rotulos: Record<string, string> = {
    COMEU_TUDO: 'Comeu tudo',
    COMEU_BEM: 'Comeu bem',
    COMEU_POUCO: 'Comeu pouco',
    NAO_COMEU: 'Não comeu',
    DORMIU_BEM: 'Dormiu bem',
    DORMIU_POUCO: 'Dormiu pouco',
    NAO_DORMIU: 'Não dormiu',
    FELIZ: 'Feliz',
    CALMO: 'Calmo',
    AGITADO: 'Agitado',
    CHOROSO: 'Choroso',
  };

  readonly linkAnonimizacao =
    'mailto:crecheconecta@gmail.com'
    + '?subject=' + encodeURIComponent('Solicitação de anonimização de dados')
    + '&body=' + encodeURIComponent(
      'Olá, equipe CrecheConecta.\n\n'
      + 'Gostaria de solicitar a avaliação da anonimização de dados pessoais. '
      + 'Por favor, orientem-me sobre como identificar a conta e dar continuidade à solicitação.\n',
    );

  ngOnInit(): void {
    void this.atualizar();
  }

  async atualizar(): Promise<void> {
    if (this.carregando()) return;

    this.carregando.set(true);
    this.erro.set('');
    this.limparDetalhes();

    try {
      const filhos = await firstValueFrom(this.servico.listarFilhos());
      this.filhos.set(filhos);

      const anterior = filhos.find((filho) => filho.id === this.alunoId());
      const filho = anterior ?? filhos[0];
      this.alunoId.set(filho?.id ?? '');

      if (filho) {
        await this.carregarDetalhes(filho.id);
      }
    } catch {
      this.filhos.set([]);
      this.alunoId.set('');
      this.erro.set('Não foi possível carregar as crianças vinculadas. Tente novamente.');
    } finally {
      this.carregando.set(false);
    }
  }

  async selecionar(alunoId: string): Promise<void> {
    if (this.carregando() || !this.filhos().some((filho) => filho.id === alunoId)) {
      return;
    }

    this.carregando.set(true);
    this.alunoId.set(alunoId);
    this.limparDetalhes();

    try {
      await this.carregarDetalhes(alunoId);
    } finally {
      this.carregando.set(false);
    }
  }

  private limparDetalhes(): void {
    this.diario.set(null);
    this.frequencia.set(null);
    this.malas.set([]);
    this.erroDiario.set(false);
    this.erroFrequencia.set(false);
    this.erroMalas.set(false);
  }

  private async carregarDetalhes(alunoId: string): Promise<void> {
    const [diario, frequencia, malas] = await Promise.allSettled([
      firstValueFrom(this.servico.consultarDiario(alunoId)),
      firstValueFrom(this.servico.consultarFrequencia(alunoId)),
      firstValueFrom(this.servico.listarMalas(alunoId)),
    ]);

    if (diario.status === 'fulfilled') {
      this.diario.set(diario.value);
    } else {
      const erro: unknown = diario.reason;
      this.erroDiario.set(!(erro instanceof HttpErrorResponse && erro.status === 404));
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
}
