import { DatePipe, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, timer } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ContatoChat, ConversasService, MensagemChat } from './conversas.service';

@Component({
  selector: 'app-conversas',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './conversas.html',
})
export class Conversas implements OnInit {
  readonly auth = inject(AuthService);

  private readonly api = inject(ConversasService);
  private readonly destroy = inject(DestroyRef);
  private readonly doc = inject(DOCUMENT);

  readonly busca = signal('');
  readonly somenteConversas = signal(false);
  readonly contatos = signal<ContatoChat[]>([]);
  readonly pagina = signal(0);
  readonly temProxima = signal(false);
  readonly carregandoContatos = signal(false);
  readonly erroContatos = signal('');
  readonly selecionado = signal<ContatoChat | null>(null);
  readonly mensagens = signal<MensagemChat[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly carregandoMensagens = signal(false);
  readonly enviando = signal(false);
  readonly erroMensagem = signal('');
  readonly erroEnvio = signal('');
  readonly texto = signal('');

  readonly nomesPerfil = {
    DIRECAO: 'Direção',
    PROFESSOR: 'Professor(a)',
    RESPONSAVEL: 'Responsável',
  };

  private buscaAplicada = '';
  private geracao = 0;
  private pedidoContatos = 0;

  ngOnInit(): void {
    void this.carregarContatos(0);
    timer(5000, 5000).pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      if (this.doc.visibilityState === 'hidden') return;

      const contato = this.selecionado();
      if (contato && !this.enviando()) {
        void this.carregarMensagens(contato, false);
      } else if (!contato && !this.carregandoContatos() && !this.erroContatos() && this.pagina() === 0) {
        void this.carregarContatos(0, true);
      }
    });
  }

  pesquisar(evento: Event): void {
    evento.preventDefault();
    this.buscaAplicada = this.busca().trim();
    void this.carregarContatos(0);
  }

  escolherLista(somente: boolean): void {
    this.somenteConversas.set(somente);
    this.busca.set('');
    this.buscaAplicada = '';
    void this.carregarContatos(0);
  }

  async carregarContatos(pagina: number, silencioso = false): Promise<void> {
    const pedido = ++this.pedidoContatos;
    if (!silencioso) {
      this.carregandoContatos.set(true);
      this.erroContatos.set('');
    }

    try {
      const dados = await firstValueFrom(
        this.api.contatos(this.buscaAplicada, pagina, this.somenteConversas())
          .pipe(takeUntilDestroyed(this.destroy)),
        { defaultValue: null },
      );
      if (!dados || pedido !== this.pedidoContatos) return;

      this.contatos.set(dados.itens);
      this.temProxima.set(dados.temProxima);
      this.pagina.set(pagina);
    } catch (erro) {
      if (!silencioso && pedido === this.pedidoContatos) {
        this.contatos.set([]);
        this.temProxima.set(false);
        this.erroContatos.set(this.detalhe(erro, 'Não foi possível carregar os contatos.'));
      }
    } finally {
      if (pedido === this.pedidoContatos) this.carregandoContatos.set(false);
    }
  }

  abrir(contato: ContatoChat): void {
    this.voltar();
    this.selecionado.set(contato);
    void this.carregarMensagens(contato, false);
  }

  voltar(): void {
    this.geracao++;
    this.selecionado.set(null);
    this.carregandoMensagens.set(false);
    this.enviando.set(false);
    this.mensagens.set([]);
    this.cursor.set(null);
    this.texto.set('');
    this.erroMensagem.set('');
    this.erroEnvio.set('');
  }

  async carregarMensagens(contato: ContatoChat, anteriores: boolean): Promise<void> {
    const cursor = anteriores ? this.cursor() : null;
    if (this.carregandoMensagens() || (anteriores && !cursor)) return;

    const geracao = this.geracao;
    this.carregandoMensagens.set(true);
    try {
      const dados = await firstValueFrom(
        this.api.mensagens(contato.id, cursor ?? undefined)
          .pipe(takeUntilDestroyed(this.destroy)),
        { defaultValue: null },
      );
      if (!dados || geracao !== this.geracao) return;

      const existentes = this.mensagens();
      if (anteriores) {
        const jaExibidas = new Set(existentes.map((m) => m.id));
        this.mensagens.set([...dados.itens.filter((m) => !jaExibidas.has(m.id)), ...existentes]);
        this.cursor.set(dados.cursorAnterior);
      } else {
        const recentes = new Set(dados.itens.map((m) => m.id));
        const sobreposicao = existentes.some((m) => recentes.has(m.id));

        if (!sobreposicao) {
          this.mensagens.set(dados.itens);
          this.cursor.set(dados.cursorAnterior);
        } else {
          this.mensagens.set([...existentes.filter((m) => !recentes.has(m.id)), ...dados.itens]);
        }
      }
      this.erroMensagem.set('');
    } catch (erro) {
      if (geracao !== this.geracao) return;

      if (erro instanceof HttpErrorResponse && (erro.status === 403 || erro.status === 401)) {
        this.mensagens.set([]);
        this.cursor.set(null);
      }
      this.erroMensagem.set(this.detalhe(erro, 'Não foi possível atualizar as mensagens.'));
    } finally {
      if (geracao === this.geracao) this.carregandoMensagens.set(false);
    }
  }

  async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    const contato = this.selecionado();
    const texto = this.texto().trim();
    if (!contato || !texto || this.enviando() || this.carregandoMensagens()) return;

    const geracao = this.geracao;
    this.enviando.set(true);
    this.erroEnvio.set('');

    try {
      const enviada = await firstValueFrom(
        this.api.enviar(contato.id, texto).pipe(takeUntilDestroyed(this.destroy)),
        { defaultValue: null },
      );
      if (!enviada || geracao !== this.geracao) return;

      this.texto.set('');
      await this.carregarMensagens(contato, false);
      void this.carregarContatos(this.pagina(), true);
    } catch (erro) {
      if (geracao === this.geracao) {
        this.erroEnvio.set(this.detalhe(
          erro,
          'Não foi possível confirmar o envio. Confira a conversa antes de tentar novamente.',
        ));
      }
    } finally {
      if (geracao === this.geracao) this.enviando.set(false);
    }
  }

  private detalhe(erro: unknown, mensagem: string): string {
    if (erro instanceof HttpErrorResponse && erro.status >= 400 && erro.status < 500) {
      const detalhe: unknown = erro.error?.detail;
      if (typeof detalhe === 'string') return detalhe;
    }
    return mensagem;
  }
}
