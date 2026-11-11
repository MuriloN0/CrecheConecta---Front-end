import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AtividadeTurma } from '../atividades/model/atividades.model';
import { AtividadesService } from '../atividades/service/atividades.service';
import { AuthService } from '../core/services/auth.service';
import { ModalDetalheMalaComponent } from './components/modal-detalhe-mala/modal-detalhe-mala.component';
import { ModalExcluirMalaComponent } from './components/modal-excluir-mala/modal-excluir-mala.component';
import { ModalFormMalaComponent } from './components/modal-form-mala/modal-form-mala.component';
import {
  AtualizarMalaRequest,
  CriarMalaRequest,
  MalaTurma,
  ProgressoAluno,
} from './model/mala-virtual.model';
import {
  camposInvalidos,
  codigoErro,
  hojeEmSaoPaulo,
  mensagemErroMala,
  statusErro,
} from './service/mala-virtual-erros';
import { MalaVirtualService } from './service/mala-virtual.service';

@Component({
  selector: 'app-mala-virtual',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ModalDetalheMalaComponent,
    ModalExcluirMalaComponent,
    ModalFormMalaComponent,
  ],
  templateUrl: './mala-virtual.component.html',
  host: { class: 'block min-w-0' },
})
export class MalaVirtualComponent implements OnInit {
  readonly auth = inject(AuthService);

  private readonly atividades = inject(AtividadesService);
  private readonly api = inject(MalaVirtualService);

  readonly hoje = hojeEmSaoPaulo();

  readonly turmas = signal<AtividadeTurma[]>([]);
  readonly malas = signal<MalaTurma[]>([]);

  readonly iniciando = signal(true);
  readonly carregando = signal(false);
  readonly salvando = signal(false);

  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly formularioAberto = signal(false);
  readonly editando = signal<MalaTurma | null>(null);
  readonly erroFormulario = signal('');
  readonly camposFormulario = signal<string[]>([]);

  readonly detalhe = signal<MalaTurma | null>(null);
  readonly progresso = signal<ProgressoAluno[]>([]);
  readonly carregandoProgresso = signal(false);
  readonly erroProgresso = signal('');

  readonly exclusao = signal<MalaTurma | null>(null);
  readonly erroExclusao = signal('');

  turmaId = '';

  private numeroConsulta = 0;
  private numeroProgresso = 0;

  ngOnInit(): void {
    void this.carregarTurmas();
  }

  ocupada(): boolean {
    return this.iniciando() || this.carregando() || this.salvando();
  }

  nomeTurma(): string {
    const turma = this.turmas().find((item) => item.id === this.turmaId);
    return turma ? `${turma.nome} — Sala ${turma.numeroSala}` : '';
  }

  podeAlterar(mala: MalaTurma): boolean {
    const usuario = this.auth.usuario();
    return usuario?.perfil === 'PROFESSOR' && usuario.id === mala.professorId;
  }

  async carregarTurmas(): Promise<void> {
    if (this.salvando()) return;

    this.iniciando.set(true);
    this.erro.set('');
    this.fecharPaineis();

    this.numeroConsulta++;
    this.malas.set([]);

    try {
      const turmas = await firstValueFrom(this.atividades.listarTurmas());
      this.turmas.set(turmas);

      if (!turmas.some((turma) => turma.id === this.turmaId)) {
        this.turmaId = turmas[0]?.id ?? '';
      }

      if (this.turmaId) {
        await this.carregarMalas();
      }
    } catch (erro: unknown) {
      this.turmas.set([]);
      this.turmaId = '';
      this.erro.set(mensagemErroMala(erro));
    } finally {
      this.iniciando.set(false);
    }
  }

  async carregarMalas(): Promise<void> {
    const consulta = ++this.numeroConsulta;

    this.carregando.set(true);
    this.erro.set('');

    try {
      if (!this.turmaId) {
        this.malas.set([]);
        return;
      }

      const malas = await firstValueFrom(this.api.listar(this.turmaId));

      if (consulta === this.numeroConsulta) {
        this.malas.set(malas);
      }
    } catch (erro: unknown) {
      if (consulta === this.numeroConsulta) {
        this.malas.set([]);
        this.erro.set(mensagemErroMala(erro));
      }
    } finally {
      if (consulta === this.numeroConsulta) {
        this.carregando.set(false);
      }
    }
  }

  mudarTurma(): void {
    this.fecharPaineis();
    this.sucesso.set('');
    this.malas.set([]);
    void this.carregarMalas();
  }

  abrirCadastro(): void {
    if (this.ocupada() || !this.turmaId) return;

    this.fecharPaineis();
    this.sucesso.set('');
    this.formularioAberto.set(true);
  }

  abrirEdicao(mala: MalaTurma): void {
    if (this.ocupada() || !this.podeAlterar(mala)) return;

    this.fecharPaineis();
    this.sucesso.set('');
    this.editando.set(mala);
    this.formularioAberto.set(true);
  }

  abrirDetalhe(mala: MalaTurma): void {
    if (this.ocupada()) return;

    this.fecharPaineis();
    this.detalhe.set(mala);
    void this.carregarProgresso();
  }

  solicitarExclusao(mala: MalaTurma): void {
    if (this.ocupada() || !this.podeAlterar(mala)) return;

    this.fecharPaineis();
    this.sucesso.set('');
    this.exclusao.set(mala);
  }

  editarDoDetalhe(): void {
    const mala = this.detalhe();
    if (mala) this.abrirEdicao(mala);
  }

  excluirDoDetalhe(): void {
    const mala = this.detalhe();
    if (mala) this.solicitarExclusao(mala);
  }

  fecharPaineis(): void {
    if (this.salvando()) return;

    this.formularioAberto.set(false);
    this.editando.set(null);
    this.erroFormulario.set('');
    this.camposFormulario.set([]);

    this.numeroProgresso++;
    this.detalhe.set(null);
    this.progresso.set([]);
    this.carregandoProgresso.set(false);
    this.erroProgresso.set('');

    this.exclusao.set(null);
    this.erroExclusao.set('');
  }

  async carregarProgresso(): Promise<void> {
    const mala = this.detalhe();
    if (!mala) return;

    const consulta = ++this.numeroProgresso;

    this.carregandoProgresso.set(true);
    this.erroProgresso.set('');

    try {
      const progresso = await firstValueFrom(this.api.progresso(mala.turmaId, mala.id));

      if (consulta === this.numeroProgresso) {
        this.progresso.set(progresso);
      }
    } catch (erro: unknown) {
      if (consulta !== this.numeroProgresso) return;

      if (statusErro(erro) === 404) {
        this.fecharPaineis();
        this.erro.set(mensagemErroMala(erro));
        void this.carregarMalas();
        return;
      }

      this.progresso.set([]);
      this.erroProgresso.set(mensagemErroMala(erro));
    } finally {
      if (consulta === this.numeroProgresso) {
        this.carregandoProgresso.set(false);
      }
    }
  }

  async salvar(dados: CriarMalaRequest | AtualizarMalaRequest): Promise<void> {
    if (this.salvando() || !this.turmaId) return;

    const mala = this.editando();

    if (mala && !this.podeAlterar(mala)) {
      this.erroFormulario.set('Somente o professor que criou a mala pode editá-la.');
      return;
    }

    this.erroFormulario.set('');
    this.camposFormulario.set([]);
    this.salvando.set(true);

    try {
      if (mala) {
        await firstValueFrom(
          this.api.atualizar(mala.turmaId, mala.id, dados as AtualizarMalaRequest),
        );
      } else {
        await firstValueFrom(this.api.criar(this.turmaId, dados));
      }
    } catch (erro: unknown) {
      this.salvando.set(false);
      await this.tratarErroAoSalvar(erro, mala);
      return;
    }

    this.salvando.set(false);
    this.fecharPaineis();
    this.sucesso.set(mala ? 'Mala atualizada com sucesso.' : 'Mala criada com sucesso.');

    await this.carregarMalas();
  }

  async confirmarExclusao(): Promise<void> {
    const mala = this.exclusao();
    if (this.salvando() || !mala) return;

    if (!this.podeAlterar(mala)) {
      this.erroExclusao.set('Somente o professor que criou a mala pode excluí-la.');
      return;
    }

    this.erroExclusao.set('');
    this.salvando.set(true);

    try {
      await firstValueFrom(this.api.excluir(mala.turmaId, mala.id));
    } catch (erro: unknown) {
      this.salvando.set(false);

      if (statusErro(erro) === 404) {
        this.fecharPaineis();
        this.erro.set(mensagemErroMala(erro));
        await this.carregarMalas();
        return;
      }

      this.erroExclusao.set(mensagemErroMala(erro));
      return;
    }

    this.salvando.set(false);
    this.fecharPaineis();
    this.malas.update((malas) => malas.filter((item) => item.id !== mala.id));
    this.sucesso.set('Mala excluída com sucesso.');
  }

  private async tratarErroAoSalvar(erro: unknown, mala: MalaTurma | null): Promise<void> {
    const mensagem = mensagemErroMala(erro);

    if (mala && statusErro(erro) === 404) {
      this.fecharPaineis();
      this.erro.set(mensagem);
      await this.carregarMalas();
      return;
    }

    this.erroFormulario.set(mensagem);
    this.camposFormulario.set(camposInvalidos(erro));

    if (mala && codigoErro(erro) === 'CONFLITO_VERSAO') {
      await this.recarregarMalaEmEdicao(mala, mensagem);
    }
  }

  private async recarregarMalaEmEdicao(mala: MalaTurma, aviso: string): Promise<void> {
    this.salvando.set(true);

    try {
      const atual = await firstValueFrom(this.api.visualizar(mala.turmaId, mala.id));

      this.malas.update((malas) =>
        malas.map((item) => (item.id === atual.id ? atual : item)),
      );

      if (this.editando()?.id === atual.id) {
        this.editando.set(atual);
        this.erroFormulario.set(aviso);
      }
    } catch (erro: unknown) {
      this.salvando.set(false);
      this.fecharPaineis();
      this.erro.set(mensagemErroMala(erro));
      await this.carregarMalas();
    } finally {
      this.salvando.set(false);
    }
  }
}
