# CrecheConecta — Front-end

Interface web do CrecheConecta, plataforma que centraliza a comunicação entre famílias, professores e direção de creches. O projeto é um Trabalho de Conclusão de Curso de Engenharia de Software da Universidade de Mogi das Cruzes (UMC).

[Repositório do back-end](https://github.com/MuriloN0/CrecheConecta---Back-end) · [Protótipo no Figma](https://www.figma.com/design/KpZCwft1zKf3d66lCBqvcS/CrecheConecta?node-id=0-1)

## Funcionalidades

| Perfil | Recursos |
| --- | --- |
| Direção | Gerenciamento de alunos, professores, turmas e vínculos, comunicados, solicitações de materiais, termos e auditoria. |
| Professor | Chamada, diário de rotina, atividades do dia e para casa, Mala Virtual, observações dos alunos e solicitações de materiais. |
| Responsável | Acompanhamento da criança, frequência, diário, atividades, Mala Virtual, observações, comunicados e acesso aos dados pelo Meu perfil. |

A interface oferece login com código por e-mail, recuperação de senha, notificações e conversas entre usuários autorizados. A tela de conversas consulta a API REST periodicamente para exibir novas mensagens. Cada participante pode favoritar mensagens. As mensagens sem favorito expiram sete dias após o envio.

Listagens de atividades e da Mala Virtual exibem até cinco registros por página. Os seletores de alunos e professores em Turmas e o seletor de alunos em Observações oferecem busca pelo nome e até cinco opções por página. O formulário de cadastro por convite usa a faixa de nascimento enviada pela API e informa a idade mínima de quatro meses completos.

No portal do responsável, **Meu perfil → Privacidade dos dados** reúne o download em JSON e o link para solicitar anonimização por e-mail.

## Tecnologias

- Angular 21, TypeScript e RxJS.
- Tailwind CSS 4.
- API REST com JSON e rotas de portal por perfil.
- Vitest para testes do front-end.

## Executar localmente

Use Git, Node.js 22.12 ou posterior da série 22 e npm. O projeto declara npm 11.13.0 no `package.json`. Inicie o back-end do CrecheConecta para acessar os módulos que dependem da API.

```bash
git clone https://github.com/MuriloN0/CrecheConecta---Front-end.git
cd CrecheConecta---Front-end
npm ci
npm start
```

Abra [http://localhost:4200](http://localhost:4200). O servidor de desenvolvimento recompila ao salvar. Use `Ctrl+C` para encerrar.

O Angular encaminha `/api/**` para `http://localhost:8080` pelo [proxy.config.json](proxy.config.json). Se o back-end estiver em outra porta, ajuste `target` nesse arquivo e reinicie o servidor Angular. Para entrar, use uma conta ativa do ambiente de teste e um endereço que receba o código de verificação.

## Build e testes

```bash
npm run build
npm run build -- --configuration development
npm test -- --watch=false
```

O primeiro comando gera o build de produção. A versão para hospedagem estática fica em `dist/crecheconecta/browser`. A configuração de desenvolvimento é útil para compilar localmente. Para executar testes em modo interativo, use `npm test`.

O GitHub Actions usa Node 22, instala as dependências com `npm ci` e gera o build de produção em pushes para `main` e `develop` e em pull requests direcionados a essas branches.

## Hospedagem

O [vercel.json](vercel.json) define os rewrites da aplicação e o destino da API hospedada. O POST de login é encaminhado pela função [api/auth/login.mjs](api/auth/login.mjs). Para usar essa configuração na Vercel, defina `LOGIN_API_ORIGIN` com a origem HTTPS do back-end e `LOGIN_PROXY_SECRET` com o segredo compartilhado de 64 caracteres hexadecimais. Cadastre o segredo nas variáveis da função, fora do código do navegador.

## Organização das branches

- `main` mantém a versão estável.
- `develop` concentra a integração das mudanças.

## Equipe

- Gabriel Belim Longhi
- Iago Lucas Fernandes de Faria
- Murilo Novaes de Oliveira

Universidade de Mogi das Cruzes (UMC) · Engenharia de Software · 2026
