import { Component, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DialogoModalDirective } from '../../../mala-virtual/components/dialogo-modal.directive';
import { SolicitacaoMaterial } from '../../model/solicitacao-material.model';

const MAX_MOTIVO = 2000;

@Component({
  selector: 'app-modal-recusar-solicitacao',
  standalone: true,
  imports: [FormsModule, DialogoModalDirective],
  templateUrl: './modal-recusar-solicitacao.component.html',
})
export class ModalRecusarSolicitacaoComponent {
  readonly solicitacao = input.required<SolicitacaoMaterial>();
  readonly salvando = input(false);
  readonly erro = input('');
  readonly camposServidor = input<string[]>([]);

  readonly confirmar = output<string>();
  readonly fechar = output<void>();


  readonly maxMotivo = MAX_MOTIVO;

  readonly tentouEnviar = signal(false);
  readonly camposDoServidor = linkedSignal(() => this.camposServidor());

  motivo = '';


  erroMotivo(): string | null {
    const motivo = this.motivo.trim();

    if (this.tentouEnviar() && !motivo) {
      return 'Informe o motivo da recusa.';
    }

    if (motivo.length > MAX_MOTIVO) {
      return `Use no máximo ${MAX_MOTIVO} caracteres.`;
    }

    if (this.camposDoServidor().includes('motivo')) {
      return 'Confira o motivo.';
    }

    return null;
  }

  enviar(): void {
    if (this.salvando()) {
      return;
    }

    this.tentouEnviar.set(true);

    if (this.erroMotivo()) {
      setTimeout(() => document.getElementById('motivo-recusa')?.focus());
      return;
    }

    this.confirmar.emit(this.motivo.trim());
  }
}
