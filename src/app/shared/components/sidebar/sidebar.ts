import { Component, computed, input, output } from '@angular/core';
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
    <aside class="flex h-full flex-col bg-creche-verde p-4 text-white md:min-h-dvh">
      <a routerLink="/home"
        class="flex items-center gap-3 rounded-xl px-2 py-3
               focus-visible:outline-2 focus-visible:outline-offset-4
               focus-visible:outline-white">
        <span aria-hidden="true"
          class="flex h-10 w-10 shrink-0 items-center justify-center
                 rounded-full bg-[#c96843] text-xl">
          ♥
        </span>
        <span class="min-w-0">
          <span class="block text-lg font-bold">CrecheConecta</span>
          <span class="block text-xs text-white/75">{{ nomePerfil() }}</span>
        </span>
      </a>

      <p class="mb-3 mt-7 px-3 text-xs font-semibold uppercase tracking-wider text-white/65">
        Menu
      </p>

      <nav aria-label="Menu principal" class="space-y-2">
        @for (item of itensMenu(); track item.caminho) {
          <a [routerLink]="item.caminho" routerLinkActive="bg-white/15"
            [routerLinkActiveOptions]="{ exact: true }" ariaCurrentWhenActive="page"
            class="block rounded-full px-4 py-3 text-sm font-semibold
                   transition-colors hover:bg-white/10 focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-white">
            {{ item.titulo }}
          </a>
        }
      </nav>

      <div class="mt-7 rounded-2xl border border-white/20 p-3 md:mt-auto">
        <div class="flex items-center gap-3">
          <span aria-hidden="true"
            class="flex h-10 w-10 shrink-0 items-center justify-center
                   rounded-full bg-[#c96843] text-sm font-bold">
            {{ iniciais() }}
          </span>
          <div class="min-w-0">
            <p class="wrap-break-word text-sm font-semibold">
              {{ usuario()?.nome || 'Usuário' }}
            </p>
            <p class="mt-1 text-xs text-white/75">{{ nomePerfil() }}</p>
          </div>
        </div>

        <button type="button" (click)="sair.emit()" [disabled]="saindo()"
          class="mt-4 w-full cursor-pointer rounded-xl border border-white/30
                 px-3 py-2 text-sm hover:bg-white/10 focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-white
                 disabled:cursor-wait disabled:opacity-60">
          {{ saindo() ? 'Saindo…' : 'Sair da conta' }}
        </button>
      </div>
    </aside>
  `,
})
export class Sidebar {
  readonly usuario = input<UsuarioLogado | null>(null);
  readonly saindo = input(false);
  readonly sair = output<void>();

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

    if (perfil === 'DIRECAO') {
      itens.push(
        { titulo: 'Alunos', caminho: '/alunos' },
        { titulo: 'Turmas', caminho: '/turmas' },
        { titulo: 'Professores', caminho: '/professores' },
        { titulo: 'Equipe de Direção', caminho: '/direcao' },
      );
    }

    if (perfil === 'PROFESSOR') {
      itens.push({ titulo: 'Atividades', caminho: '/atividades' });
    }

    itens.push({ titulo: 'Termos e privacidade', caminho: '/informacoes/termos' });
    return itens;
  });
}
