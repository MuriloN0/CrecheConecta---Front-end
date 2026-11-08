import { Component, input, output } from '@angular/core';

import { DialogoModalDirective } from '../../../mala-virtual/components/dialogo-modal.directive';
import { SolicitacaoMaterial } from '../../model/solicitacao-material.model';

@Component({
  selector: 'app-modal-cancelar-solicitacao',
  standalone: true,
  imports: [DialogoModalDirective],
  templateUrl: './modal-cancelar-solicitacao.component.html',
})
export class ModalCancelarSolicitacaoComponent {
  readonly solicitacao = input.required<SolicitacaoMaterial>();
  readonly cancelando = input(false);
  readonly erro = input('');

  readonly confirmar = output<void>();
  readonly fechar = output<void>();
}
