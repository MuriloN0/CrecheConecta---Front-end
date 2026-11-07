import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Comunicado } from '../../comunicados/comunicados.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, ResumoDirecao } from './dashboard.service';
import { MinhaTurma } from './minha-turma/minha-turma';
import { PainelFamilia } from './painel-familia';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, MinhaTurma, PainelFamilia],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);

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
      const percentualAtivos = total > 0 ? (grupo.ativos / total) * 100 : 0;

      return { ...grupo, total, percentualAtivos };
    });
  });

  ngOnInit(): void {
    void this.atualizar();
  }

  async atualizar(): Promise<void> {
    if (this.carregando()) return;

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
      const dados = await firstValueFrom(this.dashboard.consultarResumoDirecao());
      this.resumo.set(dados);
    } catch {
      this.resumo.set(null);
      this.erroResumo.set('Não foi possível carregar os indicadores de alunos e turmas.');
    } finally {
      this.carregandoResumo.set(false);
    }
  }

  private async carregarMural(): Promise<void> {
    this.carregandoMural.set(true);
    this.erroMural.set('');

    try {
      const pagina = await firstValueFrom(this.dashboard.consultarMural());
      this.comunicados.set(pagina.content);
      this.totalComunicados.set(pagina.totalElements);
    } catch {
      this.comunicados.set([]);
      this.totalComunicados.set(null);
      this.erroMural.set('Não foi possível carregar os comunicados recentes.');
    } finally {
      this.carregandoMural.set(false);
    }
  }
}
