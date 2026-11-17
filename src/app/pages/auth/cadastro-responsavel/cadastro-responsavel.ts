import { Location } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

const MENSAGEM_PRAZO_ENCERRADO =
  'O prazo para concluir o cadastro terminou. Solicite um novo convite à direção.';

interface ConviteResponsavel {
  nome: string;
  email: string;
  cadastroExpiraEm: string;
  consultadoEm: string;
  faixaNascimento: {
    dataMinima: string;
    dataMaxima: string;
  };
  documentos: {
    versao: string;
    termoUso: string;
    politicaPrivacidade: string;
  };
}

@Component({
  selector: 'app-cadastro-responsavel',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './cadastro-responsavel.html',
})
export class CadastroResponsavel implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly localizacao = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = '/api/cadastro/responsavel';

  private token = '';
  private prazoLocal: number | null = null;
  private temporizador?: ReturnType<typeof setTimeout>;
  private contador?: ReturnType<typeof setInterval>;

  readonly convite = signal<ConviteResponsavel | null>(null);
  readonly ocupada = signal(false);
  readonly podeConsultar = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly concluiu = signal(false);
  readonly prazoEncerrado = signal(false);
  readonly avisoPrazoEncerrado = MENSAGEM_PRAZO_ENCERRADO;

  private readonly segundosRestantes = signal(0);
  readonly tempoRestante = computed(() => {
    const segundos = this.segundosRestantes();
    const minutos = Math.floor(segundos / 60);
    return `${minutos}:${String(segundos % 60).padStart(2, '0')}`;
  });

  readonly campo =
    'w-full rounded-xl border border-stone-300 px-3 py-2 focus-visible:ring-2 focus-visible:ring-creche-verde';

  aceitouDocumentos = false;
  nome = '';
  nomeAluno = '';
  dataNascimento = '';
  telefone = '';
  senha = '';
  confirmarSenha = '';

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.temporizador);
      clearInterval(this.contador);
    });
  }

  ngOnInit(): void {
    const fragmento = this.rota.snapshot.fragment ?? '';
    const token = new URLSearchParams(fragmento).get('token') ?? '';

    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      this.mostrarErro('Abra o link completo enviado no e-mail do convite.');
      return;
    }

    this.token = token;
    this.podeConsultar.set(true);
    void this.consultar();
  }

  consultar(): Promise<void> {
    if (!this.podeConsultar()) return Promise.resolve();
    return this.executar(() => this.carregarConvite());
  }

  erroDataNascimento(): string {
    const faixa = this.convite()?.faixaNascimento;
    const data = this.dataNascimento;

    if (!faixa || !data) return '';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return 'Informe uma data de nascimento válida.';
    }

    const calendario = new Date(data + 'T00:00:00Z');
    if (Number.isNaN(calendario.getTime()) || calendario.toISOString().slice(0, 10) !== data) {
      return 'Informe uma data de nascimento válida.';
    }

    if (data < faixa.dataMinima) {
      return 'O aluno deve ter no máximo 4 anos pelo ano de nascimento.';
    }

    if (data > faixa.dataMaxima) {
      return 'O aluno deve ter pelo menos 4 meses completos.';
    }

    return '';
  }

  concluir(formulario: NgForm): Promise<void> {
    const convite = this.convite();
    if (!convite || formulario.invalid || !this.aceitouDocumentos || !this.atualizarContagem()) {
      return Promise.resolve();
    }

    return this.executar(async () => {
      const telefone = this.telefone.trim();
      if (!/^[1-9][0-9]{9,10}$/.test(telefone)) {
        this.mostrarErro('Informe o telefone com DDD e somente números.');
        return;
      }

      if (!this.senha.trim() || this.senha.length < 12 ||
          new TextEncoder().encode(this.senha).length > 72) {
        this.mostrarErro('Use uma senha com pelo menos 12 caracteres e até 72 bytes.');
        return;
      }

      if (this.senha !== this.confirmarSenha) {
        this.mostrarErro('A confirmação precisa ser igual à senha.');
        return;
      }

      const nome = this.nome.trim();
      const nomeAluno = this.nomeAluno.trim();
      if (!nome || !nomeAluno) {
        this.mostrarErro('Informe o nome do responsável e o nome do aluno.');
        return;
      }

      const erroNascimento = this.erroDataNascimento();
      if (erroNascimento) {
        this.mostrarErro(erroNascimento);
        return;
      }

      try {
        const resultado = await firstValueFrom(
          this.http.post<{ mensagem: string }>(`${this.api}/concluir`, {
            token: this.token,
            nome,
            telefone,
            senha: this.senha,
            nomeAluno,
            dataNascimento: this.dataNascimento,
            aceitouDocumentos: this.aceitouDocumentos,
            versaoTermos: convite.documentos.versao,
          }),
        );

        clearInterval(this.contador);
        this.prazoLocal = null;
        this.token = '';
        this.senha = '';
        this.confirmarSenha = '';
        this.convite.set(null);
        this.podeConsultar.set(false);
        this.prazoEncerrado.set(false);
        this.concluiu.set(true);
        this.localizacao.replaceState(this.localizacao.path(false));
        this.sucesso.set(resultado.mensagem || 'Cadastro concluído. Você já pode entrar.');
        this.agendarLimpeza();
      } catch (erro: unknown) {
        if (!this.documentosAtualizados(erro)) throw erro;
        if (this.prazoEncerrado()) return;

        this.aceitouDocumentos = false;
        // Se a consulta falhar, o formulário com a versão antiga deixa de ser enviável.
        try {
          await this.carregarConvite();
        } catch (falha) {
          this.convite.set(null);
          throw falha;
        }

        if (this.convite()) {
          this.mostrarErro('Os documentos mudaram. Leia a nova versão e confirme o aceite.');
        }
      }
    });
  }

  private async carregarConvite(): Promise<void> {
    const inicioConsulta = Date.now();
    const dados = await firstValueFrom(
      this.http.post<ConviteResponsavel>(`${this.api}/consultar-convite`, { token: this.token }),
    );

    if (this.prazoEncerrado()) return;

    const restanteNoServidor = Date.parse(dados.cadastroExpiraEm) - Date.parse(dados.consultadoEm);
    if (!Number.isFinite(restanteNoServidor)) {
      this.convite.set(null);
      throw new Error('A API não informou o prazo do cadastro.');
    }

    // Usa o intervalo informado pelo servidor para evitar depender do fuso ou da hora local.
    const prazoConsultado = inicioConsulta + restanteNoServidor;
    this.prazoLocal = Math.min(this.prazoLocal ?? prazoConsultado, prazoConsultado);

    if (!this.atualizarContagem()) return;

    clearInterval(this.contador);
    this.contador = setInterval(() => this.atualizarContagem(), 250);

    if (!this.convite() && !this.nome.trim()) this.nome = dados.nome;
    this.aceitouDocumentos = false;
    this.convite.set(dados);
  }

  private atualizarContagem(): boolean {
    if (this.prazoLocal === null) return false;

    const restante = this.prazoLocal - Date.now();
    this.segundosRestantes.set(Math.max(0, Math.ceil(restante / 1000)));

    if (restante <= 0) {
      this.encerrarPrazo();
      return false;
    }

    return true;
  }

  private encerrarPrazo(): void {
    clearInterval(this.contador);
    clearTimeout(this.temporizador);

    this.prazoLocal = null;
    this.token = '';
    this.senha = '';
    this.confirmarSenha = '';
    this.aceitouDocumentos = false;

    this.erro.set('');
    this.convite.set(null);
    this.podeConsultar.set(false);
    this.prazoEncerrado.set(true);
  }

  private documentosAtualizados(erro: unknown): boolean {
    const detalhe = this.mensagemApi(erro);
    return typeof detalhe === 'string' && detalhe.startsWith('Os documentos foram atualizados.');
  }

  private mensagemApi(erro: unknown): unknown {
    if (!(erro instanceof HttpErrorResponse) || erro.status < 400 || erro.status >= 500) {
      return null;
    }
    return erro.error?.detail ?? erro.error?.mensagem;
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupada()) return;

    this.ocupada.set(true);
    this.erro.set('');

    try {
      await acao();
    } catch (erro: unknown) {
      const mensagem = this.mensagemApi(erro);

      if (mensagem === MENSAGEM_PRAZO_ENCERRADO) {
        this.encerrarPrazo();
      } else if (!this.prazoEncerrado()) {
        this.mostrarErro(
          typeof mensagem === 'string' && mensagem.trim()
            ? mensagem
            : 'Não foi possível processar o convite. Tente novamente.',
        );
      }
    } finally {
      this.ocupada.set(false);
    }
  }

  private mostrarErro(mensagem: string): void {
    this.erro.set(mensagem);
    this.agendarLimpeza();
  }

  private agendarLimpeza(): void {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.erro.set('');
      this.sucesso.set('');
    }, 5000);
  }
}
