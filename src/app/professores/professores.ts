import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Pagina, Turma, TurmasService } from '../turmas/turmas.service';
import { Professor, ProfessoresService, SituacaoProfessor } from './professores.service';

function paginaVazia<T>(): Pagina<T> {
  return { content: [], totalPages: 0 };
}

@Component({
  selector: 'app-professores',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './professores.html',
})
export class Professores implements OnInit {
  private readonly servico = inject(ProfessoresService);
  private readonly turmasService = inject(TurmasService);

  readonly professores = signal(paginaVazia<Professor>());
  readonly turmas = signal(paginaVazia<Turma>());
  readonly paginaProfessores = signal(0);
  readonly paginaTurmas = signal(0);
  readonly ocupada = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly situacoes: Record<SituacaoProfessor, string> = {
    PENDENTE_APROVACAO: 'Pendente de aprovação',
    APROVADO: 'Ativo',
    REJEITADO: 'Rejeitado',
    INATIVO: 'Inativo',
  };

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo =
    'w-full rounded-xl border border-stone-300 bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:opacity-50';
  readonly botao =
    'cursor-pointer rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';
  readonly primario =
    'cursor-pointer rounded-lg bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-creche-verde focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  filtro: SituacaoProfessor | '' = '';
  formulario: 'convite' | null = null;
  nome = '';
  email = '';

  ngOnInit(): void {
    void this.executar(async () => {
      await Promise.all([this.buscarProfessores(0), this.buscarTurmas(0)]);
    });
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
    this.nome = '';
    this.email = '';
    this.formulario = 'convite';
  }

  salvar(): Promise<void> {
    return this.executar(async () => {
      const nome = this.nome.trim();

      if (!nome || nome.length > 150) {
        this.erro.set('Informe um nome com até 150 caracteres.');
        return;
      }

      const convite = await firstValueFrom(this.servico.convidar(nome, this.email.trim()));
      this.formulario = null;
      this.sucesso.set(convite.mensagem);
    });
  }

  inativar(professor: Professor): Promise<void> {
    if (!this.podeInativar(professor)) return Promise.resolve();

    if (!window.confirm(`Deseja inativar o cadastro de ${professor.nome}?`)) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      await firstValueFrom(this.servico.inativar(professor));
      this.formulario = null;
      this.sucesso.set('Professor inativado.');
      await this.buscarProfessores(this.paginaProfessores());
    });
  }

  podeInativar(professor: Professor): boolean {
    return professor.ativo && professor.situacaoCadastro === 'APROVADO';
  }

  carregarTurmas(pagina: number): Promise<void> {
    return this.executar(() => this.buscarTurmas(pagina));
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

      const mensagem: unknown = erro.error?.detail ?? erro.error?.mensagem;
      if (typeof mensagem === 'string' && mensagem.trim()) {
        return mensagem;
      }
    }

    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
