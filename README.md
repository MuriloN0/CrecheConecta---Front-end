# CrecheConecta — Front-end

Interface web do CrecheConecta, uma plataforma para centralizar a comunicação entre pais, professores e direção de creches e escolas de educação infantil.

O projeto está sendo desenvolvido como Projeto Final de Curso (PFC) de Engenharia de Software da Universidade de Mogi das Cruzes (UMC).

## Objetivo

Facilitar o acompanhamento da rotina das crianças e a troca de informações entre famílias e equipe escolar, reunindo registros diários, comunicados e informações escolares em um único lugar.

## Tecnologias

- Angular
- Tailwind CSS
- Integração com o back-end por API REST, com dados em JSON
- WebSockets para comunicação em tempo real

## Integração com o back-end

O front-end consumirá a API do CrecheConecta para autenticação, consulta e registro de dados. As permissões de acesso serão validadas pelo back-end.

[Repositório do back-end](https://github.com/MuriloN0/CrecheConecta---Back-end)

## Protótipo

[Protótipo do CrecheConecta no Figma](https://www.figma.com/design/KpZCwft1zKf3d66lCBqvcS/CrecheConecta?node-id=0-1)

## Organização das branches

- `main`: versão estável do projeto.
- `develop`: integração das funcionalidades em desenvolvimento.

## Status

Em desenvolvimento. As instruções de instalação e execução serão adicionadas conforme a estrutura da aplicação for definida.

## Como executar localmente

### Pré-requisitos

- Git.
- Node.js em uma versão compatível com a versão do Angular utilizada no projeto.
- npm.
- Back-end em execução para utilizar os recursos que dependem da API.

### 1. Clonar o repositório

```bash
git clone https://github.com/MuriloN0/CrecheConecta---Front-end.git
cd CrecheConecta---Front-end
git switch develop
```

### 2. Instalar as dependências

Na pasta que contém o arquivo `package.json`, execute:

```bash
npm install
```

### 3. Configurar a comunicação com a API

A configuração da URL da API no front-end deve apontar para o endereço do back-end local, normalmente:

```text
http://localhost:8080
```

O arquivo e a propriedade utilizados para essa configuração serão documentados quando a integração estiver implementada.

### 4. Iniciar o front-end

```bash
npx ng serve
```

Após a compilação, abra o endereço informado no terminal. Por padrão:

```text
http://localhost:4200
```

Mantenha o terminal aberto enquanto utiliza a aplicação. As alterações no código serão recompiladas automaticamente.

Para encerrar o servidor, pressione `Ctrl + C`.

## Equipe

- Gabriel Belim Longhi
- Iago Lucas Fernandes de Faria
- Murilo Novaes de Oliveira

**Instituição:** Universidade de Mogi das Cruzes (UMC)  
**Curso:** Engenharia de Software  
**Ano:** 2026
