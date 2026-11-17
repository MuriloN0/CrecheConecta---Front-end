import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

const DURACAO_AVISO_MS = 5_000;

const SELETOR_AVISO_TEMPORARIO = [
  '[role="status"].bg-green-50',
  '[role="alert"].bg-red-50',
  'app-conversas form [role="alert"]',
].join(', ');

const SELETOR_COM_TEMPORIZADOR_PROPRIO = [
  'app-cadastro-responsavel',
  'app-meu-perfil',
].join(', ');

interface AvisoRenderizado {
  texto: string;
  temporizador: ReturnType<typeof setTimeout>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  encapsulation: ViewEncapsulation.None,
  styles: `
    app-root [data-aviso-expirado] {
      display: none !important;
    }
  `,
})
export class App {
  private readonly raiz = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroy = inject(DestroyRef);
  private readonly avisos = new Map<HTMLElement, AvisoRenderizado>();

  constructor() {
    afterNextRender(() => {
      const observador = new MutationObserver(() => this.atualizarAvisos());

      observador.observe(this.raiz, {
        childList: true,
        characterData: true,
        subtree: true,
      });

      this.destroy.onDestroy(() => {
        observador.disconnect();
        for (const aviso of this.avisos.values()) {
          clearTimeout(aviso.temporizador);
        }
        this.avisos.clear();
      });

      this.atualizarAvisos();
    });
  }

  private atualizarAvisos(): void {
    const visiveis = new Set<HTMLElement>();

    for (const elemento of this.raiz.querySelectorAll<HTMLElement>(SELETOR_AVISO_TEMPORARIO)) {
      const texto = elemento.textContent?.trim() ?? '';
      if (!texto || !this.deveExpirar(elemento, texto)) continue;

      visiveis.add(elemento);

      const anterior = this.avisos.get(elemento);
      if (anterior?.texto === texto) continue;

      if (anterior) clearTimeout(anterior.temporizador);
      elemento.removeAttribute('data-aviso-expirado');

      const temporizador = setTimeout(() => {
        if (this.raiz.contains(elemento)) {
          elemento.setAttribute('data-aviso-expirado', '');
        }
      }, DURACAO_AVISO_MS);

      this.avisos.set(elemento, { texto, temporizador });
    }

    for (const [elemento, aviso] of this.avisos) {
      if (visiveis.has(elemento)) continue;

      clearTimeout(aviso.temporizador);
      elemento.removeAttribute('data-aviso-expirado');
      this.avisos.delete(elemento);
    }
  }

  private deveExpirar(elemento: HTMLElement, texto: string): boolean {
    if (
      elemento.closest(SELETOR_COM_TEMPORIZADOR_PROPRIO) ||
      elemento.querySelector('button, a[href], input, select, textarea')
    ) {
      return false;
    }

    if (elemento.getAttribute('role') !== 'alert') {
      return true;
    }

    if (elemento.closest('app-portal-pais, app-termos-leitura')) {
      return false;
    }

    const cadastroComConvite = elemento.closest('app-cadastro-direcao, app-cadastro-professor');
    if (cadastroComConvite && !cadastroComConvite.querySelector('form')) {
      return false;
    }

    if (elemento.closest('app-login, app-recuperacao')) {
      return !/expirou|temporariamente bloquead[oa]|limite de tentativas/i.test(texto);
    }

    return true;
  }
}
