import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Aluno, AlunosApi } from './alunos.api';

type FiltroAluno = 'ativos' | 'inativos' | 'todos';

@Component({
  selector: 'app-alunos',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './alunos.html',
})
export class Alunos implements OnInit {
  private readonly api = inject(AlunosApi);

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
  readonly editando = signal<Aluno | null>(null);
  readonly paraInativar = signal<Aluno | null>(null);

  readonly hoje = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  nome = '';
  dataNascimento = '';

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

  abrirFormulario(aluno: Aluno | null = null): void {
    if (this.ocupado()) return;

    this.fecharPaineis();
    this.limparMensagens();
    this.editando.set(aluno);
    this.nome = aluno?.nome ?? '';
    this.dataNascimento = aluno?.dataNascimento ?? '';
    this.formularioAberto.set(true);
  }

  pedirInativacao(aluno: Aluno): void {
    if (this.ocupado() || !aluno.ativo) return;

    this.fecharPaineis();
    this.limparMensagens();
    this.paraInativar.set(aluno);
  }

  fecharPaineis(): void {
    this.formularioAberto.set(false);
    this.editando.set(null);
    this.paraInativar.set(null);
  }

  async salvar(): Promise<void> {
    if (this.ocupado() || !this.formularioAberto()) return;

    this.limparMensagens();

    const nome = this.nome.trim();
    if (!nome || nome.length > 150) {
      this.erro.set('Informe um nome com até 150 caracteres.');
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(this.dataNascimento) ||
      this.dataNascimento > this.hoje
    ) {
      this.erro.set('Informe uma data de nascimento válida até hoje.');
      return;
    }

    const aluno = this.editando();
    const dados = { nome, dataNascimento: this.dataNascimento };

    this.salvando.set(true);

    try {
      if (aluno) {
        await firstValueFrom(this.api.atualizar(aluno, dados));
      } else {
        await firstValueFrom(this.api.cadastrar(dados));
        this.filtro.set('ativos');
      }

      this.fecharPaineis();
      this.sucesso.set(aluno ? 'Aluno atualizado.' : 'Aluno cadastrado.');
      await this.carregar(aluno ? this.pagina() : 0);
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
      let resposta = await firstValueFrom(this.api.listar(pagina, ativo));

      const ultimaPagina = Math.max(0, resposta.totalPages - 1);
      if (pagina > ultimaPagina) {
        pagina = ultimaPagina;
        resposta = await firstValueFrom(this.api.listar(pagina, ativo));
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
          return 'Confira o nome, a data e a situação do aluno.';
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
