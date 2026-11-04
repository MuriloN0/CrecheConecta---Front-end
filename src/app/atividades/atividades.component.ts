import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import {  AtividadeResponseDTO,  AtividadeTurma,  AtualizarAtividadeRequestDTO,  NovaAtividadeRequestDTO,  TipoAtividade,} from './model/atividades.model';
import { AtividadesService } from './service/atividades.service';

@Component({
  selector: 'app-atividades',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './atividades.component.html',
  styleUrl: './atividades.component.css',
})
export class AtividadesComponent implements OnInit {
  readonly auth = inject(AuthService);

  private readonly api = inject(AtividadesService);

  readonly turmas = signal<AtividadeTurma[]>([]);
  readonly atividades = signal<AtividadeResponseDTO[]>([]);

  readonly iniciando = signal(true);
  readonly carregando = signal(false);
  readonly salvando = signal(false);

  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly formularioAberto = signal(false);
  readonly editando = signal<AtividadeResponseDTO | null>(null);
  readonly detalhes = signal<AtividadeResponseDTO | null>(null);
  readonly exclusao = signal<AtividadeResponseDTO | null>(null);

  turmaId = '';
  tipo: TipoAtividade = 'CASA';

  titulo = '';
  descricao = '';
  prazoConclusao = '';

  private numeroConsulta = 0;

  ngOnInit(): void {
    void this.carregarTurmas();
  }

  ocupada(): boolean {
    return this.iniciando() || this.carregando() || this.salvando();
  }

  tituloPagina(): string {
    return this.tipo === 'CASA'
      ? 'Atividades para casa'
      : 'Atividades do dia';
  }

  nomeTurma(): string {
    return this.turmas().find((turma) => turma.id === this.turmaId)
      ?.nome ?? '';
  }

  podeAlterar(atividade: AtividadeResponseDTO): boolean {
    const usuario = this.auth.usuario();

    return usuario?.perfil === 'PROFESSOR'
      && usuario.id === atividade.professorId;
  }

  async carregarTurmas(): Promise<void> {
    if (this.salvando()) return;

    this.iniciando.set(true);
    this.erro.set('');
    this.fecharPaineis();

    this.numeroConsulta++;
    this.atividades.set([]);

    try {
      const turmas = await firstValueFrom(this.api.listarTurmas());

      this.turmas.set(turmas);

      const turmaAnteriorExiste = turmas.some(
        (turma) => turma.id === this.turmaId,
      );

      if (!turmaAnteriorExiste) {
        this.turmaId = turmas[0]?.id ?? '';
      }

      if (this.turmaId) {
        await this.carregarAtividades();
      }
    } catch (erro: unknown) {
      this.turmas.set([]);
      this.turmaId = '';
      this.erro.set(this.mensagemErro(erro));
    } finally {
      this.iniciando.set(false);
    }
  }

  async carregarAtividades(): Promise<void> {
    const consulta = ++this.numeroConsulta;

    this.carregando.set(true);
    this.erro.set('');
    this.atividades.set([]);

    try {
      if (!this.turmaId) return;

      const dados = await firstValueFrom(
        this.api.listarTodas(this.turmaId, this.tipo),
      );

      if (consulta === this.numeroConsulta) {
        this.atividades.set(dados);
      }
    } catch (erro: unknown) {
      if (consulta === this.numeroConsulta) {
        this.erro.set(this.mensagemErro(erro));
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
    void this.carregarAtividades();
  }

  mudarTipo(tipo: TipoAtividade): void {
    if (this.ocupada() || this.tipo === tipo) return;

    this.tipo = tipo;
    this.fecharPaineis();
    this.sucesso.set('');
    void this.carregarAtividades();
  }

  abrirCadastro(): void {
    if (this.ocupada() || !this.turmaId) return;

    this.fecharPaineis();
    this.erro.set('');
    this.sucesso.set('');
    this.formularioAberto.set(true);
  }

  abrirEdicao(atividade: AtividadeResponseDTO): void {
    if (this.ocupada() || !this.podeAlterar(atividade)) return;

    this.fecharPaineis();
    this.erro.set('');
    this.sucesso.set('');

    this.editando.set(atividade);
    this.titulo = atividade.titulo;
    this.descricao = atividade.descricao ?? '';
    this.prazoConclusao = atividade.prazoConclusao ?? '';

    this.formularioAberto.set(true);
  }

  visualizar(atividade: AtividadeResponseDTO): void {
    if (this.ocupada()) return;

    this.fecharPaineis();
    this.detalhes.set(atividade);
  }

  solicitarExclusao(atividade: AtividadeResponseDTO): void {
    if (this.ocupada() || !this.podeAlterar(atividade)) return;

    this.fecharPaineis();
    this.erro.set('');
    this.sucesso.set('');
    this.exclusao.set(atividade);
  }

  fecharPaineis(): void {
    if (this.salvando()) return;

    this.formularioAberto.set(false);
    this.editando.set(null);
    this.detalhes.set(null);
    this.exclusao.set(null);

    this.titulo = '';
    this.descricao = '';
    this.prazoConclusao = '';
  }

  async salvar(formulario: NgForm): Promise<void> {
    if (this.ocupada()) return;

    this.erro.set('');
    this.sucesso.set('');
    formulario.form.markAllAsTouched();

    const usuario = this.auth.usuario();
    const titulo = this.titulo.trim();

    if (!usuario || usuario.perfil !== 'PROFESSOR') {
      this.erro.set('Apenas professores podem cadastrar atividades.');
      return;
    }

    if (!this.turmaId) {
      this.erro.set('Selecione uma turma.');
      return;
    }

    if (!titulo || titulo.length > 150 || formulario.invalid) {
      this.erro.set('Confira o título e os demais campos do formulário.');
      return;
    }

    if (this.tipo === 'CASA' && !this.prazoConclusao) {
      this.erro.set('Informe o prazo de conclusão.');
      return;
    }

    const atividade = this.editando();

    if (atividade && !this.podeAlterar(atividade)) {
      this.erro.set('Somente o autor pode editar esta atividade.');
      return;
    }

    this.salvando.set(true);

    try {
      if (atividade) {
        const dados: AtualizarAtividadeRequestDTO = {
          tipo: this.tipo,
          titulo,
          descricao: this.descricao.trim(),
          prazoConclusao:
            this.tipo === 'CASA'
              ? this.prazoConclusao
              : undefined,
        };

        await firstValueFrom(
          this.api.atualizarParcial(atividade.id, dados),
        );
      } else {
        const dados: NovaAtividadeRequestDTO = {
          professorId: usuario.id,
          tipo: this.tipo,
          titulo,
          descricao: this.descricao.trim(),
          prazoConclusao:
            this.tipo === 'CASA'
              ? this.prazoConclusao
              : undefined,
        };

        await firstValueFrom(
          this.api.criar(dados, this.turmaId),
        );
      }
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
      return;
    } finally {
      this.salvando.set(false);
    }

    this.fecharPaineis();

    this.sucesso.set(
      atividade
        ? 'Atividade atualizada com sucesso.'
        : 'Atividade cadastrada com sucesso.',
    );

    await this.carregarAtividades();
  }

  async confirmarExclusao(): Promise<void> {
    const atividade = this.exclusao();

    if (this.ocupada() || !atividade) return;

    if (!this.podeAlterar(atividade)) {
      this.erro.set('Somente o autor pode excluir esta atividade.');
      return;
    }

    this.erro.set('');
    this.sucesso.set('');
    this.salvando.set(true);

    try {
      await firstValueFrom(this.api.deletar(atividade.id));
    } catch (erro: unknown) {
      this.erro.set(this.mensagemErro(erro));
      return;
    } finally {
      this.salvando.set(false);
    }

    this.fecharPaineis();
    this.sucesso.set('Atividade excluída com sucesso.');

    await this.carregarAtividades();
  }

  private mensagemErro(erro: unknown): string {
    if (!(erro instanceof HttpErrorResponse)) {
      return 'Não foi possível concluir a operação. Tente novamente.';
    }

    switch (erro.status) {
      case 0:
        return 'Não foi possível conectar à API.';
      case 400:
        return 'Confira os campos enviados e o prazo da atividade.';
      case 401:
        return 'Sua sessão expirou. Entre novamente.';
      case 403:
        return 'Acesso negado. Confira seu vínculo com a turma e a autoria da atividade.';
      case 404:
        return 'A atividade não foi encontrada. Atualize a listagem.';
      case 409:
        return 'Não foi possível salvar devido a um conflito. Atualize os dados.';
      default:
        return 'Não foi possível concluir a operação. Tente novamente.';
    }
  }
}
