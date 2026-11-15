import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AtividadeTurma } from '../atividades/model/atividades.model';
import { AtividadesService } from '../atividades/service/atividades.service';
import { AlunoDiario } from '../diario/diario.model';
import { DiarioService } from '../diario/diario.service';
import { ObservacoesApi } from './observacoes.api';
import { Observacao } from './observacoes.model';

/**
 * Professor: escolhe a turma e o aluno, vê as observações registradas pelos professores
 * da turma e cadastra, edita ou exclui as suas. A família e a direção apenas leem.
 */
@Component({
  selector: 'app-observacoes-professor',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './observacoes-professor.html',
})
export class ObservacoesProfessor implements OnInit {
  private readonly api = inject(ObservacoesApi);
  private readonly atividades = inject(AtividadesService);
  private readonly diario = inject(DiarioService);

  // Mesmo "hoje" do back (fuso da creche): a lista de alunos vem da turma no dia atual.
  private readonly hoje = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  readonly turmas = signal<AtividadeTurma[]>([]);
  readonly alunos = signal<AlunoDiario[]>([]);
  readonly turmaId = signal('');
  readonly alunoId = signal('');
  readonly observacoes = signal<Observacao[]>([]);
  readonly ocupada = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly formularioAberto = signal(false);
  readonly editando = signal<Observacao | null>(null);
  readonly paraExcluir = signal<Observacao | null>(null);

  readonly alunoSelecionado = computed(
    () => this.alunos().find((aluno) => aluno.alunoId === this.alunoId()),
  );

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:bg-stone-100';
  readonly botao = 'cursor-pointer rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';
  readonly primario = 'cursor-pointer rounded-xl bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-creche-verde focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  titulo = '';
  conteudo = '';

  ngOnInit(): void {
    void this.atualizarTurmas();
  }

  atualizarTurmas(): Promise<void> {
    return this.executar(async () => {
      this.fecharPaineis();
      const turmas = await firstValueFrom(this.atividades.listarTurmas());
      this.turmas.set(turmas);
      const atual = turmas.find((turma) => turma.id === this.turmaId()) ?? turmas[0];
      this.turmaId.set(atual?.id ?? '');
      await this.carregarAlunos();
    });
  }

  selecionarTurma(turmaId: string): Promise<void> {
    if (!this.turmas().some((turma) => turma.id === turmaId)) return Promise.resolve();
    return this.executar(async () => {
      this.fecharPaineis();
      this.turmaId.set(turmaId);
      this.alunoId.set('');
      await this.carregarAlunos();
    });
  }

  selecionarAluno(alunoId: string): Promise<void> {
    if (!this.alunos().some((aluno) => aluno.alunoId === alunoId)) return Promise.resolve();
    return this.executar(async () => {
      this.fecharPaineis();
      this.alunoId.set(alunoId);
      await this.buscar();
    });
  }

  abrirFormulario(observacao: Observacao | null = null): void {
    if (this.ocupada() || !this.alunoId()) return;
    if (observacao && !observacao.editavel) return;
    this.fecharPaineis();
    this.limparMensagens();
    this.editando.set(observacao);
    this.titulo = observacao?.titulo ?? '';
    this.conteudo = observacao?.conteudo ?? '';
    this.formularioAberto.set(true);
  }

  pedirExclusao(observacao: Observacao): void {
    if (this.ocupada() || !observacao.editavel) return;
    this.fecharPaineis();
    this.limparMensagens();
    this.paraExcluir.set(observacao);
  }

  fecharPaineis(): void {
    this.formularioAberto.set(false);
    this.editando.set(null);
    this.paraExcluir.set(null);
  }

  salvar(): Promise<void> {
    if (!this.formularioAberto() || this.ocupada()) return Promise.resolve();
    return this.executar(async () => {
      const titulo = this.titulo.trim();
      const conteudo = this.conteudo.trim();
      if (!titulo || titulo.length > 120) {
        this.erro.set('Informe um título com até 120 caracteres.');
        return;
      }
      if (conteudo.length > 5000) {
        this.erro.set('O texto pode ter no máximo 5.000 caracteres.');
        return;
      }
      const alunoId = this.alunoId();
      const observacao = this.editando();
      if (observacao) {
        await firstValueFrom(
          this.api.editar(alunoId, observacao.id, { titulo, conteudo, versao: observacao.versao }),
        );
      } else {
        await firstValueFrom(this.api.cadastrar(alunoId, { titulo, conteudo }));
      }
      this.fecharPaineis();
      this.sucesso.set(observacao ? 'Observação atualizada.' : 'Observação cadastrada.');
      await this.buscar();
    });
  }

  confirmarExclusao(): Promise<void> {
    const observacao = this.paraExcluir();
    if (!observacao || this.ocupada()) return Promise.resolve();
    return this.executar(async () => {
      await firstValueFrom(this.api.excluir(this.alunoId(), observacao.id));
      this.fecharPaineis();
      this.sucesso.set('Observação excluída.');
      await this.buscar();
    });
  }

  /** Alunos matriculados hoje na turma escolhida (a mesma lista que o diário de rotina usa). */
  private async carregarAlunos(): Promise<void> {
    this.alunos.set([]);
    this.observacoes.set([]);
    const turmaId = this.turmaId();
    if (!turmaId) {
      this.alunoId.set('');
      return;
    }
    const alunos = await firstValueFrom(this.diario.consultar(turmaId, this.hoje));
    this.alunos.set(alunos);
    const atual = alunos.find((aluno) => aluno.alunoId === this.alunoId()) ?? alunos[0];
    this.alunoId.set(atual?.alunoId ?? '');
    await this.buscar();
  }

  private async buscar(): Promise<void> {
    const alunoId = this.alunoId();
    if (!alunoId) {
      this.observacoes.set([]);
      return;
    }
    this.observacoes.set(await firstValueFrom(this.api.listar(alunoId)));
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupada()) return;
    this.limparMensagens();
    this.ocupada.set(true);
    try {
      await acao();
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
      if (erro instanceof HttpErrorResponse && (erro.status === 409 || erro.status === 404)) {
        // Outra pessoa mexeu na observação (ou o aluno saiu da turma): recarrega a lista.
        this.fecharPaineis();
        try {
          await this.buscar();
        } catch {
          this.observacoes.set([]);
        }
      }
    } finally {
      this.ocupada.set(false);
    }
  }

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private mensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      switch (erro.status) {
        case 0:
          return 'Não foi possível conectar à API.';
        case 400:
          return 'Confira o título e o texto da observação.';
        case 401:
          return 'Sua sessão expirou. Entre novamente.';
        case 403:
          return 'Você só pode alterar as observações que você mesmo registrou.';
        case 404:
          return 'A observação ou o aluno não está mais disponível. A lista foi atualizada.';
        case 409:
          return 'A observação foi alterada por outra pessoa. A lista foi atualizada; revise e salve de novo.';
      }
    }
    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
