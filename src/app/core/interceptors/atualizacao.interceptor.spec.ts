import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, Router } from '@angular/router';
import { firstValueFrom, Subject } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { atualizacaoInterceptor } from './atualizacao.interceptor';

describe('Controle compartilhado de atualizações', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let sessao: number;
  let token: string;
  let navegacao: Subject<unknown>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T12:00:00Z'));

    sessao = 1;
    token = 'token-a';
    navegacao = new Subject();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([
            atualizacaoInterceptor,
            authInterceptor,
          ]),
        ),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            obterToken: () => token,
            identificarSessao: () => sessao,
            aguardarRenovacao: () => Promise.resolve(token),
          },
        },
        {
          provide: Router,
          useValue: {
            events: navegacao,
            url: '/direcao',
            navigateByUrl: vi.fn().mockResolvedValue(true),
          },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  async function consultar(
    url: string,
    corpo: object = {},
  ) {
    const resposta = firstValueFrom(http.get(url));

    await Promise.resolve();
    backend.expectOne(url).flush(corpo);

    return resposta;
  }

  async function aguardar(
    url: string,
    milissegundos = 10_000,
    corpo: object = {},
  ) {
    const resposta = firstValueFrom(http.get(url));

    await Promise.resolve();
    backend.expectNone(url);

    vi.advanceTimersByTime(milissegundos - 1);
    await Promise.resolve();
    backend.expectNone(url);

    vi.advanceTimersByTime(1);
    await Promise.resolve();
    backend.expectOne(url).flush(corpo);

    return resposta;
  }

  it.each([
    '/api/direcao/me',
    '/api/direcao?pagina=0&tamanho=20',
    '/api/alunos?pagina=0',
    '/api/turmas?pagina=0',
    '/api/professores?pagina=0',
    '/api/comunicados?pagina=0',
    '/api/atividades/turmas',
    '/api/turmas/turma/malas/paginadas?pagina=0',
    '/api/meus-filhos',
    '/api/meus-filhos/aluno/mala?pagina=0',
    '/api/meus-filhos/aluno/diario',
    '/api/meus-filhos/aluno/chamada',
    '/api/alunos/aluno/observacoes',
    '/api/alunos/aluno/informacoes-relevantes',
    '/api/notificacoes?pagina=0',
    '/api/termos/paginados?pagina=0',
    '/api/termo/status',
    '/api/solicitacoes-materiais?pagina=0',
    '/api/solicitacoes-materiais/id',
    '/api/turmas/id/malas/id/progresso',
    '/api/turmas/id/chamadas/2026-11-18',
    '/api/turmas/id/diarios/2026-11-18',
    '/api/turmas/id/matriculas?pagina=0',
    '/api/turmas/frequencia?inicio=2026-11-01&fim=2026-11-18',
  ])('não repete a consulta em dez segundos: %s', async (url) => {
    await consultar(url);
    await aguardar(url);
  });

  it('libera uma resposta nova depois do intervalo, sem reutilizar dados concluídos', async () => {
    const url = '/api/direcao/me';

    await consultar(url, { nome: 'Anterior' });

    vi.advanceTimersByTime(10_000);

    expect(
      await consultar(url, { nome: 'Atual' }),
    ).toEqual({ nome: 'Atual' });
  });

  it('compartilha apenas a requisição simultânea', async () => {
    const url = '/api/atividades/turmas';

    const a = firstValueFrom(http.get(url));
    const b = firstValueFrom(http.get(url));

    await Promise.resolve();
    backend.expectOne(url).flush([{ id: 'turma' }]);

    expect(await a).toEqual(await b);

    await aguardar(url);
  });

  it('permite mudar página e voltar para a anterior', async () => {
    await consultar('/api/alunos?pagina=0');
    await consultar('/api/alunos?pagina=1');
    await consultar('/api/alunos?pagina=0');

    await aguardar('/api/alunos?pagina=0');
  });

  it('ordem dos parâmetros não contorna a espera', async () => {
    await consultar('/api/alunos?pagina=0&tamanho=20');

    await aguardar('/api/alunos?tamanho=20&pagina=0');
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'uma escrita %s libera a releitura',
    async (metodo) => {
      await consultar('/api/alunos?pagina=0');

      const escrita = firstValueFrom(
        http.request(metodo, '/api/alunos'),
      );

      await Promise.resolve();
      backend.expectOne('/api/alunos').flush({});

      await escrita;

      await consultar('/api/alunos?pagina=0');
    },
  );

  it('uma nova navegação permite a carga inicial da tela', async () => {
    await consultar('/api/turmas?pagina=0');

    navegacao.next(new NavigationStart(1, '/turmas'));

    await consultar('/api/turmas?pagina=0');
  });

  it('uma nova sessão não herda a espera da anterior', async () => {
    await consultar('/api/direcao/me');

    sessao++;
    token = 'token-b';

    await consultar('/api/direcao/me');
  });

  it('respeita a espera maior enviada pelo backend', async () => {
    const url = '/api/direcao/me';

    const primeira = firstValueFrom(http.get(url))
      .catch((e: HttpErrorResponse) => e);

    await Promise.resolve();

    backend.expectOne(url).flush(
      {
        codigo: 'RATE_LIMIT_EXCEDIDO',
        segundosRestantes: 45,
      },
      {
        status: 429,
        statusText: 'Too Many Requests',
      },
    );

    await primeira;

    vi.advanceTimersByTime(11_000);

    await aguardar(url, 34_000);
  });

  it('cancela uma consulta na fila quando a sessão muda', async () => {
    const url = '/api/direcao/me';

    await consultar(url);

    const fila = firstValueFrom(http.get(url))
      .catch((e: Error) => e);

    sessao++;
    token = 'outra-sessao';

    vi.advanceTimersByTime(10_000);

    const erro = await fila as Error;

    expect(erro.message).toContain('cancelada');
    backend.expectNone(url);
  });

  it('cancela uma consulta na fila ao sair da tela', async () => {
    const url = '/api/direcao/me';

    await consultar(url);

    const fila = firstValueFrom(http.get(url))
      .catch((e: Error) => e);

    navegacao.next(new NavigationStart(1, '/turmas'));

    vi.advanceTimersByTime(10_000);

    const erro = await fila as Error;

    expect(erro.message).toContain('cancelada');
    backend.expectNone(url);

    await consultar(url);
  });

  it('não interfere na renovação e repetição após 401', async () => {
    const url = '/api/alunos';
    const resposta = firstValueFrom(http.get(url));

    await Promise.resolve();

    const primeiro = backend.expectOne(url);

    token = 'token-renovado';

    primeiro.flush(
      { codigo: 'NAO_AUTENTICADO' },
      {
        status: 401,
        statusText: 'Unauthorized',
      },
    );

    await Promise.resolve();
    await Promise.resolve();

    const repetido = backend.expectOne(url);

    expect(
      repetido.request.headers.get('Authorization'),
    ).toBe('Bearer token-renovado');

    repetido.flush([]);

    expect(await resposta).toEqual([]);
  });

  it.each([
    '/api/chat/contatos',
    '/api/chat/contatos/id/mensagens',
    '/api/auth/me',
    '/api/meus-dados',
  ])('não altera chat, sessão ou exportação: %s', async (url) => {
    await consultar(url);
    await consultar(url);
  });

  it('cabeçalhos equivalentes usam a mesma espera', async () => {
    const url = '/api/alunos';

    const a = firstValueFrom(http.get(url, {
      headers: new HttpHeaders({
        turmaUUID: 'turma',
      }),
    }));

    await Promise.resolve();
    backend.expectOne(url).flush([]);

    await a;

    const b = firstValueFrom(http.get(url, {
      headers: new HttpHeaders({
        TURMAUUID: 'turma',
      }),
    }));

    await Promise.resolve();
    backend.expectNone(url);

    vi.advanceTimersByTime(10_000);
    await Promise.resolve();

    backend.expectOne(url).flush([]);

    await b;
  });
});
