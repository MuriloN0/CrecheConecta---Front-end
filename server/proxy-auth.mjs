import { isIP } from 'node:net';

const ACOES = new Set([
  'login',
  'confirmar-login',
  'esqueci-senha',
  'confirmar-recuperacao',
  'redefinir-senha',
]);

const MAXIMO_CORPO = 8192;

function erro(status, codigo, detail, headers = {}) {
  return Response.json(
    { status, codigo, detail },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...headers,
      },
    },
  );
}

function indisponivel() {
  return erro(
    503,
    'LOGIN_INDISPONIVEL',
    'Não foi possível conectar ao serviço de login.',
  );
}

async function lerCorpo(request) {
  if (!request.body) return new Uint8Array();

  const leitor = request.body.getReader();
  const partes = [];
  let tamanho = 0;

  try {
    for (;;) {
      const { value, done } = await leitor.read();

      if (done) break;

      tamanho += value.byteLength;

      if (tamanho > MAXIMO_CORPO) {
        await leitor.cancel();
        return null;
      }

      partes.push(value);
    }
  } finally {
    leitor.releaseLock();
  }

  const corpo = new Uint8Array(tamanho);
  let posicao = 0;

  for (const parte of partes) {
    corpo.set(parte, posicao);
    posicao += parte.byteLength;
  }

  return corpo;
}

export function criarProxyAuth(acao) {
  if (!ACOES.has(acao)) {
    throw new Error('Ação de autenticação inválida.');
  }

  return {
    async fetch(request) {
      if (request.method !== 'POST') {
        return erro(
          405,
          'METODO_INVALIDO',
          'Método não permitido.',
          { Allow: 'POST' },
        );
      }

      const origem = process.env.LOGIN_API_ORIGIN;
      const segredo = process.env.LOGIN_PROXY_SECRET;
      const ip = request.headers.get('x-vercel-forwarded-for');

      if (
        process.env.VERCEL !== '1' ||
        !origem ||
        !segredo ||
        !/^[0-9a-fA-F]{64}$/.test(segredo) ||
        !ip ||
        isIP(ip) === 0
      ) {
        return indisponivel();
      }

      try {
        const url = new URL('/api/auth/' + acao, origem);

        if (
          url.protocol !== 'https:' ||
          url.username ||
          url.password
        ) {
          return indisponivel();
        }

        const corpo = await lerCorpo(request);

        if (corpo === null) {
          return erro(
            413,
            'CORPO_MUITO_GRANDE',
            'A requisição excede o tamanho permitido.',
          );
        }

        const headers = new Headers({
          'Content-Type':
            request.headers.get('Content-Type') ?? 'application/json',
          'X-CrecheConecta-Login-Proxy': segredo,
          'X-CrecheConecta-Client-IP': ip,
        });

        for (const nome of ['Cookie', 'X-CrecheConecta-Refresh']) {
          const valor = request.headers.get(nome);

          if (valor) headers.set(nome, valor);
        }

        const resposta = await fetch(url, {
          method: 'POST',
          headers,
          body: corpo,
          redirect: 'error',
          signal: AbortSignal.timeout(60_000),
        });

        const retorno = new Headers({
          'Cache-Control': 'no-store',
        });

        for (const nome of ['Content-Type', 'Retry-After']) {
          const valor = resposta.headers.get(nome);

          if (valor) retorno.set(nome, valor);
        }

        for (const cookie of resposta.headers.getSetCookie()) {
          retorno.append('Set-Cookie', cookie);
        }

        return new Response(resposta.body, {
          status: resposta.status,
          headers: retorno,
        });
      } catch {
        return indisponivel();
      }
    },
  };
}
