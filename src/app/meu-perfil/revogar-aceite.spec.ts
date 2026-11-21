import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { RevogarAceite } from './revogar-aceite';
import { MeuPerfil } from './meu-perfil';
import { AuthService } from '../core/services/auth.service';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';

describe('Revogacao do aceite', () => {
  let componente: RevogarAceite;
  let http: { post: ReturnType<typeof vi.fn> };
  let revogado: () => void;
  let auth: { limparSessao: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    http = { post: vi.fn() };
    auth = { limparSessao: vi.fn() };
    router = { navigateByUrl: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });

    const fixture = TestBed.createComponent(RevogarAceite);
    componente = fixture.componentInstance;
    revogado = vi.fn(() => {});
    componente.revogado.subscribe(() => revogado());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('exige confirmacao antes de chamar a API', async () => {
    await componente.confirmar();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('encerra a sessao local e volta ao login pelo componente de perfil', async () => {
    const perfil = TestBed.createComponent(MeuPerfil);

    perfil.componentInstance.dados.set({
      nome: 'Responsavel de teste',
      email: 'teste@example.test',
      telefone: null,
      perfil: 'RESPONSAVEL',
    });

    perfil.detectChanges();
    await perfil.whenStable();

    const dialogo = perfil.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialogo.close = vi.fn();

    const botao = perfil.debugElement.query(By.directive(RevogarAceite))
      .componentInstance as RevogarAceite;

    http.post.mockReturnValue(of(null));
    botao.confirmando.set(true);

    await botao.confirmar();

    expect(dialogo.close).toHaveBeenCalled();
    expect(auth.limparSessao).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', {
      replaceUrl: true,
    });
  });

  it('permite cancelar sem revogar', () => {
    componente.confirmando.set(true);
    componente.cancelar();

    expect(componente.confirmando()).toBe(false);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('sinaliza a saida somente apos sucesso da API', async () => {
    http.post.mockReturnValue(of(null));
    componente.confirmando.set(true);

    await componente.confirmar();

    expect(http.post).toHaveBeenCalledWith('/api/perfil/termos/revogar', null);
    expect(revogado).toHaveBeenCalledTimes(1);
  });

  it('mantem a tela e informa erro quando a API falha', async () => {
    http.post.mockReturnValue(
      throwError(() => new Error('Falha simulada')),
    );
    componente.confirmando.set(true);

    await componente.confirmar();

    expect(revogado).not.toHaveBeenCalled();
    expect(componente.erro()).not.toBe('');
    expect(componente.ocupada()).toBe(false);
  });

  it('evita envios duplicados enquanto aguarda a API', async () => {
    const resposta = new Subject<void>();
    http.post.mockReturnValue(resposta);
    componente.confirmando.set(true);

    const primeira = componente.confirmar();
    await componente.confirmar();

    expect(http.post).toHaveBeenCalledTimes(1);

    resposta.next();
    resposta.complete();

    await primeira;

    expect(revogado).toHaveBeenCalledTimes(1);
  });
});
