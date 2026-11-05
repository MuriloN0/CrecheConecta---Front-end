import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Aluno, AlunosApi } from '../alunos/alunos.service';
import { Matricula, Pagina, Turma, TurmasApi } from './turmas.service';

type Filtro = 'ativas' | 'inativas' | 'todas';
type MatriculaExibida = Matricula & { nomeAluno: string };

interface Lista<T> {
  itens: T[];
  pagina: number;
  totalPaginas: number;
}

function listaVazia<T>(): Lista<T> {
  return { itens: [], pagina: 0, totalPaginas: 0 };
}

@Component({
  selector: 'app-turmas',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './turmas.html',
})
export class Turmas implements OnInit {
  private readonly api = inject(TurmasApi);
  private readonly alunosApi = inject(AlunosApi);
  private readonly http = inject(HttpClient);

  readonly turmas = signal(listaVazia<Turma>());
  readonly matriculas = signal(listaVazia<MatriculaExibida>());
  readonly alunos = signal(listaVazia<Aluno>());

  readonly ocupada = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly turmaSelecionada = signal<Turma | null>(null);

  readonly cartao = 'space-y-4 rounded-2xl border border-stone-200 bg-white p-4 md:p-6';
  readonly campo = 'rounded-xl border border-stone-300 bg-white px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:opacity-50';
  readonly botao = 'cursor-pointer rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-creche-verde disabled:cursor-not-allowed disabled:opacity-50';
  readonly primario = 'cursor-pointer rounded-lg bg-creche-verde px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:ring-2 focus-visible:ring-creche-verde focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  filtro: Filtro = 'ativas';
  formularioAberto = false;
  editando: Turma | null = null;
  nome = '';
  numeroSala = '';
  alunoId = '';
  incluirEncerradas = false;

  ngOnInit(): void {
    void this.listarTurmas(0);
  }

  listarTurmas(pagina: number): Promise<void> {
    return this.executar(async () => {
      this.turmas.set(listaVazia());
      await this.buscarTurmas(pagina);
    });
  }

  mudarFiltro(filtro: Filtro): void {
    this.filtro = filtro;
    void this.listarTurmas(0);
  }

  abrirFormulario(turma: Turma | null = null): void {
    this.erro.set('');
    this.sucesso.set('');
    this.editando = turma;
    this.nome = turma?.nome ?? '';
    this.numeroSala = turma?.numeroSala ?? '';
    this.formularioAberto = true;
  }

  salvar(): Promise<void> {
    return this.executar(async () => {
      const dados = {
        nome: this.nome.trim(),
        numeroSala: this.numeroSala.trim(),
      };

      if (!dados.nome || dados.nome.length > 150 ||
          !dados.numeroSala || dados.numeroSala.length > 20) {
        this.erro.set('Informe um nome de até 150 caracteres e uma sala de até 20 caracteres.');
        return;
      }

      const anterior = this.editando;
      const turma = anterior
        ? await firstValueFrom(this.api.atualizar(anterior, dados))
        : await firstValueFrom(this.api.cadastrar(dados));

      this.formularioAberto = false;
      this.sucesso.set(anterior ? 'Turma atualizada.' : 'Turma cadastrada.');

      if (this.turmaSelecionada()?.id === turma.id) {
        this.turmaSelecionada.set(turma);
      }

      if (!anterior) this.filtro = 'ativas';

      await this.buscarTurmas(anterior ? this.turmas().pagina : 0);
    });
  }

  inativar(turma: Turma): Promise<void> {
    if (!turma.ativo || !window.confirm(
      `Inativar ${turma.nome}? As matrículas e os vínculos atuais da turma serão encerrados.`,
    )) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      await firstValueFrom(this.api.inativar(turma));
      this.sucesso.set('Turma inativada.');

      if (this.turmaSelecionada()?.id === turma.id) {
        this.turmaSelecionada.set(null);
      }
      if (this.editando?.id === turma.id) {
        this.formularioAberto = false;
      }

      await this.buscarTurmas(this.turmas().pagina);
    });
  }

  selecionarTurma(turma: Turma): Promise<void> {
    return this.executar(async () => {
      this.turmaSelecionada.set(turma);
      this.incluirEncerradas = !turma.ativo;
      this.matriculas.set(listaVazia());
      this.alunos.set(listaVazia());
      this.alunoId = '';

      await Promise.allSettled([
        this.buscarMatriculas(turma.id, 0),
        ...(turma.ativo ? [this.buscarAlunos(0)] : []),
      ]).then((resultados) => {
        const falha = resultados.find((resultado) => resultado.status === 'rejected');
        if (falha?.status === 'rejected') throw falha.reason;
      });
    });
  }

  listarMatriculas(pagina: number): Promise<void> {
    const turma = this.turmaSelecionada();
    if (!turma) return Promise.resolve();

    return this.executar(async () => {
      this.matriculas.set(listaVazia());
      await this.buscarMatriculas(turma.id, pagina);
    });
  }

  listarAlunos(pagina: number): Promise<void> {
    return this.executar(async () => {
      this.alunoId = '';
      this.alunos.set(listaVazia());
      await this.buscarAlunos(pagina);
    });
  }

  matricular(): Promise<void> {
    const turma = this.turmaSelecionada();
    const alunoId = this.alunoId;

    if (!turma?.ativo || !this.alunos().itens.some((aluno) => aluno.id === alunoId)) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      await firstValueFrom(this.api.matricular(turma.id, alunoId));
      this.alunoId = '';
      this.sucesso.set('Aluno matriculado.');
      await this.buscarMatriculas(turma.id, 0);
    });
  }

  encerrar(matricula: MatriculaExibida): Promise<void> {
    if (matricula.encerradoEm || !window.confirm(
      `Encerrar a matrícula de ${matricula.nomeAluno} nesta turma?`,
    )) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      await firstValueFrom(this.api.encerrar(matricula));
      this.sucesso.set('Matrícula encerrada.');
      await this.buscarMatriculas(matricula.turmaId, this.matriculas().pagina);
    });
  }

  private async buscarTurmas(pagina: number): Promise<void> {
    const ativo = this.filtro === 'todas' ? null : this.filtro === 'ativas';
    this.turmas.set(await this.buscarPagina(
      pagina,
      (numero) => firstValueFrom(this.api.listar(numero, ativo)),
    ));
  }

  private async buscarAlunos(pagina: number): Promise<void> {
    this.alunos.set(await this.buscarPagina(
      pagina,
      (numero) => firstValueFrom(this.alunosApi.listar(numero, true)),
    ));
  }

  private async buscarMatriculas(turmaId: string, pagina: number): Promise<void> {
    const lista = await this.buscarPagina(
      pagina,
      (numero) => firstValueFrom(
        this.api.listarMatriculas(turmaId, numero, this.incluirEncerradas),
      ),
    );

    const itens = await Promise.all(
      lista.itens.map(async (matricula): Promise<MatriculaExibida> => {
        let nomeAluno = matricula.alunoId;

        try {
          const aluno = await firstValueFrom(
            this.http.get<Aluno>(`/api/alunos/${matricula.alunoId}`),
          );
          nomeAluno = aluno.nome;
        } catch {
          // O identificador mantém a matrícula reconhecível se o nome falhar.
        }

        return { ...matricula, nomeAluno };
      }),
    );

    this.matriculas.set({ ...lista, itens });
  }

  private async buscarPagina<T>(
    pagina: number,
    buscar: (numero: number) => Promise<Pagina<T>>,
  ): Promise<Lista<T>> {
    let resposta = await buscar(pagina);
    const ultima = Math.max(0, resposta.totalPages - 1);

    if (pagina > ultima) {
      pagina = ultima;
      resposta = await buscar(pagina);
    }

    return { itens: resposta.content, pagina, totalPaginas: resposta.totalPages };
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
    } finally {
      this.ocupada.set(false);
    }
  }

  private mensagemErro(erro: unknown): string {
    if (erro instanceof HttpErrorResponse) {
      switch (erro.status) {
        case 0:
          return 'Não foi possível conectar à API.';
        case 400:
        case 409: {
          const mensagem: unknown = erro.error?.mensagem;
          return typeof mensagem === 'string' && mensagem.trim()
            ? mensagem
            : 'Confira os dados e atualize a lista antes de tentar novamente.';
        }
        case 401:
          return 'Sua sessão expirou. Entre novamente.';
        case 403:
          return 'A gestão de turmas e matrículas é restrita à direção.';
        case 404:
          return 'O registro não foi encontrado. Atualize a lista.';
      }
    }

    return 'Não foi possível concluir a operação. Tente novamente.';
  }
}
