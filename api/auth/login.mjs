function indisponivel() {
  return Response.json(
    {
      status: 503,
      codigo: 'LOGIN_INDISPONIVEL',
      detail: 'Não foi possível conectar ao serviço de login.',
    },
    {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response(null, {
        status: 405,
        headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
      });
    }

    const origem = process.env.LOGIN_API_ORIGIN;
    const segredo = process.env.LOGIN_PROXY_SECRET;

    if (!origem || !segredo || !/^[0-9a-fA-F]{64}$/.test(segredo)) {
      return indisponivel();
    }

    try {
      const url = new URL('/api/auth/login', origem);
      if (url.protocol !== 'https:') {
        return indisponivel();
      }

      const resposta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
          'X-CrecheConecta-Login-Proxy': segredo,
        },
        body: await request.arrayBuffer(),
        redirect: 'error',
      });

      const headers = new Headers({ 'Cache-Control': 'no-store' });

      for (const nome of ['Content-Type', 'Retry-After']) {
        const valor = resposta.headers.get(nome);
        if (valor) headers.set(nome, valor);
      }

      return new Response(resposta.body, {
        status: resposta.status,
        headers,
      });
    } catch {
      return indisponivel();
    }
  },
};
