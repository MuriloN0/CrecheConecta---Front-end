import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AtividadeTurma } from '../atividades/model/atividades.model';
import { AtividadesService } from '../atividades/service/atividades.service';
import { AlunoChamada, ChamadaService } from './chamada.service';

@Component({
  selector: 'app-chamada',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './chamada.html',
})
export class Chamada implements OnInit {
  private readonly servico = inject(ChamadaService);
  private readonly atividadesService = inject(AtividadesService);

  private readonly calendario = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  readonly turmas = signal<AtividadeTurma[]>([]);
  readonly alunos = signal<AlunoChamada[]>([]);
  readonly turmaId = signal('');
  readonly data = signal('');
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly ocupada = signal(false);
  readonly chamadaCarregada = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly botao = 'cursor-pointer rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';

  ngOnInit(): void {
    void this.atualizarTurmas();
  }

  atualizarTurmas(): Promise<void> {
    return this.executar(async () => {
      this.chamadaCarregada.set(false);
      this.alunos.set([]);

      const turmas = await firstValueFrom(this.atividadesService.listarTurmas());
      this.turmas.set(turmas);

      const atual = turmas.find((turma) => turma.id === this.turmaId());
      const selecionada = atual ?? turmas[0];
      this.turmaId.set(selecionada?.id ?? '');
      this.data.set(this.hoje());

      if (selecionada) {
        await this.buscarChamada(selecionada.id, this.data(), 0);
      }
    });
  }

  selecionarTurma(turmaId: string): Promise<void> {
    if (!this.turmas().some((turma) => turma.id === turmaId)) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      this.turmaId.set(turmaId);
      this.data.set(this.hoje());
      await this.buscarChamada(turmaId, this.data(), 0);
    });
  }

  mudarPagina(pagina: number): Promise<void> {
    if (!this.chamadaCarregada() || pagina < 0 || pagina >= this.totalPaginas()) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      if (this.data() !== this.hoje()) {
        this.chamadaCarregada.set(false);
        this.erro.set('O dia mudou. Clique em Atualizar chamada para continuar.');
        return;
      }

      await this.buscarChamada(this.turmaId(), this.data(), pagina);
    });
  }

  marcar(aluno: AlunoChamada, presente: boolean | null): Promise<void> {
  if (!this.chamadaCarregada() || aluno.presente === presente) {
    return Promise.resolve();
  }

  return this.executar(async () => {
    const turmaId = this.turmaId();
    const data = this.data();

    if (data !== this.hoje()) {
      this.chamadaCarregada.set(false);
      this.erro.set('O dia mudou. Clique em Atualizar chamada para continuar.');
      return;
    }

    const registro = await firstValueFrom(
      this.servico.registrar(turmaId, data, aluno, presente),
    );

    this.alunos.update((alunos) => alunos.map((item) =>
      item.alunoId === registro.alunoId
        ? { ...item, presente: registro.presente, versao: registro.versao }
        : item,
    ));

    this.sucesso.set(
      registro.presente === null
        ? `A chamada de ${aluno.nome} voltou para pendente.`
        : `Chamada de ${aluno.nome} atualizada.`,
    );
  });
}

  private hoje(): string {
    return this.calendario.format(new Date());
  }

  private async buscarChamada(turmaId: string, data: string, pagina: number): Promise<void> {
    this.chamadaCarregada.set(false);
    this.alunos.set([]);

    let resposta = await firstValueFrom(this.servico.consultar(turmaId, data, pagina));
    const ultimaPagina = Math.max(0, resposta.totalPages - 1);

    if (pagina > ultimaPagina) {
      pagina = ultimaPagina;
      resposta = await firstValueFrom(this.servico.consultar(turmaId, data, pagina));
    }

    this.alunos.set(resposta.content);
    this.pagina.set(pagina);
    this.totalPaginas.set(resposta.totalPages);
    this.chamadaCarregada.set(true);
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupada()) return;

    this.ocupada.set(true);
    this.erro.set('');
    this.sucesso.set('');

    try {
      await acao();
    } catch (erro: unknown) {
      if (erro instanceof HttpErrorResponse && erro.status === 409) {
        this.chamadaCarregada.set(false);
      }

      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.ocupada.set(false);
    }
  }

  private mensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      switch (erro.status) {
        case 0:
          return 'Não foi possível conectar à API.';
        case 401:
          return 'Sua sessão expirou. Entre novamente.';
        case 403:
          return 'A chamada está disponível apenas para professores vinculados à turma.';
        case 404:
          return 'O registro ou a consulta de turmas não está disponível. Atualize a chamada.';
        case 409:
          return 'A presença mudou desde a consulta. Atualize a chamada antes de marcar novamente.';
        case 400: {
          const mensagem: unknown = erro.error?.mensagem;
          if (typeof mensagem === 'string' && mensagem.trim()) return mensagem;
          return 'Confira a turma e a data da chamada.';
        }
      }
    }

    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
