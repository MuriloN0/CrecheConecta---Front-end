import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Perfil, UsuarioLogado } from '../../../core/models/auth.models';

interface ItemMenu {
  titulo: string;
  caminho: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="bg-creche-verde p-3 text-white md:sticky md:top-0 md:flex
                  md:h-dvh md:flex-col md:overflow-y-auto md:p-4">
      <div class="flex items-center justify-between gap-2" (keydown.escape)="fecharMenu(botaoMenu)">
        <a
          routerLink="/home"
          (click)="menuAberto.set(false)"
          class="flex min-w-0 items-center gap-2 rounded-xl px-1 py-1
                 focus-visible:outline-2 focus-visible:outline-offset-2
                 focus-visible:outline-white md:gap-3"
        >
          <img src="crecheconecta.svg" alt="" width="44" height="44" class="size-11 shrink-0" />
          <span class="min-w-0">
            <span class="block wrap-anywhere font-bold md:text-lg">CrecheConecta</span>
            <span class="block text-xs text-white/80">{{ nomePerfil() }}</span>
          </span>
        </a>

        <button
          #botaoMenu
          type="button"
          (click)="alternarMenu()"
          [attr.aria-expanded]="menuAberto()"
          aria-controls="menu-portal"
          class="min-h-11 shrink-0 rounded-xl border border-white/40 px-3 text-sm font-semibold
                 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2
                 focus-visible:outline-white md:hidden"
        >
          {{ menuAberto() ? 'Fechar menu' : 'Menu' }}
        </button>
      </div>

      <div
        id="menu-portal"
        [class.hidden]="!menuAberto()"
        (keydown.escape)="fecharMenu(botaoMenu)"
        class="mt-3 max-h-[65dvh] overflow-y-auto overscroll-contain p-1
               md:mt-6 md:flex md:max-h-none md:flex-1 md:flex-col md:overflow-visible"
      >
        <nav aria-label="Menu principal" class="space-y-1">
          @for (item of itensMenu(); track item.caminho) {
            <a
              [routerLink]="item.caminho"
              (click)="fecharMenu(botaoMenu)"
              routerLinkActive="bg-white/15"
              [routerLinkActiveOptions]="{ exact: true }"
              ariaCurrentWhenActive="page"
              class="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold
                     hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2
                     focus-visible:outline-white"
            >
              {{ item.titulo }}
            </a>
          }
        </nav>

        <div class="pt-4 md:mt-auto">
          <div class="rounded-2xl border border-white/25 p-3">
            <div class="flex items-center gap-3">
              <span
                aria-hidden="true"
                class="grid size-10 shrink-0 place-items-center rounded-full
                       bg-creche-pessego text-sm font-bold text-creche-verde"
              >
                {{ iniciais() }}
              </span>
              <div class="min-w-0">
                <p class="wrap-anywhere text-sm font-semibold">{{ usuario()?.nome || 'Usuário' }}</p>
                <p class="mt-1 text-xs text-white/80">{{ nomePerfil() }}</p>
              </div>
            </div>

            <button
              type="button"
              (click)="sair.emit()"
              [disabled]="saindo()"
              class="mt-3 min-h-11 w-full rounded-xl border border-white/40 px-3 py-2 text-sm
                     hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2
                     focus-visible:outline-white disabled:opacity-60"
            >
              {{ saindo() ? 'Saindo…' : 'Sair da conta' }}
            </button>
          </div>
        </div>
      </div>
    </aside>
  `,
})
export class Sidebar {
  readonly usuario = input<UsuarioLogado | null>(null);
  readonly saindo = input(false);
  readonly sair = output<void>();
  readonly menuAberto = signal(false);

  readonly nomePerfil = computed(() => {
    const nomes: Record<Perfil, string> = {
      DIRECAO: 'Direção',
      PROFESSOR: 'Professor(a)',
      RESPONSAVEL: 'Pais e responsáveis',
    };

    const perfil = this.usuario()?.perfil;
    return perfil ? nomes[perfil] : 'Portal';
  });

  readonly iniciais = computed(() => {
    const partes = (this.usuario()?.nome ?? '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return 'CC';

    const primeira = partes[0].charAt(0);
    const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return `${primeira}${ultima}`.toUpperCase();
  });

  readonly itensMenu = computed<ItemMenu[]>(() => {
    const perfil = this.usuario()?.perfil;
    const tituloInicio: Record<Perfil, string> = {
      DIRECAO: 'Painel Geral',
      PROFESSOR: 'Minha Turma',
      RESPONSAVEL: 'Início',
    };

    const itens: ItemMenu[] = [
      { titulo: perfil ? tituloInicio[perfil] : 'Início', caminho: '/home' },
    ];

    if (perfil) {
      itens.push(
        { titulo: 'Comunicados', caminho: '/comunicados' },
        { titulo: 'Conversas', caminho: '/conversas' },
      );
    }

    if (perfil === 'DIRECAO') {
      itens.push(
        { titulo: 'Alunos', caminho: '/alunos' },
        { titulo: 'Turmas', caminho: '/turmas' },
        { titulo: 'Professores', caminho: '/professores' },
        { titulo: 'Equipe de Direção', caminho: '/direcao' },
        { titulo: 'Termos e LGPD', caminho: '/termos' },
        { titulo: 'Solicitação de materiais', caminho: '/solicitacoes-materiais' },
        { titulo: 'Auditoria', caminho: '/auditoria' },
      );
    }

    if (perfil === 'PROFESSOR') {
      itens.push(
        { titulo: 'Chamada do dia', caminho: '/chamada' },
        { titulo: 'Diário de rotina', caminho: '/diario' },
        { titulo: 'Observações', caminho: '/observacoes' },
        { titulo: 'Atividades', caminho: '/atividades' },
        { titulo: 'Mala Virtual', caminho: '/mala-virtual' },
        { titulo: 'Solicitação de materiais', caminho: '/solicitacoes-materiais' },
      );
    }

    if (perfil === 'RESPONSAVEL') {
      itens.push(
        { titulo: 'Atividades', caminho: '/familia/atividades' },
        { titulo: 'Mala Virtual', caminho: '/familia/mala-virtual' },
        { titulo: 'Informações relevantes', caminho: '/informacoes' },
        { titulo: 'Observações', caminho: '/familia/observacoes' },
      );
    }

    itens.push({ titulo: 'Termos e privacidade', caminho: '/informacoes/termos' });
    return itens;
  });

  alternarMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
  }

  fecharMenu(botao: HTMLButtonElement): void {
    if (!this.menuAberto()) return;

    this.menuAberto.set(false);
    if (botao.getClientRects().length) botao.focus();
  }
}
