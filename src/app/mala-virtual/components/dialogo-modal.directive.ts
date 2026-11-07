import {
  AfterViewInit,
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
} from '@angular/core';

@Directive({
  selector: 'dialog[appDialogoModal]',
  standalone: true,
  host: {
    '(cancel)': 'aoCancelar($event)',
  },
})
export class DialogoModalDirective implements AfterViewInit, OnDestroy {
  private readonly elemento = inject<ElementRef<HTMLDialogElement>>(ElementRef);

  readonly bloqueado = input(false);
  readonly fecharDialogo = output<void>();

  ngAfterViewInit(): void {
    const dialogo = this.elemento.nativeElement;

    if (typeof dialogo.showModal === 'function') {
      if (!dialogo.open) dialogo.showModal();
    } else {
      dialogo.setAttribute('open', '');
    }
  }

  ngOnDestroy(): void {
    const dialogo = this.elemento.nativeElement;

    if (dialogo.open && typeof dialogo.close === 'function') {
      dialogo.close();
    }
  }

  aoCancelar(evento: Event): void {
    evento.preventDefault();

    if (!this.bloqueado()) {
      this.fecharDialogo.emit();
    }
  }
}
