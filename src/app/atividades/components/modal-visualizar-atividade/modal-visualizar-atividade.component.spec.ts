/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { ModalVisualizarAtividadeComponent } from './modal-visualizar-atividade.component';

describe('ModalVisualizarAtividadeComponent', () => {
  let component: ModalVisualizarAtividadeComponent;
  let fixture: ComponentFixture<ModalVisualizarAtividadeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ModalVisualizarAtividadeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalVisualizarAtividadeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
