import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Comunicado } from '../../comunicados/comunicados.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, ResumoDirecao } from './dashboard.service';
import { FrequenciaDirecao } from './frequencia-direcao/frequencia-direcao';
import { MinhaTurma } from './minha-turma/minha-turma';
import { PainelFamilia } from './painel-familia/painel-familia';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    FrequenciaDirecao,
    MinhaTurma,
    PainelFamilia,
  ],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);
  private readonly destroy = inject(DestroyRef);

  private proximaAtualizacaoEm = 0;
  private contador?: ReturnType<typeof setInterval>;

  readonly segundosAteAtualizar = signal(0);

  constructor() {
    this.destroy.onDestroy(() => clearInterval(this.contador));
  }

  readonly usuario = this.auth.usuario;
  readonly perfil = computed(() => this.usuario()?.perfil);

  readonly resumo = signal<ResumoDirecao | null>(null);
  readonly comunicados = signal<Comunicado[]>([]);
  readonly totalComunicados = signal<number | null>(null);

  readonly carregandoResumo = signal(false);
  readonly carregandoMural = signal(false);
  readonly erroResumo = signal('');
  readonly erroMural = signal('');

  readonly carregando = computed(
    () => this.carregandoResumo() || this.carregandoMural(),
  );

  readonly indicadores = computed(() => {
    const resumo = this.resumo();

    return [
      {
        titulo: 'Alunos ativos',
        valor: resumo?.alunosAtivos ?? null,
        caminho: '/alunos',
      },
      {
        titulo: 'Turmas ativas',
        valor: resumo?.turmasAtivas ?? null,
        caminho: '/turmas',
      },
      {
        titulo: 'Comunicados publicados',
        valor: this.totalComunicados(),
        caminho: '/comunicados',
      },
    ];
  });

  readonly distribuicao = computed(() => {
    const resumo = this.resumo();
    if (!resumo) return [];

    return [
      {
        titulo: 'Alunos',
        ativos: resumo.alunosAtivos,
        inativos: resumo.alunosInativos,
      },
      {
        titulo: 'Turmas',
        ativos: resumo.turmasAtivas,
        inativos: resumo.turmasInativas,
      },
    ].map((grupo) => {
      const total = grupo.ativos + grupo.inativos;
      const percentualAtivos = total > 0
        ? (grupo.ativos / total) * 100
        : 0;

      return { ...grupo, total, percentualAtivos };
    });
  });

  ngOnInit(): void {
    void this.atualizar();
  }

  async atualizar(): Promise<void> {
    if (this.carregando() || this.segundosAteAtualizar() > 0) return;

    this.iniciarEspera(10);

    const consultas = [this.carregarMural()];

    if (this.perfil() === 'DIRECAO') {
      consultas.push(this.carregarResumo());
    }

    await Promise.all(consultas);
  }

  private async carregarResumo(): Promise<void> {
    this.carregandoResumo.set(true);
    this.erroResumo.set('');

    try {
      const dados = await firstValueFrom(
        this.dashboard.consultarResumoDirecao(),
      );

      this.resumo.set(dados);
    } catch (erro: unknown) {
      const limite = this.tratarLimite(erro);

      if (!limite) {
        this.resumo.set(null);
      }

      this.erroResumo.set(
        limite ??
        'Não foi possível carregar os indicadores de alunos e turmas.',
      );
    } finally {
      this.carregandoResumo.set(false);
    }
  }

  private async carregarMural(): Promise<void> {
    this.carregandoMural.set(true);
    this.erroMural.set('');

    try {
      const pagina = await firstValueFrom(
        this.dashboard.consultarMural(),
      );

      this.comunicados.set(pagina.content);
      this.totalComunicados.set(pagina.totalElements);
    } catch (erro: unknown) {
      const limite = this.tratarLimite(erro);

      if (!limite) {
        this.comunicados.set([]);
        this.totalComunicados.set(null);
      }

      this.erroMural.set(
        limite ?? 'Não foi possível carregar os comunicados recentes.',
      );
    } finally {
      this.carregandoMural.set(false);
    }
  }

  private iniciarEspera(segundos: number): void {
    this.proximaAtualizacaoEm = Math.max(
      this.proximaAtualizacaoEm,
      Date.now() + segundos * 1000,
    );

    clearInterval(this.contador);
    this.atualizarEspera();

    this.contador = setInterval(
      () => this.atualizarEspera(),
      250,
    );
  }

  private atualizarEspera(): void {
    const segundos = Math.max(
      0,
      Math.ceil((this.proximaAtualizacaoEm - Date.now()) / 1000),
    );

    this.segundosAteAtualizar.set(segundos);

    if (segundos === 0) {
      clearInterval(this.contador);
    }
  }

  private tratarLimite(erro: unknown): string | null {
    if (!(erro instanceof HttpErrorResponse) || erro.status !== 429) {
      return null;
    }

    const informado: unknown = erro.error?.segundosRestantes;
    const cabecalho = Number(erro.headers.get('Retry-After'));

    const segundos =
      typeof informado === 'number' &&
      Number.isSafeInteger(informado) &&
      informado > 0
        ? informado
        : Number.isSafeInteger(cabecalho) && cabecalho > 0
          ? cabecalho
          : 60;

    this.iniciarEspera(segundos);

    return `Muitas atualizações. Aguarde ${segundos} segundos antes de tentar novamente.`;
  }
}
