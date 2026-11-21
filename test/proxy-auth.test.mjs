import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { criarProxyAuth } from '../server/proxy-auth.mjs';

const original = { ...process.env };
let fetchOriginal;

beforeEach(() => {
  process.env.VERCEL = '1';
  process.env.LOGIN_API_ORIGIN = 'https://backend.example.invalid';
  process.env.LOGIN_PROXY_SECRET = 'a'.repeat(64);
  fetchOriginal = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;

  for (const nome of [
    'VERCEL',
    'LOGIN_API_ORIGIN',
    'LOGIN_PROXY_SECRET',
  ]) {
    if (original[nome] === undefined) {
      delete process.env[nome];
    } else {
      process.env[nome] = original[nome];
    }
  }
});

function pedido(headers = {}, body = '{}') {
  return new Request(
    'https://site.example.invalid/api/auth/login',
    {
      method: 'POST',
      headers: {
        'x-vercel-forwarded-for': '203.0.113.10',
        ...headers,
      },
      body,
    },
  );
}

test('sobrescreve IP e segredo do visitante e não encaminha X-Forwarded-For', async () => {
  let recebido;

  globalThis.fetch = async (url, opcoes) => {
    recebido = { url: String(url), opcoes };
    return Response.json({ ok: true });
  };

  const resposta = await criarProxyAuth('login').fetch(pedido({
    'X-CrecheConecta-Client-IP': '198.51.100.20',
    'X-CrecheConecta-Login-Proxy': 'forjado',
    'X-Forwarded-For': '198.51.100.21',
  }));

  assert.equal(resposta.status, 200);

  assert.equal(
    recebido.url,
    'https://backend.example.invalid/api/auth/login',
  );

  assert.equal(
    recebido.opcoes.headers.get('X-CrecheConecta-Client-IP'),
    '203.0.113.10',
  );

  assert.equal(
    recebido.opcoes.headers.get('X-CrecheConecta-Login-Proxy'),
    'a'.repeat(64),
  );

  assert.equal(
    recebido.opcoes.headers.has('X-Forwarded-For'),
    false,
  );

  assert.equal(recebido.opcoes.redirect, 'error');
});

test('preserva cookies, sinal de renovação, múltiplos Set-Cookie e Retry-After', async () => {
  globalThis.fetch = async (url, opcoes) => {
    assert.equal(
      opcoes.headers.get('Cookie'),
      'crecheconecta_sessao=teste',
    );

    assert.equal(
      opcoes.headers.get('X-CrecheConecta-Refresh'),
      '1',
    );

    const headers = new Headers({ 'Retry-After': '37' });

    headers.append(
      'Set-Cookie',
      'crecheconecta_sessao=novo; Path=/api/auth; HttpOnly; Secure',
    );

    headers.append(
      'Set-Cookie',
      'crecheconecta_refresh=; Path=/api/auth/refresh; Max-Age=0',
    );

    return new Response('{}', { status: 429, headers });
  };

  const resposta = await criarProxyAuth('confirmar-login').fetch(pedido({
    Cookie: 'crecheconecta_sessao=teste',
    'X-CrecheConecta-Refresh': '1',
  }));

  assert.equal(resposta.status, 429);
  assert.equal(resposta.headers.get('Retry-After'), '37');
  assert.equal(resposta.headers.getSetCookie().length, 2);
});

test('recusa IP ausente, lista ou valor inválido sem chamar backend', async () => {
  globalThis.fetch = async () => {
    assert.fail('Não deveria chamar o backend.');
  };

  for (const ip of [
    '',
    '203.0.113.10,198.51.100.20',
    'example.invalid',
  ]) {
    const resposta = await criarProxyAuth('login').fetch(
      pedido({ 'x-vercel-forwarded-for': ip }),
    );

    assert.equal(resposta.status, 503);
  }
});

test('recusa ambiente sem Vercel, origem HTTP e segredo inválido', async () => {
  globalThis.fetch = async () => {
    assert.fail('Não deveria chamar o backend.');
  };

  delete process.env.VERCEL;

  assert.equal(
    (await criarProxyAuth('login').fetch(pedido())).status,
    503,
  );

  process.env.VERCEL = '1';
  process.env.LOGIN_API_ORIGIN = 'http://backend.example.invalid';

  assert.equal(
    (await criarProxyAuth('login').fetch(pedido())).status,
    503,
  );

  process.env.LOGIN_API_ORIGIN = 'https://backend.example.invalid';
  process.env.LOGIN_PROXY_SECRET = 'invalido';

  assert.equal(
    (await criarProxyAuth('login').fetch(pedido())).status,
    503,
  );
});

test('rejeita corpo excessivo e método inválido antes de acessar backend', async () => {
  globalThis.fetch = async () => {
    assert.fail('Não deveria chamar o backend.');
  };

  assert.equal(
    (await criarProxyAuth('login').fetch(
      pedido({}, 'x'.repeat(8193)),
    )).status,
    413,
  );

  const get = new Request(
    'https://site.example.invalid/api/auth/login',
  );

  assert.equal(
    (await criarProxyAuth('login').fetch(get)).status,
    405,
  );
});

test('não permite escolher uma rota arbitrária e usa destino fixo por função', async () => {
  assert.throws(() => criarProxyAuth('../admin'));

  for (const acao of [
    'login',
    'confirmar-login',
    'esqueci-senha',
    'confirmar-recuperacao',
    'redefinir-senha',
  ]) {
    globalThis.fetch = async url => {
      assert.equal(
        String(url),
        'https://backend.example.invalid/api/auth/' + acao,
      );

      return new Response('{}');
    };

    const { default: proxy } = await import(
      '../api/auth/' + acao + '.mjs'
    );

    assert.equal((await proxy.fetch(pedido())).status, 200);
  }
});

test('falha de rede vira 503 sem expor erro interno ou segredo', async () => {
  globalThis.fetch = async () => {
    throw new Error('detalhe interno');
  };

  const resposta = await criarProxyAuth('login').fetch(pedido());

  assert.equal(resposta.status, 503);
  assert.equal(
    (await resposta.json()).codigo,
    'LOGIN_INDISPONIVEL',
  );
});

test('rewrites deixam as cinco funções locais e mantêm o encaminhamento das demais APIs', async () => {
  const { readFile } = await import('node:fs/promises');

  const config = JSON.parse(
    await readFile(
      new URL('../vercel.json', import.meta.url),
      'utf8',
    ),
  );

  const regra = new RegExp(
    '^'
      + config.rewrites[0].source.replace('/api/:path', '/api/')
      + '$',
  );

  for (const acao of [
    'login',
    'confirmar-login',
    'esqueci-senha',
    'confirmar-recuperacao',
    'redefinir-senha',
  ]) {
    assert.equal(regra.test('/api/auth/' + acao), false);
  }

  for (const caminho of [
    '/api/auth/refresh',
    '/api/chat/contatos',
    '/api/auth/login-extra',
  ]) {
    assert.equal(regra.test(caminho), true);
  }
});
