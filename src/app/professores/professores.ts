import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Pagina, Turma, TurmasService } from '../turmas/turmas.service';
import {
  Professor,
  ProfessoresService,
  SituacaoProfessor,
  VinculoProfessor,
} from './professores.service';

type VinculoExibido = VinculoProfessor & { nomeProfessor: string };
type AcaoProfessor = 'aprovar' | 'rejeitar' | 'inativar';

function paginaVazia<T>(): Pagina<T> {
  return { content: [], totalPages: 0 };
}

@Component({
  selector: 'app-professores',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './professores.html',
})
export class Professores implements OnInit {
  private readonly servico = inject(ProfessoresService);
  private readonly turmasService = inject(TurmasService);

  readonly professores = signal(paginaVazia<Professor>());
  readonly turmas = signal(paginaVazia<Turma>());
  readonly vinculos = signal(paginaVazia<VinculoExibido>());
  readonly turmaSelecionada = signal<Turma | null>(null);
  readonly professorSelecionado = signal<Professor | null>(null);

  readonly paginaProfessores = signal(0);
  readonly paginaTurmas = signal(0);
  readonly paginaVinculos = signal(0);
  readonly ocupada = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly situacoes: Record<SituacaoProfessor, string> = {
    PENDENTE_APROVACAO: 'Pendente de aprovação',
    APROVADO: 'Aprovado',
    REJEITADO: 'Rejeitado',
    INATIVO: 'Inativo',
  };

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo = 'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:opacity-50';
  readonly botao = 'cursor-pointer rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';
  readonly primario = 'cursor-pointer rounded-lg bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-creche-verde focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  filtro: SituacaoProfessor | '' = '';
  incluirEncerrados = false;
  formulario: 'convite' | 'edicao' | null = null;
  editando: Professor | null = null;
  nome = '';
  email = '';
  telefone = '';

  ngOnInit(): void {
    void this.carregarProfessores(0);
  }

  carregarProfessores(pagina: number): Promise<void> {
    return this.executar(() => this.buscarProfessores(pagina));
  }

  mudarFiltro(filtro: SituacaoProfessor | ''): void {
    if (this.ocupada()) return;

    this.filtro = filtro;
    this.professores.set(paginaVazia());
    this.paginaProfessores.set(0);
    void this.carregarProfessores(0);
  }

  abrirConvite(): void {
    this.limparMensagens();
    this.editando = null;
    this.nome = '';
    this.email = '';
    this.formulario = 'convite';
  }

  abrirEdicao(professor: Professor): void {
    this.limparMensagens();
    this.editando = professor;
    this.nome = professor.nome;
    this.telefone = professor.telefone ?? '';
    this.formulario = 'edicao';
  }

  salvar(): Promise<void> {
    return this.executar(async () => {
      const nome = this.nome.trim();

      if (!nome || nome.length > 150) {
        this.erro.set('Informe um nome com até 150 caracteres.');
        return;
      }

      if (this.formulario === 'convite') {
        const convite = await firstValueFrom(
          this.servico.convidar(nome, this.email.trim()),
        );
        this.formulario = null;
        this.sucesso.set(convite.mensagem || `Convite enviado para ${convite.email}.`);
        return;
      }

      const professor = this.editando;
      if (this.formulario !== 'edicao' || !professor) return;

      const telefone = this.telefone.trim();
      if (!/^[1-9][0-9]{9,10}$/.test(telefone)) {
        this.erro.set('Informe o telefone com DDD e somente números.');
        return;
      }

      const atualizado = await firstValueFrom(
        this.servico.atualizar(professor, nome, telefone),
      );

      this.atualizarSelecionado(atualizado);
      this.formulario = null;
      this.sucesso.set('Professor atualizado.');
      await this.buscarProfessores(this.paginaProfessores());
    });
  }

  decidir(professor: Professor, acao: AcaoProfessor): Promise<void> {
    const mensagens: Record<AcaoProfessor, string> = {
      aprovar: 'Cadastro aprovado.',
      rejeitar: 'Cadastro rejeitado.',
      inativar: 'Professor inativado.',
    };

    if (!window.confirm(`Deseja ${acao} o cadastro de ${professor.nome}?`)) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      const atualizado = await firstValueFrom(this.servico.decidir(professor, acao));
      this.atualizarSelecionado(atualizado);
      this.formulario = null;
      this.sucesso.set(mensagens[acao]);
      await this.buscarProfessores(this.paginaProfessores());

      const turma = this.turmaSelecionada();
      if (turma) await this.buscarVinculos(turma.id, this.paginaVinculos());
    });
  }

  podeVincular(professor: Professor): boolean {
    return professor.ativo && professor.situacaoCadastro === 'APROVADO';
  }

  selecionarProfessor(professor: Professor): Promise<void> {
    if (!this.podeVincular(professor)) return Promise.resolve();

    return this.executar(async () => {
      this.professorSelecionado.set(professor);
      await this.buscarTurmas(0);
    });
  }

  carregarTurmas(pagina: number): Promise<void> {
    return this.executar(() => this.buscarTurmas(pagina));
  }

  selecionarTurma(turma: Turma): Promise<void> {
    return this.executar(async () => {
      this.turmaSelecionada.set(turma);
      this.incluirEncerrados = false;
      this.vinculos.set(paginaVazia());
      this.paginaVinculos.set(0);
      await this.buscarVinculos(turma.id, 0);
    });
  }

  carregarVinculos(pagina: number): Promise<void> {
    const turma = this.turmaSelecionada();
    if (!turma) return Promise.resolve();

    return this.executar(() => this.buscarVinculos(turma.id, pagina));
  }

  mudarHistorico(incluir: boolean): void {
    this.incluirEncerrados = incluir;
    this.vinculos.set(paginaVazia());
    this.paginaVinculos.set(0);
    void this.carregarVinculos(0);
  }

  vincular(): Promise<void> {
    const turma = this.turmaSelecionada();
    const professor = this.professorSelecionado();

    if (!turma?.ativo || !professor || !this.podeVincular(professor)) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      await firstValueFrom(this.servico.vincular(turma.id, professor.id));
      this.sucesso.set('Professor vinculado à turma.');
      await this.buscarVinculos(turma.id, 0);
    });
  }

  encerrar(vinculo: VinculoExibido): Promise<void> {
    if (vinculo.encerradoEm || !window.confirm(
      `Encerrar o vínculo de ${vinculo.nomeProfessor} com esta turma?`,
    )) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      await firstValueFrom(this.servico.encerrar(vinculo));
      this.sucesso.set('Vínculo encerrado.');
      await this.buscarVinculos(vinculo.turmaId, this.paginaVinculos());
    });
  }

  private atualizarSelecionado(professor: Professor): void {
    if (this.professorSelecionado()?.id !== professor.id) return;

    this.professorSelecionado.set(this.podeVincular(professor) ? professor : null);
  }

  private async buscarProfessores(pagina: number): Promise<void> {
    let resposta = await firstValueFrom(this.servico.listar(pagina, this.filtro));
    const ultimaPagina = Math.max(0, resposta.totalPages - 1);

    if (pagina > ultimaPagina) {
      pagina = ultimaPagina;
      resposta = await firstValueFrom(this.servico.listar(pagina, this.filtro));
    }

    this.professores.set(resposta);
    this.paginaProfessores.set(pagina);
  }

  private async buscarTurmas(pagina: number): Promise<void> {
    const resposta = await firstValueFrom(this.turmasService.listar(pagina, true));
    this.turmas.set(resposta);
    this.paginaTurmas.set(pagina);
  }

  private async buscarVinculos(turmaId: string, pagina: number): Promise<void> {
    const buscar = (numero: number) => firstValueFrom(
      this.servico.listarVinculos(turmaId, numero, this.incluirEncerrados),
    );

    let resposta = await buscar(pagina);
    const ultimaPagina = Math.max(0, resposta.totalPages - 1);

    if (pagina > ultimaPagina) {
      pagina = ultimaPagina;
      resposta = await buscar(pagina);
    }

    const nomes = new Map(
      this.professores().content.map((professor) => [professor.id, professor.nome]),
    );

    const content = await Promise.all(
      resposta.content.map(async (vinculo): Promise<VinculoExibido> => {
        let nomeProfessor = nomes.get(vinculo.professorId);

        if (!nomeProfessor) {
          try {
            const professor = await firstValueFrom(
              this.servico.consultar(vinculo.professorId),
            );
            nomeProfessor = professor.nome;
          } catch {
            nomeProfessor = `Professor ${vinculo.professorId}`;
          }
        }

        return { ...vinculo, nomeProfessor };
      }),
    );

    this.vinculos.set({ ...resposta, content });
    this.paginaVinculos.set(pagina);
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupada()) return;

    this.limparMensagens();
    this.ocupada.set(true);

    try {
      await acao();
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
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
      if (erro.status === 0) return 'Não foi possível conectar à API.';
      if (erro.status === 401) return 'Sua sessão expirou. Entre novamente.';
      if (erro.status === 403) return 'A gestão de professores é restrita à direção.';
      if (erro.status === 409) return 'Atualize a lista antes de tentar novamente.';

      const mensagem: unknown = erro.error?.mensagem;
      if (typeof mensagem === 'string' && mensagem.trim()) {
        return mensagem;
      }
    }

    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
