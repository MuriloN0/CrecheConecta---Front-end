import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AtividadeTurma } from '../atividades/model/atividades.model';
import { AtividadesService } from '../atividades/service/atividades.service';
import {
  Alimentacao,
  AlunoDiario,
  DadosDiario,
  Higiene,
  Humor,
  OPCOES_ALIMENTACAO,
  OPCOES_HIGIENE,
  OPCOES_HUMOR,
  OPCOES_SONO,
  OpcaoDiario,
  ROTULOS_DIARIO,
  Sono,
} from './diario.model';
import { DiarioService } from './diario.service';

@Component({
  selector: 'app-diario',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './diario.html',
})
export class Diario implements OnInit {
  private readonly servico = inject(DiarioService);
  private readonly atividadesService = inject(AtividadesService);

  readonly hoje = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  readonly turmas = signal<AtividadeTurma[]>([]);
  readonly alunos = signal<AlunoDiario[]>([]);
  readonly turmaId = signal('');
  readonly data = signal('');
  readonly ocupada = signal(false);
  readonly carregada = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly alunoAberto = signal<AlunoDiario | null>(null);
  readonly paraExcluir = signal<AlunoDiario | null>(null);

  readonly rotulos = ROTULOS_DIARIO;
  readonly opcoesAlimentacao: OpcaoDiario[] = OPCOES_ALIMENTACAO;
  readonly opcoesSono: OpcaoDiario[] = OPCOES_SONO;
  readonly opcoesHumor: OpcaoDiario[] = OPCOES_HUMOR;
  readonly opcoesHigiene: OpcaoDiario[] = OPCOES_HIGIENE;

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:bg-stone-100';
  readonly botao = 'cursor-pointer rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';
  readonly primario = 'cursor-pointer rounded-xl bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-creche-verde focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  // Campos do formulário aberto (um aluno por vez).
  alimentacao = '';
  sono = '';
  humor = '';
  higiene = '';
  evacuacao = false;
  observacao = '';

  ngOnInit(): void {
    void this.atualizarTurmas();
  }

  atualizarTurmas(): Promise<void> {
    return this.executar(async () => {
      this.fecharPaineis();
      this.carregada.set(false);
      this.alunos.set([]);
      const turmas = await firstValueFrom(this.atividadesService.listarTurmas());
      this.turmas.set(turmas);
      const atual = turmas.find((turma) => turma.id === this.turmaId());
      const selecionada = atual ?? turmas[0];
      this.turmaId.set(selecionada?.id ?? '');
      if (!this.data()) this.data.set(this.hoje);
      if (selecionada) {
        await this.buscar(selecionada.id, this.data());
      }
    });
  }

  selecionarTurma(turmaId: string): Promise<void> {
    if (!this.turmas().some((turma) => turma.id === turmaId)) {
      return Promise.resolve();
    }
    return this.executar(async () => {
      this.fecharPaineis();
      this.turmaId.set(turmaId);
      await this.buscar(turmaId, this.data());
    });
  }

  mudarData(valor: string): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || valor > this.hoje) {
      this.erro.set('Informe uma data válida até hoje.');
      this.sucesso.set('');
      return Promise.resolve();
    }
    return this.executar(async () => {
      this.fecharPaineis();
      this.data.set(valor);
      await this.buscar(this.turmaId(), valor);
    });
  }

  abrirFormulario(aluno: AlunoDiario): void {
    if (this.ocupada() || !this.carregada()) return;
    if (aluno.diario && !aluno.diario.editavel) return;
    this.fecharPaineis();
    this.erro.set('');
    this.sucesso.set('');
    const diario = aluno.diario;
    this.alimentacao = diario?.alimentacao ?? '';
    this.sono = diario?.sono ?? '';
    this.humor = diario?.humor ?? '';
    this.higiene = diario?.higiene ?? '';
    this.evacuacao = diario?.evacuacao ?? false;
    this.observacao = diario?.observacaoProfessor ?? '';
    this.alunoAberto.set(aluno);
  }

  pedirExclusao(aluno: AlunoDiario): void {
    if (this.ocupada() || !aluno.diario?.editavel) return;
    this.fecharPaineis();
    this.erro.set('');
    this.sucesso.set('');
    this.paraExcluir.set(aluno);
  }

  fecharPaineis(): void {
    this.alunoAberto.set(null);
    this.paraExcluir.set(null);
  }

  salvar(): Promise<void> {
    const aluno = this.alunoAberto();
    if (!aluno || this.ocupada() || !this.carregada()) return Promise.resolve();
    return this.executar(async () => {
      if (
        !this.alimentacao
        || !this.sono
        || !this.humor
        || !this.higiene
      ) {
        this.erro.set('Escolha alimentação, sono, humor e higiene.');
        return;
      }
      const observacao = this.observacao.trim();
      if (observacao.length > 1000) {
        this.erro.set('A observação pode ter no máximo 1.000 caracteres.');
        return;
      }
      if (this.data() > this.hoje) {
        this.erro.set('A data do diário não pode ser futura.');
        return;
      }
      const dados: DadosDiario = {
        alimentacao: this.alimentacao as Alimentacao,
        sono: this.sono as Sono,
        evacuacao: this.evacuacao,
        humor: this.humor as Humor,
        higiene: this.higiene as Higiene,
        ...(observacao ? { observacaoProfessor: observacao } : {}),
        ...(aluno.diario ? { versao: aluno.diario.versao } : {}),
      };
      const registro = await firstValueFrom(
        this.servico.registrar(this.turmaId(), this.data(), aluno.alunoId, dados),
      );
      this.alunos.update((alunos) => alunos.map((item) =>
        item.alunoId === aluno.alunoId ? { ...item, diario: registro } : item,
      ));
      this.fecharPaineis();
      this.sucesso.set(
        aluno.diario
          ? `Diário de ${aluno.nome} atualizado.`
          : `Diário de ${aluno.nome} registrado.`,
      );
    });
  }

  confirmarExclusao(): Promise<void> {
    const aluno = this.paraExcluir();
    if (!aluno || this.ocupada()) return Promise.resolve();
    return this.executar(async () => {
      await firstValueFrom(
        this.servico.excluir(this.turmaId(), this.data(), aluno.alunoId),
      );
      this.alunos.update((alunos) => alunos.map((item) =>
        item.alunoId === aluno.alunoId ? { ...item, diario: null } : item,
      ));
      this.fecharPaineis();
      this.sucesso.set(`Diário de ${aluno.nome} excluído.`);
    });
  }

  private async buscar(turmaId: string, data: string): Promise<void> {
    this.carregada.set(false);
    this.alunos.set([]);
    this.alunos.set(await firstValueFrom(this.servico.consultar(turmaId, data)));
    this.carregada.set(true);
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupada()) return;
    this.ocupada.set(true);
    this.erro.set('');
    this.sucesso.set('');
    try {
      await acao();
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
      if (erro instanceof HttpErrorResponse && (erro.status === 409 || erro.status === 404)) {
        // Outra pessoa mexeu no diário: recarrega a lista para pegar a versão atual.
        this.fecharPaineis();
        try {
          await this.buscar(this.turmaId(), this.data());
        } catch {
          this.carregada.set(false);
        }
      }
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
          return 'Você só pode registrar o diário das suas turmas, e só altera o que você mesmo registrou.';
        case 404:
          return 'O diário ou o aluno não está mais disponível. A lista foi atualizada.';
        case 409:
          return 'O diário foi alterado por outra pessoa. A lista foi atualizada; revise e salve de novo.';
        case 400: {
          const mensagem: unknown = erro.error?.mensagem;
          if (typeof mensagem === 'string' && mensagem.trim()) return mensagem;
          return 'Confira os campos do diário.';
        }
      }
    }
    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
