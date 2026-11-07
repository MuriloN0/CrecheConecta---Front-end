import { Component, input, linkedSignal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DialogoModalDirective } from '../../../mala-virtual/components/dialogo-modal.directive';
import { SolicitacaoMaterial } from '../../model/solicitacao-material.model';

const MAX_MENSAGEM = 2000;

@Component({
  selector: 'app-modal-atender-solicitacao',
  standalone: true,
  imports: [FormsModule, DialogoModalDirective],
  templateUrl: './modal-atender-solicitacao.component.html',
})
export class ModalAtenderSolicitacaoComponent {
  readonly solicitacao = input.required<SolicitacaoMaterial>();
  readonly salvando = input(false);
  readonly erro = input('');
  readonly camposServidor = input<string[]>([]);

  readonly confirmar = output<string | null>();
  readonly fechar = output<void>();


  readonly maxMensagem = MAX_MENSAGEM;

  readonly camposDoServidor = linkedSignal(() => this.camposServidor());

  mensagem = '';


  erroMensagem(): string | null {
    if (this.mensagem.trim().length > MAX_MENSAGEM) {
      return `Use no máximo ${MAX_MENSAGEM} caracteres.`;
    }

    if (this.camposDoServidor().includes('mensagem')) {
      return 'Confira a mensagem.';
    }

    return null;
  }

  enviar(): void {
    if (this.salvando() || this.erroMensagem()) {
      return;
    }

    const mensagem = this.mensagem.trim();

    this.confirmar.emit(mensagem || null);
  }
}
