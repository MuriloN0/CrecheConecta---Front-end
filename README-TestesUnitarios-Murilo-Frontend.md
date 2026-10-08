## 1. Identificação
- **Aluno(s):** Murilo Novaes de Oliveira e RGM: 11231100551
- **Projeto (PFC):** CrecheConecta — Front-end
- **Branch:** feat/testes-automatizados

## 2. Resumo da entrega
Implementação de testes unitários do serviço de autenticação e das regras da tela de login em duas etapas.
Foram implementados 18 cenários executáveis, cobrindo sessão, expiração, chamadas ao serviço, validação de código, mensagens de erro e intervalo de reenvio.
Esta contribuição contempla somente login e autenticação; testes da feature de atividades não fazem parte desta entrega.

## 3. Cenários de testes unitários implementados
| # | Classe testada | Método / regra | Cenário | Tipo | Arquivo de teste | Método de teste |
|---|----------------|----------------|---------|------|------------------|-----------------|
| 1 | AuthService | iniciarLogin() | Solicitar código não cria sessão | Feliz | auth.service.spec.ts | deve solicitar código sem abrir uma sessão |
| 2 | AuthService | confirmarLogin() | Confirmação aceita armazena sessão | Feliz | auth.service.spec.ts | deve armazenar sessão quando a confirmação for aceita |
| 3 | AuthService | confirmarLogin() | Erro da API é propagado sem criar sessão | Violação | auth.service.spec.ts | deve propagar erro da API sem criar sessão |
| 4 | AuthService | confirmarLogin() | Expiração no instante atual é rejeitada | Limite | auth.service.spec.ts | deve rejeitar sessão com $cenario — expiração no instante atual |
| 5 | AuthService | confirmarLogin() | Data inválida é rejeitada | Violação | auth.service.spec.ts | deve rejeitar sessão com $cenario — data inválida |
| 6 | AuthService | Expiração da sessão | Sessão é limpa exatamente na expiração | Limite | auth.service.spec.ts | deve limpar sessão exatamente no instante de expiração |
| 7 | AuthService | carregarUsuario() | Consulta sem sessão gera erro sem chamar a API | Violação | auth.service.spec.ts | deve rejeitar consulta do usuário sem sessão e sem chamar a API |
| 8 | AuthService | carregarUsuario() | Consulta usa Bearer e atualiza usuário | Feliz | auth.service.spec.ts | deve carregar usuário com cabeçalho Bearer |
| 9 | Login | entrar() | E-mail é normalizado e a tela avança de etapa | Feliz | login.spec.ts | deve normalizar email e avançar para a etapa de código |
| 10 | Login | entrar() | Credenciais recusadas mostram erro e mantêm etapa inicial | Violação | login.spec.ts | deve mostrar erro de credenciais e permanecer na primeira etapa |
| 11 | Login | entrar() | Reenvio é permitido exatamente após 60 segundos | Limite | login.spec.ts | deve permitir reenvio exatamente após sessenta segundos |
| 12 | Login | confirmar() | Código válido confirma login e navega para home | Feliz | login.spec.ts | deve confirmar código e navegar para home |
| 13 | Login | confirmar() | Código vazio não chama o serviço | Limite | login.spec.ts | deve rejeitar código $cenario sem chamar o serviço — vazio |
| 14 | Login | confirmar() | Código com cinco dígitos não chama o serviço | Limite | login.spec.ts | deve rejeitar código $cenario sem chamar o serviço — com cinco dígitos |
| 15 | Login | confirmar() | Código com sete dígitos não chama o serviço | Limite | login.spec.ts | deve rejeitar código $cenario sem chamar o serviço — com sete dígitos |
| 16 | Login | confirmar() | Código com letras não chama o serviço | Violação | login.spec.ts | deve rejeitar código $cenario sem chamar o serviço — com letras |
| 17 | Login | confirmar() | Código é rejeitado no instante da expiração | Limite | login.spec.ts | deve rejeitar código no instante exato da expiração |
| 18 | Login | entrar() | Nova solicitação é impedida durante carregamento | Limite | login.spec.ts | deve impedir nova solicitação enquanto estiver carregando |

Tipo: Feliz | Violação | Limite
**Total de cenários unitários:** 18, incluindo as variantes parametrizadas.

## 4. Cenários de testes de integração implementados
| # | Camadas envolvidas | Cenário | Arquivo de teste | Método de teste | Recurso usado |
|---|--------------------|---------|------------------|-----------------|---------------|
| Não se aplica | Não se aplica | Integração fora do escopo desta primeira entrega | Não se aplica | Não se aplica | Não se aplica |

**Total de cenários de integração:** 0 nesta contribuição.

## 5. Arquivos de teste criados ou alterados
| Arquivo (caminho completo) | Criado / Alterado | Qtd. de testes |
|----------------------------|-------------------|----------------|
| src/app/core/services/auth.service.spec.ts | Criado | 8 |
| src/app/pages/auth/login/login.spec.ts | Criado | 10 |

**Total de arquivos de teste:** 2  |  **Total de testes:** 18

Arquivos de configuração necessários para executar a contribuição:
- angular.json: configuração do alvo de testes e runnerConfig.
- package.json e package-lock.json: dependências Vitest e jsdom.
- vitest.config.ts: configuração do executor threads com um worker.

Esses arquivos de configuração não entram na contagem de arquivos de teste.

## 6. Como executar os testes
```powershell
npm ci

npm test -- --watch=false --include=src/app/core/services/auth.service.spec.ts --include=src/app/pages/auth/login/login.spec.ts
```

Para executar a suíte completa do repositório:

```powershell
npm test -- --watch=false
```

## 7. Evidências
- **Resultado da execução:** auth.service.spec.ts foi executado individualmente com `Test Files 1 passed (1)` e `Tests 8 passed (8)`. login.spec.ts foi executado individualmente com `Test Files 1 passed (1)` e `Tests 10 passed (10)`. Os 18 casos passaram nessas execuções individuais. A execução conjunta e a suíte completa do repositório não estão documentadas aqui.
- **Link do CI (se houver):** Não informado nesta documentação; evidências disponíveis das execuções locais.

## 8. Decisões e dificuldades
- **O que foi mockado e por quê:** HttpClient e Router foram mockados nos testes de AuthService. AuthService e Router foram mockados nos testes de Login. Relógio e temporizadores foram simulados com Vitest para testar expiração e intervalo de reenvio sem espera real. TestBed fornece o contexto de injeção. Nenhuma requisição é enviada ao back-end; os testes de Login exercitam a classe sem renderizar o template.
- **Bugs encontrados pelos testes (se houver):** Nenhum bug de produção identificado nas execuções apresentadas.
- **Dificuldades:** Foi necessário configurar @angular/build:unit-test e instalar Vitest/jsdom. A execução inicial apresentou timeout ao iniciar o executor forks; os testes passaram após configurar pool threads, maxWorkers 1 e fileParallelism false. Os testes de atividades pertencem à contribuição de outro integrante e não fazem parte dos arquivos declarados neste documento. Este PR possui duas classes testadas; a contribuição complementar do back-end possui três classes. Qualquer diferença entre o fluxo Gitflow utilizado e as branches exigidas pelo professor deve ser alinhada na entrega.

## 9. Checklist de entrega
- [ ] Todos os testes passam localmente com o comando da seção 6
- [ x ] Cada cenário listado nas seções 3 e 4 existe no código
- [ x ] Cada arquivo de teste alterado ou criado está listado na seção 5
- [ ] Mínimos do exercício atendidos (10 unitários em 3 classes; 4 de integração)
- [ x ] Nenhum teste com @Disabled, sem asserção ou com Thread.sleep
- [ x ] Professor adicionado como reviewer
