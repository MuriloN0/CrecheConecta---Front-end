import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { ModalAtenderSolicitacaoComponent } from './components/modal-atender-solicitacao/modal-atender-solicitacao.component';
import { ModalCancelarSolicitacaoComponent } from './components/modal-cancelar-solicitacao/modal-cancelar-solicitacao.component';
import { ModalFormSolicitacaoComponent } from './components/modal-form-solicitacao/modal-form-solicitacao.component';
import { ModalRecusarSolicitacaoComponent } from './components/modal-recusar-solicitacao/modal-recusar-solicitacao.component';
import {
  AtualizarSolicitacaoRequest,
  CORES_PERFIL_AUTOR,
  CORES_PRIORIDADE,
  CORES_STATUS,
  CriarSolicitacaoRequest,
  DetalheSolicitacao,
  MensagemSolicitacao,
  ROTULOS_PERFIL_AUTOR,
  ROTULOS_PRIORIDADE,
  ROTULOS_STATUS,
  SolicitacaoMaterial,
} from './model/solicitacao-material.model';
import {
  camposInvalidos,
  mensagemErroSolicitacao,
  precisaRecarregarDetalhe,
  statusErro,
} from './service/solicitacao-material-erros';
import { SolicitacaoMaterialService } from './service/solicitacao-material.service';

type PainelAberto = 'editar' | 'cancelar' | 'atender' | 'recusar';

const MAX_MENSAGEM = 2000;

@Component({
  selector: 'app-solicitacao-material-detalhe',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    ModalAtenderSolicitacaoComponent,
    ModalCancelarSolicitacaoComponent,
    ModalFormSolicitacaoComponent,
    ModalRecusarSolicitacaoComponent,
  ],
  templateUrl: './solicitacao-material-detalhe.component.html',
  host: { class: 'block min-w-0' },
})
export class SolicitacaoMaterialDetalheComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly api = inject(SolicitacaoMaterialService);

  private readonly datas = new DatePipe('en-US');

  private readonly conversa = viewChild<ElementRef<HTMLElement>>('conversa');


  readonly rotulosStatus = ROTULOS_STATUS;
  readonly rotulosPrioridade = ROTULOS_PRIORIDADE;
  readonly rotulosPerfilAutor = ROTULOS_PERFIL_AUTOR;

  readonly coresStatus = CORES_STATUS;
  readonly coresPrioridade = CORES_PRIORIDADE;
  readonly coresPerfilAutor = CORES_PERFIL_AUTOR;

  readonly coresMensagemMinha = 'ml-auto border-creche-verde/20 bg-creche-verde/10';
  readonly coresMensagemOutros = 'border-stone-200 bg-creche-creme';

  readonly maxMensagem = MAX_MENSAGEM;


  readonly detalhe = signal<DetalheSolicitacao | null>(null);

  readonly solicitacao = computed(() => this.detalhe()?.solicitacao ?? null);
  readonly mensagens = computed(() => this.detalhe()?.mensagens ?? []);

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly enviandoMensagem = signal(false);

  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly painel = signal<PainelAberto | null>(null);
  readonly erroPainel = signal('');
  readonly camposPainel = signal<string[]>([]);

  readonly erroMensagem = signal('');


  readonly ehDirecao = computed(() => this.auth.usuario()?.perfil === 'DIRECAO');

  readonly ehAutor = computed(() => {
    const usuario = this.auth.usuario();
    const solicitacao = this.solicitacao();

    if (!usuario || !solicitacao) {
      return false;
    }

    return usuario.perfil === 'PROFESSOR' && usuario.id === solicitacao.professorId;
  });

  readonly aberta = computed(() => this.solicitacao()?.status === 'ABERTA');

  readonly podeEditar = computed(() => this.ehAutor() && this.aberta());
  readonly podeCancelar = computed(() => this.ehAutor() && this.aberta());
  readonly podeConversar = computed(() => (this.ehAutor() || this.ehDirecao()) && this.aberta());
  readonly podeAtenderOuRecusar = computed(() => this.ehDirecao() && this.aberta());


  novaMensagem = '';

  private id = '';
  private numeroConsulta = 0;


  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';

    void this.carregar();
  }

  ocupada(): boolean {
    return this.carregando() || this.salvando() || this.enviandoMensagem();
  }

  mensagemMinha(mensagem: MensagemSolicitacao): boolean {
    return mensagem.autorId === this.auth.usuario()?.id;
  }

  avisoFinalizacao(): string {
    const solicitacao = this.solicitacao();

    if (!solicitacao) {
      return '';
    }

    const situacao = this.rotulosStatus[solicitacao.status].toLowerCase();

    const quando = solicitacao.finalizadoEm
      ? ` em ${this.datas.transform(solicitacao.finalizadoEm, 'dd/MM/yyyy HH:mm')}`
      : '';

    return `Solicitação ${situacao}${quando}. Ela fica disponível apenas para consulta.`;
  }


  atualizar(): void {
    if (this.ocupada()) {
      return;
    }

    this.erro.set('');
    this.sucesso.set('');

    void this.carregar();
  }

  async carregar(): Promise<void> {
    const consulta = ++this.numeroConsulta;

    this.carregando.set(true);

    try {
      const detalhe = await firstValueFrom(this.api.visualizar(this.id));

      if (consulta === this.numeroConsulta) {
        this.mostrarDetalhe(detalhe);
      }
    } catch (erro: unknown) {
      if (consulta !== this.numeroConsulta) {
        return;
      }

      const semAcessoAoPedido = [400, 403, 404].includes(statusErro(erro) ?? 0);

      if (semAcessoAoPedido) {
        this.detalhe.set(null);
      }

      this.erro.set(mensagemErroSolicitacao(erro));
    } finally {
      if (consulta === this.numeroConsulta) {
        this.carregando.set(false);
      }
    }
  }


  abrirPainel(painel: PainelAberto): void {
    if (this.ocupada() || !this.painelPermitido(painel)) {
      return;
    }

    this.erro.set('');
    this.sucesso.set('');
    this.erroPainel.set('');
    this.camposPainel.set([]);

    this.painel.set(painel);
  }

  fecharPainel(): void {
    if (this.salvando()) {
      return;
    }

    this.painel.set(null);
    this.erroPainel.set('');
    this.camposPainel.set([]);
  }


  salvarEdicao(dados: CriarSolicitacaoRequest): Promise<void> {
    const solicitacao = this.solicitacao();

    if (!solicitacao || !this.podeEditar()) {
      return Promise.resolve();
    }

    const corpo: AtualizarSolicitacaoRequest = {
      ...dados,
      versao: solicitacao.versao,
    };

    return this.executarAcao(
      () => this.api.atualizar(solicitacao.id, corpo),
      'Solicitação atualizada.',
    );
  }

  confirmarCancelamento(): Promise<void> {
    const solicitacao = this.solicitacao();

    if (!solicitacao || !this.podeCancelar()) {
      return Promise.resolve();
    }

    return this.executarAcao(
      () => this.api.cancelar(solicitacao.id, { versao: solicitacao.versao }),
      'Solicitação cancelada.',
    );
  }

  confirmarAtendimento(mensagem: string | null): Promise<void> {
    const solicitacao = this.solicitacao();

    if (!solicitacao || !this.podeAtenderOuRecusar()) {
      return Promise.resolve();
    }

    return this.executarAcao(
      () => this.api.atender(solicitacao.id, { mensagem, versao: solicitacao.versao }),
      'Solicitação marcada como atendida.',
    );
  }

  confirmarRecusa(motivo: string): Promise<void> {
    const solicitacao = this.solicitacao();

    if (!solicitacao || !this.podeAtenderOuRecusar()) {
      return Promise.resolve();
    }

    return this.executarAcao(
      () => this.api.recusar(solicitacao.id, { motivo, versao: solicitacao.versao }),
      'Solicitação recusada.',
    );
  }


  erroCampoMensagem(): string | null {
    if (this.novaMensagem.trim().length > MAX_MENSAGEM) {
      return `Use no máximo ${MAX_MENSAGEM} caracteres.`;
    }

    return null;
  }

  async enviarMensagem(): Promise<void> {
    const solicitacao = this.solicitacao();

    if (!solicitacao || !this.podeConversar() || this.ocupada()) {
      return;
    }

    const conteudo = this.novaMensagem.trim();

    if (!conteudo) {
      this.erroMensagem.set('Escreva uma mensagem antes de enviar.');
      return;
    }

    if (this.erroCampoMensagem()) {
      return;
    }

    this.erro.set('');
    this.sucesso.set('');
    this.erroMensagem.set('');
    this.enviandoMensagem.set(true);

    try {
      const detalhe = await firstValueFrom(
        this.api.enviarMensagem(solicitacao.id, { conteudo }),
      );

      this.numeroConsulta++;
      this.mostrarDetalhe(detalhe);

      this.novaMensagem = '';
    } catch (erro: unknown) {
      const mensagem = mensagemErroSolicitacao(erro);

      if (precisaRecarregarDetalhe(erro)) {
        this.erro.set(mensagem);
        await this.carregar();
      } else {
        this.erroMensagem.set(mensagem);
      }
    } finally {
      this.enviandoMensagem.set(false);
    }
  }


  private async executarAcao(
    requisicao: () => Observable<SolicitacaoMaterial>,
    mensagemSucesso: string,
  ): Promise<void> {
    if (this.salvando()) {
      return;
    }

    this.erroPainel.set('');
    this.camposPainel.set([]);
    this.salvando.set(true);

    try {
      await firstValueFrom(requisicao());
    } catch (erro: unknown) {
      this.salvando.set(false);

      await this.tratarErroDaAcao(erro);
      return;
    }

    this.salvando.set(false);
    this.fecharPainel();

    this.sucesso.set(mensagemSucesso);

    await this.carregar();
  }

  private async tratarErroDaAcao(erro: unknown): Promise<void> {
    const mensagem = mensagemErroSolicitacao(erro);

    if (precisaRecarregarDetalhe(erro)) {
      this.fecharPainel();
      this.erro.set(mensagem);

      await this.carregar();
      return;
    }

    this.erroPainel.set(mensagem);
    this.camposPainel.set(camposInvalidos(erro));
  }

  private painelPermitido(painel: PainelAberto): boolean {
    switch (painel) {
      case 'editar':
        return this.podeEditar();

      case 'cancelar':
        return this.podeCancelar();

      case 'atender':
      case 'recusar':
        return this.podeAtenderOuRecusar();
    }
  }

  private mostrarDetalhe(detalhe: DetalheSolicitacao): void {
    this.detalhe.set(detalhe);

    setTimeout(() => {
      const conversa = this.conversa()?.nativeElement;

      if (conversa) {
        conversa.scrollTop = conversa.scrollHeight;
      }
    });
  }
}
