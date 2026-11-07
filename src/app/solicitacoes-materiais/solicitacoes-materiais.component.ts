import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { ModalFormSolicitacaoComponent } from './components/modal-form-solicitacao/modal-form-solicitacao.component';
import {
  CORES_PRIORIDADE,
  CORES_STATUS,
  CriarSolicitacaoRequest,
  FiltrosSolicitacao,
  LISTA_PRIORIDADES,
  LISTA_STATUS,
  PrioridadeSolicitacao,
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
  SolicitacaoMaterial,
  StatusSolicitacao,
} from './model/solicitacao-material.model';
import { camposInvalidos, mensagemErroSolicitacao } from './service/solicitacao-material-erros';
import { SolicitacaoMaterialService } from './service/solicitacao-material.service';

@Component({
  selector: 'app-solicitacoes-materiais',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, ModalFormSolicitacaoComponent],
  templateUrl: './solicitacoes-materiais.component.html',
  host: { class: 'block min-w-0' },
})
export class SolicitacoesMateriaisComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(SolicitacaoMaterialService);


  readonly listaStatus = LISTA_STATUS;
  readonly listaPrioridades = LISTA_PRIORIDADES;

  readonly rotulosStatus = ROTULOS_STATUS;
  readonly rotulosPrioridade = ROTULOS_PRIORIDADE;

  readonly coresStatus = CORES_STATUS;
  readonly coresPrioridade = CORES_PRIORIDADE;


  readonly ehProfessor = computed(() => this.auth.usuario()?.perfil === 'PROFESSOR');
  readonly ehDirecao = computed(() => this.auth.usuario()?.perfil === 'DIRECAO');


  readonly solicitacoes = signal<SolicitacaoMaterial[]>([]);
  readonly pagina = signal(0);
  readonly totalPaginas = signal(0);
  readonly totalSolicitacoes = signal(0);

  readonly carregando = signal(true);
  readonly salvando = signal(false);

  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly formularioAberto = signal(false);
  readonly erroFormulario = signal('');
  readonly camposFormulario = signal<string[]>([]);


  filtroStatus: StatusSolicitacao | '' = '';
  filtroPrioridade: PrioridadeSolicitacao | '' = '';

  private numeroConsulta = 0;


  ngOnInit(): void {
    void this.carregar(0);
  }

  ocupada(): boolean {
    return this.carregando() || this.salvando();
  }

  temFiltros(): boolean {
    return this.filtroStatus !== '' || this.filtroPrioridade !== '';
  }


  async carregar(pagina: number): Promise<void> {
    if (pagina < 0) {
      return;
    }

    const consulta = ++this.numeroConsulta;
    const filtros = this.filtrosAtuais();

    this.carregando.set(true);
    this.erro.set('');

    try {
      let resposta = await firstValueFrom(this.api.listar(pagina, filtros));

      const ultimaPagina = Math.max(0, resposta.totalPages - 1);

      if (pagina > ultimaPagina) {
        pagina = ultimaPagina;
        resposta = await firstValueFrom(this.api.listar(pagina, filtros));
      }

      if (consulta !== this.numeroConsulta) {
        return;
      }

      this.solicitacoes.set(resposta.content);
      this.pagina.set(pagina);
      this.totalPaginas.set(resposta.totalPages);
      this.totalSolicitacoes.set(resposta.totalElements);
    } catch (erro: unknown) {
      if (consulta !== this.numeroConsulta) {
        return;
      }

      this.solicitacoes.set([]);
      this.totalPaginas.set(0);
      this.totalSolicitacoes.set(0);
      this.erro.set(mensagemErroSolicitacao(erro));
    } finally {
      if (consulta === this.numeroConsulta) {
        this.carregando.set(false);
      }
    }
  }

  atualizar(): void {
    this.sucesso.set('');

    void this.carregar(this.pagina());
  }

  aplicarFiltros(): void {
    this.sucesso.set('');

    void this.carregar(0);
  }

  limparFiltros(): void {
    this.filtroStatus = '';
    this.filtroPrioridade = '';

    this.aplicarFiltros();
  }


  abrirCadastro(): void {
    if (!this.ehProfessor() || this.ocupada()) {
      return;
    }

    this.sucesso.set('');
    this.erroFormulario.set('');
    this.camposFormulario.set([]);

    this.formularioAberto.set(true);
  }

  fecharFormulario(): void {
    if (this.salvando()) {
      return;
    }

    this.formularioAberto.set(false);
    this.erroFormulario.set('');
    this.camposFormulario.set([]);
  }

  async criar(dados: CriarSolicitacaoRequest): Promise<void> {
    if (this.salvando() || !this.ehProfessor()) {
      return;
    }

    this.erroFormulario.set('');
    this.camposFormulario.set([]);
    this.salvando.set(true);

    try {
      await firstValueFrom(this.api.criar(dados));
    } catch (erro: unknown) {
      this.salvando.set(false);

      this.erroFormulario.set(mensagemErroSolicitacao(erro));
      this.camposFormulario.set(camposInvalidos(erro));
      return;
    }

    this.salvando.set(false);
    this.fecharFormulario();

    this.sucesso.set('Solicitação enviada à direção.');

    await this.carregar(0);
  }


  private filtrosAtuais(): FiltrosSolicitacao {
    return {
      status: this.filtroStatus,
      prioridade: this.filtroPrioridade,
    };
  }
}
