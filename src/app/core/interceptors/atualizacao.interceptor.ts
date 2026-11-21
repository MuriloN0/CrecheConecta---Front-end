import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import {
  catchError,
  defer,
  finalize,
  Observable,
  shareReplay,
  switchMap,
  throwError,
  timer,
} from 'rxjs';
import { AuthService } from '../services/auth.service';

interface PrazoConsulta {
  consulta: string;
  ate: number;
}

@Injectable({ providedIn: 'root' })
export class ControleAtualizacoes {
  private readonly prazos = new Map<string, PrazoConsulta>();
  private readonly pendentes =
    new Map<string, Observable<HttpEvent<unknown>>>();

  private sessao?: number;
  private versao = 0;

  constructor() {
    const router = inject(Router);
    const destroy = inject(DestroyRef);

    const navegacao = router.events.subscribe((evento) => {
      if (evento instanceof NavigationStart) {
        this.limpar(true);
      }
    });

    destroy.onDestroy(() => {
      navegacao.unsubscribe();
      this.limpar(true);
    });
  }

  limpar(cancelarFila = false): void {
    this.prazos.clear();
    this.pendentes.clear();

    if (cancelarFila) {
      this.versao++;
    }
  }

  executar(
    request: HttpRequest<unknown>,
    next: HttpHandlerFn,
    sessao: number,
    mesmaSessao: () => boolean,
  ): Observable<HttpEvent<unknown>> {
    if (this.sessao !== sessao) {
      this.limpar(true);
      this.sessao = sessao;
    }

    const url = new URL(
      request.urlWithParams,
      'http://local.invalid',
    );

    url.searchParams.sort();

    const cabecalhos = request.headers.keys()
      .map((nome) => nome.toLowerCase())
      .filter((nome) => nome !== 'authorization')
      .sort()
      .map((nome) => [
        nome,
        request.headers.getAll(nome),
      ]);

    const recurso = JSON.stringify([
      url.pathname,
      request.responseType,
      request.withCredentials,
      cabecalhos,
    ]);

    const consulta = url.searchParams.toString();
    const chave = recurso + '\n' + consulta;

    const pendente = this.pendentes.get(chave);

    if (pendente) {
      return pendente;
    }

    const agora = Date.now();

    for (const [nome, prazo] of this.prazos) {
      if (prazo.ate <= agora) {
        this.prazos.delete(nome);
      }
    }

    const anterior = this.prazos.get(recurso);

    const espera = anterior?.consulta === consulta
      ? Math.max(0, anterior.ate - agora)
      : 0;

    if (this.prazos.size >= 200) {
      const primeira = this.prazos.keys().next().value;

      if (primeira !== undefined) {
        this.prazos.delete(primeira);
      }
    }

    const prazo: PrazoConsulta = {
      consulta,
      ate: agora + espera + 10_000,
    };

    this.prazos.set(recurso, prazo);

    const versao = this.versao;

    const disparar = () => {
      if (versao !== this.versao || !mesmaSessao()) {
        return throwError(() => new Error(
          'Atualização cancelada porque a tela ou a sessão mudou.',
        ));
      }

      return next(request);
    };

    const origem = espera > 0
      ? timer(espera).pipe(switchMap(disparar))
      : defer(disparar);

    const fluxo = origem.pipe(
      catchError((erro: unknown) => {
        if (this.pendentes.get(chave) === fluxo) {
          this.pendentes.delete(chave);
        }

        if (
          this.prazos.get(recurso) === prazo &&
          erro instanceof HttpErrorResponse
        ) {
          if (erro.status === 401 || erro.status === 403) {
            this.prazos.delete(recurso);
          } else if (erro.status === 429) {
            const valor: unknown = erro.error?.segundosRestantes;
            const header = Number(
              erro.headers.get('Retry-After'),
            );

            const segundos =
              typeof valor === 'number' &&
              Number.isSafeInteger(valor) &&
              valor > 0
                ? valor
                : Number.isSafeInteger(header) && header > 0
                  ? header
                  : 60;

            prazo.ate = Math.max(
              prazo.ate,
              Date.now() + segundos * 1000,
            );
          }
        }

        return throwError(() => erro);
      }),
      finalize(() => {
        if (this.pendentes.get(chave) === fluxo) {
          this.pendentes.delete(chave);
        }
      }),
      shareReplay({
        bufferSize: 1,
        refCount: true,
      }),
    );

    this.pendentes.set(chave, fluxo);

    return fluxo;
  }
}

export const atualizacaoInterceptor: HttpInterceptorFn = (
  request,
  next,
) => {
  if (!request.url.startsWith('/api/')) {
    return next(request);
  }

  const controle = inject(ControleAtualizacoes);

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    controle.limpar();

    return next(request).pipe(
      finalize(() => controle.limpar()),
    );
  }

  if (
    request.method !== 'GET' ||
    request.reportProgress ||
    request.url.startsWith('/api/auth/') ||
    request.url.startsWith('/api/chat/') ||
    request.url.split('?')[0] === '/api/meus-dados'
  ) {
    return next(request);
  }

  const auth = inject(AuthService);

  if (!auth.obterToken()) {
    return next(request);
  }

  const sessao = auth.identificarSessao();

  return controle.executar(
    request,
    next,
    sessao,
    () => auth.identificarSessao() === sessao,
  );
};
