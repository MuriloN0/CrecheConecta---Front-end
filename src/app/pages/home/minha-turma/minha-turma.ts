import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AtividadeTurma } from '../../../atividades/model/atividades.model';
import { AtividadesService } from '../../../atividades/service/atividades.service';
import { AlunoChamada, ChamadaService } from '../../../chamada/chamada.service';

interface ResumoChamada {
  total: number;
  presentes: number;
  ausentes: number;
  pendentes: number;
}

@Component({
  selector: 'app-minha-turma',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './minha-turma.html',
})
export class MinhaTurma implements OnInit {
  private readonly atividades = inject(AtividadesService);
  private readonly chamada = inject(ChamadaService);

  private readonly calendario = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  readonly turmas = signal<AtividadeTurma[]>([]);
  readonly turmaId = signal('');
  readonly data = signal('');
  readonly resumo = signal<ResumoChamada | null>(null);
  readonly carregando = signal(false);
  readonly erro = signal('');

  readonly indicadores = computed(() => {
    const resumo = this.resumo();
    if (!resumo) return [];

    return [
      { titulo: 'Presentes', valor: resumo.presentes, cor: 'bg-creche-verde' },
      { titulo: 'Ausentes', valor: resumo.ausentes, cor: 'bg-red-600' },
      { titulo: 'Pendentes', valor: resumo.pendentes, cor: 'bg-amber-500' },
    ].map((item) => ({
      ...item,
      percentual: resumo.total > 0 ? (item.valor / resumo.total) * 100 : 0,
    }));
  });

  ngOnInit(): void {
    void this.atualizar();
  }

  atualizar(): Promise<void> {
    return this.executar(async () => {
      const turmas = await firstValueFrom(this.atividades.listarTurmas());
      this.turmas.set(turmas);

      const turmaAtual = turmas.find((turma) => turma.id === this.turmaId());
      const selecionada = turmaAtual ?? turmas[0];
      this.turmaId.set(selecionada?.id ?? '');
      this.data.set('');

      if (selecionada) {
        await this.buscarResumo(selecionada.id);
      }
    });
  }

  selecionarTurma(turmaId: string): Promise<void> {
    if (!this.turmas().some((turma) => turma.id === turmaId)) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      this.turmaId.set(turmaId);
      await this.buscarResumo(turmaId);
    });
  }

  private hoje(): string {
    return this.calendario.format(new Date());
  }

  private async buscarResumo(turmaId: string): Promise<void> {
    const data = this.hoje();
    this.data.set(data);

    const primeira = await firstValueFrom(this.chamada.consultar(turmaId, data, 0));
    const alunos = new Map<string, AlunoChamada>();

    for (const aluno of primeira.content) {
      alunos.set(aluno.alunoId, aluno);
    }

    for (let pagina = 1; pagina < primeira.totalPages; pagina++) {
      const resposta = await firstValueFrom(this.chamada.consultar(turmaId, data, pagina));

      for (const aluno of resposta.content) {
        alunos.set(aluno.alunoId, aluno);
      }
    }

    if (data !== this.hoje()) {
      this.erro.set('O dia mudou durante a consulta. Atualize o resumo.');
      return;
    }

    let presentes = 0;
    let ausentes = 0;

    for (const aluno of alunos.values()) {
      if (aluno.presente === true) presentes++;
      if (aluno.presente === false) ausentes++;
    }

    this.resumo.set({
      total: alunos.size,
      presentes,
      ausentes,
      pendentes: alunos.size - presentes - ausentes,
    });
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.carregando()) return;

    this.carregando.set(true);
    this.erro.set('');
    this.resumo.set(null);

    try {
      await acao();
    } catch (erro: unknown) {
      if (erro instanceof HttpErrorResponse && erro.status === 403) {
        this.erro.set('Confira se sua conta está vinculada à turma.');
      } else {
        this.erro.set('Não foi possível carregar a chamada da turma. Tente novamente.');
      }
    } finally {
      this.carregando.set(false);
    }
  }
}
