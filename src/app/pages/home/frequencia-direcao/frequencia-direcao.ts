import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Turma, TurmasService } from '../../../turmas/turmas.service';

interface ResumoFrequencia {
  inicio: string;
  fim: string;
  turmaId: string | null;
  nomeTurma: string;
  chamadas: number;
  presencas: number;
  faltas: number;
  pendencias: number;
}

@Component({
  selector: 'app-frequencia-direcao',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule],
  templateUrl: './frequencia-direcao.html',
})
export class FrequenciaDirecao implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiTurmas = inject(TurmasService);
  private readonly destroy = inject(DestroyRef);

  readonly hoje = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  readonly resumo = signal<ResumoFrequencia | null>(null);
  readonly turmas = signal<Turma[]>([]);
  readonly turmaSelecionada = signal<Turma | null>(null);
  readonly paginaTurmas = signal(0);
  readonly totalPaginas = signal(0);
  readonly carregando = signal(false);
  readonly carregandoTurmas = signal(false);
  readonly exportando = signal(false);
  readonly erro = signal('');
  readonly erroTurmas = signal('');
  readonly erroPdf = signal('');

  readonly turmasExibidas = computed(() => {
    const turmas = this.turmas();
    const escolhida = this.turmaSelecionada();

    return escolhida && !turmas.some((turma) => turma.id === escolhida.id)
      ? [escolhida, ...turmas]
      : turmas;
  });

  readonly barras = computed(() => {
    const resumo = this.resumo();
    if (!resumo) return [];

    const total = resumo.presencas + resumo.faltas + resumo.pendencias;

    return [
      { titulo: 'Presenças', valor: resumo.presencas, cor: 'bg-creche-verde' },
      { titulo: 'Faltas', valor: resumo.faltas, cor: 'bg-amber-600' },
      { titulo: 'Marcações limpas', valor: resumo.pendencias, cor: 'bg-stone-500' },
    ].map((item) => ({
      ...item,
      percentual: total > 0 ? (100 * item.valor) / total : 0,
    }));
  });

  inicio = this.hoje.slice(0, 7) + '-01';
  fim = this.hoje;

  ngOnInit(): void {
    void this.carregarTurmas(0);
    void this.aplicar();
  }

  escolherTurma(id: string): void {
    const turma = this.turmasExibidas().find((opcao) => opcao.id === id);
    this.turmaSelecionada.set(turma ?? null);
  }

  async carregarTurmas(pagina: number): Promise<void> {
    if (pagina < 0 || this.carregandoTurmas()) return;

    this.carregandoTurmas.set(true);
    this.erroTurmas.set('');

    try {
      const dados = await firstValueFrom(
        this.apiTurmas.listar(pagina, null).pipe(takeUntilDestroyed(this.destroy)),
        { defaultValue: null },
      );
      if (!dados) return;

      this.turmas.set(dados.content);
      this.paginaTurmas.set(pagina);
      this.totalPaginas.set(dados.totalPages);
    } catch {
      this.erroTurmas.set('Não foi possível carregar as turmas.');
    } finally {
      this.carregandoTurmas.set(false);
    }
  }

  async aplicar(): Promise<void> {
    if (this.carregando() || this.exportando()) return;

    this.erro.set('');
    this.erroPdf.set('');

    if (!this.inicio || !this.fim || this.inicio > this.fim || this.fim > this.hoje) {
      this.erro.set('Informe um período válido até hoje.');
      return;
    }

    const params: Record<string, string> = {
      inicio: this.inicio,
      fim: this.fim,
    };
    const turma = this.turmaSelecionada();
    if (turma) params['turmaId'] = turma.id;

    this.resumo.set(null);
    this.carregando.set(true);

    try {
      const dados = await firstValueFrom(
        this.http.get<ResumoFrequencia>('/api/turmas/frequencia', { params })
          .pipe(takeUntilDestroyed(this.destroy)),
        { defaultValue: null },
      );
      this.resumo.set(dados);
    } catch (erro: unknown) {
      const detalhe: unknown = erro instanceof HttpErrorResponse ? erro.error?.detail : null;
      this.erro.set(
        typeof detalhe === 'string' ? detalhe : 'Não foi possível consultar a frequência.',
      );
    } finally {
      this.carregando.set(false);
    }
  }

  async baixarPdf(): Promise<void> {
    const dados = this.resumo();
    if (!dados || this.exportando() || this.carregando()) return;

    this.exportando.set(true);
    this.erroPdf.set('');

    try {
      const { jsPDF } = await import('jspdf');
      if (this.destroy.destroyed) return;

      const pdf = new jsPDF();
      const numero = new Intl.NumberFormat('pt-BR');
      const dataBr = (data: string) => data.split('-').reverse().join('/');

      pdf.setProperties({ title: 'CrecheConecta - Relatório de frequência' });
      pdf.setFontSize(17);
      pdf.text('Relatório de frequência', 15, 20);
      pdf.setFontSize(11);
      pdf.text('CrecheConecta', 15, 28);

      const turma: string[] = pdf.splitTextToSize('Turma: ' + dados.nomeTurma, 180);
      pdf.text(turma, 15, 38);

      let y = 40 + turma.length * 6;
      pdf.text('Período: ' + dataBr(dados.inicio) + ' a ' + dataBr(dados.fim), 15, y);
      y += 10;

      const linhas: [string, number][] = [
        ['Chamadas registradas', dados.chamadas],
        ['Presenças', dados.presencas],
        ['Faltas', dados.faltas],
        ['Marcações limpas', dados.pendencias],
      ];

      for (const [titulo, valor] of linhas) {
        pdf.text(titulo, 15, y);
        pdf.text(numero.format(valor), 195, y, { align: 'right' });
        y += 8;
      }

      pdf.setFontSize(10);
      pdf.text(pdf.splitTextToSize(
        'Uma chamada corresponde a uma turma em um dia com registro. ' +
        'Marcações limpas são registros cuja presença ou falta foi desmarcada.',
        180,
      ), 15, y + 4);

      pdf.save('frequencia-' + dados.inicio + '-a-' + dados.fim + '.pdf');
    } catch {
      this.erroPdf.set('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      this.exportando.set(false);
    }
  }
}
