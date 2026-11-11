import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Filho, PainelFamiliaService } from '../pages/home/painel-familia.service';
import { ItemMalaFilho, MalaFilho } from './model/mala-virtual.model';
import {
  codigoErro,
  hojeEmSaoPaulo,
  mensagemErroMala,
  statusErro,
} from './service/mala-virtual-erros';
import { MalaVirtualService } from './service/mala-virtual.service';

const MENSAGEM_ACESSO_ALTERADO =
  'O acesso a esta criança ou a esta mala mudou. Atualizamos a lista para você.';

@Component({
  selector: 'app-mala-virtual-filho',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './mala-virtual-filho.component.html',
  host: { class: 'block min-w-0' },
})
export class MalaVirtualFilhoComponent implements OnInit {
  private readonly familia = inject(PainelFamiliaService);
  private readonly api = inject(MalaVirtualService);

  readonly hoje = hojeEmSaoPaulo();

  readonly filhos = signal<Filho[]>([]);
  readonly alunoId = signal('');
  readonly malas = signal<MalaFilho[]>([]);

  readonly carregandoFilhos = signal(false);
  readonly carregandoMalas = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');

  readonly rascunhos = signal<Record<string, string>>({});
  readonly observacoesAbertas = signal<ReadonlySet<string>>(new Set());
  readonly itensSalvando = signal<ReadonlySet<string>>(new Set());
  readonly erroPorMala = signal<Record<string, string>>({});
  readonly confirmacaoPorMala = signal<Record<string, string>>({});

  readonly filhoSelecionado = computed(
    () => this.filhos().find((filho) => filho.id === this.alunoId()) ?? null,
  );

  private numeroConsulta = 0;

  ngOnInit(): void {
    void this.atualizar();
  }

  carregando(): boolean {
    return this.carregandoFilhos() || this.carregandoMalas();
  }

  async atualizar(aposAcessoAlterado = false): Promise<void> {
    if (this.carregandoFilhos()) return;

    this.carregandoFilhos.set(true);
    this.erro.set('');
    if (!aposAcessoAlterado) this.aviso.set('');

    try {
      const filhos = await firstValueFrom(this.familia.listarFilhos());
      this.filhos.set(filhos);

      const filho = filhos.find((item) => item.id === this.alunoId()) ?? filhos[0];
      this.alunoId.set(filho?.id ?? '');
    } catch (erro: unknown) {
      this.filhos.set([]);
      this.alunoId.set('');
      this.erro.set(
        statusErro(erro) === 0
          ? mensagemErroMala(erro)
          : 'Não foi possível carregar as crianças vinculadas. Tente novamente.',
      );
    } finally {
      this.carregandoFilhos.set(false);
    }

    await this.carregarMalas(!aposAcessoAlterado);
  }

  selecionar(alunoId: string): void {
    if (this.carregando() || !this.filhos().some((filho) => filho.id === alunoId)) return;

    this.alunoId.set(alunoId);
    this.aviso.set('');
    void this.carregarMalas();
  }

  async carregarMalas(recarregarFilhosSe404 = true): Promise<void> {
    const consulta = ++this.numeroConsulta;
    const filho = this.filhoSelecionado();

    this.malas.set([]);
    this.rascunhos.set({});
    this.observacoesAbertas.set(new Set());
    this.erroPorMala.set({});
    this.confirmacaoPorMala.set({});

    if (!filho) return;

    this.carregandoMalas.set(true);
    this.erro.set('');

    try {
      const malas = await firstValueFrom(this.api.listarDoFilho(filho.id));

      if (consulta === this.numeroConsulta) {
        this.malas.set(this.ordenarPorUrgencia(malas));
      }
    } catch (erro: unknown) {
      if (consulta !== this.numeroConsulta) return;

      if (statusErro(erro) === 404 && recarregarFilhosSe404) {
        this.aviso.set(MENSAGEM_ACESSO_ALTERADO);
        this.carregandoMalas.set(false);
        void this.atualizar(true);
        return;
      }

      this.erro.set(mensagemErroMala(erro));
    } finally {
      if (consulta === this.numeroConsulta) {
        this.carregandoMalas.set(false);
      }
    }
  }

  chave(mala: MalaFilho, item: ItemMalaFilho): string {
    return `${mala.id}:${item.id}`;
  }

  rascunho(mala: MalaFilho, item: ItemMalaFilho): string {
    return this.rascunhos()[this.chave(mala, item)] ?? item.observacao ?? '';
  }

  alterarRascunho(mala: MalaFilho, item: ItemMalaFilho, valor: string): void {
    const chave = this.chave(mala, item);
    this.rascunhos.update((atual) => ({ ...atual, [chave]: valor }));
  }

  observacaoVisivel(mala: MalaFilho, item: ItemMalaFilho): boolean {
    return !!item.observacao || this.observacoesAbertas().has(this.chave(mala, item));
  }

  mostrarObservacao(mala: MalaFilho, item: ItemMalaFilho): void {
    const chave = this.chave(mala, item);
    this.observacoesAbertas.update((atual) => new Set(atual).add(chave));
    setTimeout(() => document.getElementById(`observacao-${chave}`)?.focus());
  }

  observacaoAlterada(mala: MalaFilho, item: ItemMalaFilho): boolean {
    return this.rascunho(mala, item).trim() !== (item.observacao ?? '');
  }

  salvandoItem(mala: MalaFilho, item: ItemMalaFilho): boolean {
    return this.itensSalvando().has(this.chave(mala, item));
  }

  alternarEnviado(mala: MalaFilho, item: ItemMalaFilho, evento: Event): void {
    const enviado = (evento.target as HTMLInputElement).checked;
    void this.marcar(mala.id, item.id, enviado);
  }

  salvarObservacao(mala: MalaFilho, item: ItemMalaFilho): void {
    void this.marcar(mala.id, item.id, item.enviado);
  }

  private async marcar(malaId: string, itemId: string, enviado: boolean): Promise<void> {
    const alunoId = this.alunoId();
    const mala = this.malas().find((atual) => atual.id === malaId);
    const item = mala?.itens.find((atual) => atual.id === itemId);

    if (!alunoId || !mala || !item || !mala.podeMarcar) return;

    const chave = this.chave(mala, item);
    if (this.itensSalvando().has(chave)) return;

    const observacao = this.rascunho(mala, item).trim();
    const enviadoAnterior = item.enviado;

    this.itensSalvando.update((atual) => new Set(atual).add(chave));
    this.definirMensagem(this.erroPorMala, malaId, '');
    this.definirMensagem(this.confirmacaoPorMala, malaId, '');
    this.alterarItemLocal(malaId, itemId, enviado);

    try {
      const atualizada = await firstValueFrom(
        this.api.marcarItem(alunoId, malaId, itemId, {
          enviado,
          ...(observacao ? { observacao } : {}),
        }),
      );

      if (alunoId !== this.alunoId()) return;

      this.aplicarResposta(atualizada, chave);
      this.rascunhos.update((atual) => {
        const proximo = { ...atual };
        delete proximo[chave];
        return proximo;
      });
      this.definirMensagem(
        this.confirmacaoPorMala,
        malaId,
        `${item.nome}: ${enviado ? 'marcado como enviado' : 'marcado como não enviado'}.`,
      );
    } catch (erro: unknown) {
      if (alunoId !== this.alunoId()) return;

      this.alterarItemLocal(malaId, itemId, enviadoAnterior);

      if (statusErro(erro) === 404) {
        this.aviso.set(MENSAGEM_ACESSO_ALTERADO);
        void this.atualizar(true);
        return;
      }

      this.definirMensagem(this.erroPorMala, malaId, mensagemErroMala(erro));

      if (codigoErro(erro) === 'REGRA_NEGOCIO') {
        this.malas.update((malas) =>
          malas.map((atual) =>
            atual.id === malaId && atual.data < this.hoje
              ? { ...atual, podeMarcar: false }
              : atual,
          ),
        );
      }
    } finally {
      this.itensSalvando.update((atual) => {
        const proximo = new Set(atual);
        proximo.delete(chave);
        return proximo;
      });
    }
  }

  private ordenarPorUrgencia(malas: MalaFilho[]): MalaFilho[] {
    const grupo = (mala: MalaFilho) =>
      mala.data === this.hoje ? 0 : mala.data > this.hoje ? 1 : 2;

    return [...malas].sort((a, b) => {
      const diferenca = grupo(a) - grupo(b);
      if (diferenca !== 0) return diferenca;

      return grupo(a) === 1 ? a.data.localeCompare(b.data) : b.data.localeCompare(a.data);
    });
  }

  private alterarItemLocal(malaId: string, itemId: string, enviado: boolean): void {
    this.malas.update((malas) =>
      malas.map((mala) => {
        if (mala.id !== malaId) return mala;

        const itens = mala.itens.map((item) =>
          item.id === itemId ? { ...item, enviado } : item,
        );
        return { ...mala, itens, itensPendentes: itens.filter((item) => !item.enviado).length };
      }),
    );
  }

  private aplicarResposta(atualizada: MalaFilho, chaveRespondida: string): void {
    this.malas.update((malas) =>
      malas.map((mala) => {
        if (mala.id !== atualizada.id) return mala;

        const itens = atualizada.itens.map((item) => {
          const chave = this.chave(atualizada, item);
          const local = mala.itens.find((atual) => atual.id === item.id);

          return chave !== chaveRespondida && local && this.itensSalvando().has(chave)
            ? { ...item, enviado: local.enviado }
            : item;
        });

        return {
          ...atualizada,
          itens,
          itensPendentes: itens.filter((item) => !item.enviado).length,
        };
      }),
    );
  }

  private definirMensagem(
    alvo: WritableSignal<Record<string, string>>,
    malaId: string,
    mensagem: string,
  ): void {
    alvo.update((atual) => ({ ...atual, [malaId]: mensagem }));
  }
}
