import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { Aluno, AlunosApi, ResponsavelAluno } from './alunos.service';

type FiltroAluno = 'ativos' | 'inativos' | 'todos';

@Component({
  selector: 'app-alunos',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './alunos.html',
})
export class Alunos implements OnInit {
  private readonly api = inject(AlunosApi);
  private nomeAplicado = '';

  readonly alunos = signal<Aluno[]>([]);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly filtro = signal<FiltroAluno>('ativos');
  readonly carregando = signal(false);
  readonly falhaListagem = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly formularioAberto = signal(false);
  readonly consultando = signal<{ aluno: Aluno; responsaveis: ResponsavelAluno[] } | null>(null);
  readonly paraInativar = signal<Aluno | null>(null);

  readonly card = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo = 'rounded-xl border border-stone-300 bg-white px-3 py-2.5 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:opacity-50';
  readonly botao = 'rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50';
  readonly primario = 'rounded-xl bg-creche-verde px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50';

  nomeBusca = '';
  nome = '';
  email = '';

  ngOnInit(): void {
    void this.carregar(0);
  }

  ocupado(): boolean {
    return this.carregando() || this.salvando();
  }

  mudarFiltro(filtro: FiltroAluno): void {
    if (this.ocupado()) return;
    this.filtro.set(filtro);
    this.atualizarLista(0);
  }

  aplicarBusca(): void {
    if (this.ocupado()) return;
    this.nomeAplicado = this.nomeBusca.trim();
    this.atualizarLista(0);
  }

  mudarPagina(pagina: number): void {
    if (pagina < 0 || pagina >= this.totalPaginas()) return;
    this.atualizarLista(pagina);
  }

  atualizarLista(pagina = this.pagina()): void {
    if (this.ocupado()) return;
    this.fecharPaineis();
    this.sucesso.set('');
    void this.carregar(pagina);
  }

  abrirFormulario(): void {
    if (this.ocupado()) return;
    this.fecharPaineis();
    this.limparMensagens();
    this.nome = '';
    this.email = '';
    this.formularioAberto.set(true);
  }

  async consultar(aluno: Aluno): Promise<void> {
    if (this.ocupado()) return;
    this.fecharPaineis();
    this.limparMensagens();
    this.salvando.set(true);

    try {
      const detalhes = await firstValueFrom(forkJoin({
        aluno: this.api.consultar(aluno.id),
        responsaveis: this.api.listarResponsaveis(aluno.id),
      }));
      this.consultando.set(detalhes);
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.salvando.set(false);
    }
  }

  pedirInativacao(aluno: Aluno): void {
    if (this.ocupado() || !aluno.ativo) return;
    this.fecharPaineis();
    this.limparMensagens();
    this.paraInativar.set(aluno);
  }

  fecharPaineis(): void {
    this.formularioAberto.set(false);
    this.consultando.set(null);
    this.paraInativar.set(null);
  }

  async salvar(): Promise<void> {
    if (this.ocupado() || !this.formularioAberto()) return;
    this.limparMensagens();

    const nome = this.nome.trim();
    if (!nome || nome.length > 150) {
      this.erro.set('Informe o nome do responsável com até 150 caracteres.');
      return;
    }

    this.salvando.set(true);
    try {
      const convite = await firstValueFrom(this.api.convidar(nome, this.email.trim()));
      this.fecharPaineis();
      this.sucesso.set(convite.mensagem);
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.salvando.set(false);
    }
  }

  async inativar(aluno: Aluno): Promise<void> {
    if (this.ocupado() || this.paraInativar()?.id !== aluno.id) return;
    this.limparMensagens();
    this.salvando.set(true);

    try {
      await firstValueFrom(this.api.inativar(aluno));
      this.fecharPaineis();
      this.sucesso.set('Aluno inativado.');
      await this.carregar(this.pagina());
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.salvando.set(false);
    }
  }

  private async carregar(pagina: number): Promise<void> {
    this.carregando.set(true);
    this.falhaListagem.set(false);
    this.erro.set('');

    const filtro = this.filtro();
    const ativo = filtro === 'todos' ? null : filtro === 'ativos';

    try {
      let resposta = await firstValueFrom(this.api.listar(pagina, ativo, this.nomeAplicado));

      const ultimaPagina = Math.max(0, resposta.totalPages - 1);
      if (pagina > ultimaPagina) {
        pagina = ultimaPagina;
        resposta = await firstValueFrom(this.api.listar(pagina, ativo, this.nomeAplicado));
      }

      this.pagina.set(pagina);
      this.totalPaginas.set(resposta.totalPages);
      this.alunos.set(resposta.content);
    } catch (erro: unknown) {
      this.alunos.set([]);
      this.falhaListagem.set(true);
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.carregando.set(false);
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
          return typeof erro.error?.detail === 'string'
            ? erro.error.detail
            : 'Confira os dados informados.';
        case 401:
          return 'Sua sessão expirou. Entre novamente.';
        case 403:
          return 'A gestão de alunos é restrita à direção.';
        case 404:
          return 'Aluno não encontrado. Atualize a lista.';
        case 409:
          return 'O cadastro mudou. Atualize a lista e reabra o aluno.';
      }
    }

    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
