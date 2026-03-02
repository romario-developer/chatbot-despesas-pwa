# Financio - Documentacao Completa do Frontend

PWA de gestao financeira pessoal construida em React + TypeScript + Tailwind, com integracao a API REST de despesas.

## 1. Stack e arquitetura

### Frontend
- React 19
- TypeScript
- Vite 7
- React Router
- Tailwind CSS
- TanStack React Query
- Axios
- Recharts

### Infra de app
- PWA com `vite-plugin-pwa` (`injectManifest`)
- Service Worker custom (`src/service-worker.ts`)
- Atualizacao automatica de versao (reload ao detectar nova build)
- Fallback SPA via `_redirects`

### Padrao de dados
- Camada `src/api/*` para chamadas HTTP
- Hooks de query em `src/hooks/queries/*`
- Eventos globais para sincronizacao:
  - `entries:changed`
  - `entry:created`
  - `data:changed`
- Cache e invalidacao por mes com React Query

## 2. Como rodar localmente

1. Instale dependencias:
   - `npm ci`
2. Configure variaveis de ambiente:
   - copie `.env.example` para `.env`
3. Rode em dev:
   - `npm run dev`
4. Build de producao:
   - `npm run build`
5. Preview local do build:
   - `npm run preview`

## 3. Variaveis de ambiente

```env
# Base da API (sem /api no final)
VITE_API_URL=https://chatbot-despesas.onrender.com

# Opcional: habilita logs extras de API
VITE_DEBUG_API=true
```

Observacao importante:
- O frontend sempre chama endpoints como `/api/...`.
- Se `VITE_API_URL` vier com `/api` no final, o resultado vira `/api/api/...` e pode gerar 404.
- O projeto remove automaticamente o sufixo `/api` quando detectado, mas o ideal e configurar certo na origem.

## 4. Rotas da aplicacao

### Publicas
- `/login`
- `/signup`

### Protegidas
- `/` (Dashboard)
- `/entries`
- `/entries/new`
- `/entries/:id/edit`
- `/planning`
- `/backup`
- `/categories`
- `/cards`
- `/cards/:cardId/invoice`
- `/assistant` (chat em tela cheia no mobile)
- `/change-password`

## 5. Funcionalidades implementadas

### 5.1 Autenticacao e sessao
- Login com email e senha (`/api/auth/login`)
- Cadastro de usuario (`/api/auth/signup`)
- Troca obrigatoria de senha quando sinalizado (`mustChangePassword`)
- Persistencia de token em `localStorage`
- Rotas protegidas com redirecionamento
- Logout global com limpeza de armazenamento e redirecionamento para `/login`
- Interceptor Axios com:
  - Bearer token automatico
  - tratamento centralizado de 401/404
  - bloqueio temporario de endpoint com falha repetida (anti loop)

### 5.2 Dashboard (`/`)
- Seletor de mes (faixa de meses passados e futuros)
- Cards de resumo:
  - saldo
  - receitas
  - gastos em caixa
- Lista dos ultimos lancamentos
- Grafico de distribuicao por categoria (pizza)
- Cards adicionais de apoio financeiro (componente `DashboardCardsList`)
- Skeleton loading
- Retry em falha de busca
- Sincronizacao automatica:
  - foco da janela
  - reconexao de rede
  - eventos de alteracao de dados
  - polling

### 5.3 Lancamentos (`/entries`)
- Lista por mes
- Total consolidado do periodo
- Visualizacao responsiva:
  - cards no mobile
  - tabela no desktop
- Badges por metodo de pagamento
- Suporte a cartao vinculado
- Indicacao de lancamento parcelado
- Indicacao de categoria inferida automaticamente
- Exclusao com dialogo de confirmacao
- Edicao e criacao com formularios dedicados
- Polling com desativacao automatica em erro 5xx e botao de retry

### 5.4 Criacao/edicao de lancamento
- Rotas:
  - `/entries/new`
  - `/entries/:id/edit`
- Componente unico de formulario (`EntryForm`)
- Validacoes de campos
- Fluxo de sucesso com toast no retorno para listagem
- Emissao de eventos de sincronizacao apos salvar/excluir

### 5.5 Planejamento (`/planning`)
- Salario por mes
- Entradas extras por mes (CRUD)
- Contas fixas (CRUD)
- Validacoes de formulario (valor, descricao, dia de vencimento)
- Totais calculados no frontend:
  - total de extras no mes
  - total de contas fixas
- Persistencia via API (`/api/planning`)
- Reatividade com `data:changed` e evento `planning-updated`

### 5.6 Cartoes e faturas (`/cards` e `/cards/:cardId/invoice`)
- Cadastro de cartoes (manual)
- Edicao e exclusao de cartoes
- Configuracao de:
  - nome
  - bandeira
  - limite
  - cor
  - dia de fechamento
  - dia de vencimento
- Resumo de faturas por cartao
- Visualizacao de compras do ciclo
- Registro de pagamento de fatura
- Visualizacao de parcelas no resumo da fatura por cartao/mes
- Estados de loading, erro e vazio

### 5.7 Categorias (`/categories`)
- Listagem de categorias
- Filtro por status:
  - ativas
  - desativadas
  - todas
- Renomear categoria
- Ativar/desativar categoria
- Excluir categoria
- Tratamento de conflito (categoria em uso)

### 5.8 Assistente (`/assistant` + widget desktop)
- Chat financeiro com backend (`/api/assistant/chat`)
- Persistencia de `conversationId`
- Sugestoes rapidas agrupadas:
  - pagamento
  - cartoes
  - categorias
  - ajustes
- Cards de retorno do assistente:
  - metricas
  - listas
  - resumos com campos
- Fluxo com estado "saved" e toast de confirmacao
- Acoes de planejamento via `uiHint` (salario, extra, conta fixa)
- No mobile:
  - tela cheia dedicada
  - ajustes para teclado/viewport
- No desktop:
  - widget flutuante com overlay/modal

### 5.9 Backup manual (`/backup` e menu de configuracoes)
- Exportacao de backup do usuario autenticado (`/api/user/backup/export`)
- Download automatico de arquivo `.json`
- Importacao de backup (`/api/user/backup/import`)
- Validacao minima de arquivo:
  - `meta.userId`
  - `data`
- Feedback de sucesso/erro via toast

### 5.10 UX global e layout
- Tema claro/escuro com persistencia
- Header responsivo
- Bottom tab bar mobile
- Menu de configuracoes com:
  - alternancia de tema
  - exportar/importar backup
  - limpar cache do app
  - logout
  - exibicao da versao
- Toast global reutilizavel
- Componentes de confirmacao e selecao reutilizaveis

## 6. Integracoes de API usadas pelo frontend

### Auth
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/me/password`

### Dashboard e lancamentos
- `GET /api/dashboard/summary`
- `GET /api/entries`
- `GET /api/entries/:id`
- `POST /api/entries`
- `PUT /api/entries/:id`
- `DELETE /api/entries/:id`

### Planejamento
- `GET /api/planning`
- `PUT /api/planning`

### Categorias
- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

### Cartoes/faturas
- `GET /api/cards`
- `POST /api/cards`
- `PUT /api/cards/:id`
- `DELETE /api/cards/:id`
- `GET /api/cards/invoices`
- `GET /api/cards/:cardId/invoice`
- `GET /api/cards/:cardId/invoice/summary`
- `POST /api/cards/payments`

### Assistente
- `POST /api/assistant/chat`

### Backup
- `GET /api/user/backup/export`
- `POST /api/user/backup/import`

### Warmup/health
- `GET /api/health`

## 7. PWA, cache e atualizacao

- Manifest com nome e icones em `public/icons/*`
- Service Worker com precache dos assets de build
- Regras de runtime:
  - chamadas `/api/*` em `NetworkOnly` (nao cacheia resposta de API)
- Atualizacao automatica:
  - `registerSW` em `main.tsx`
  - ao detectar update, app recarrega
- Limpeza manual de cache disponivel no menu de configuracoes

## 8. Estrutura principal de pastas

- `src/pages`: telas da aplicacao
- `src/components`: componentes de UI/layout
- `src/components/dashboard`: componentes especificos do dashboard/cartoes
- `src/api`: clientes HTTP por dominio
- `src/hooks`: hooks de estado e integracao
- `src/hooks/queries`: hooks React Query
- `src/contexts`: auth e tema
- `src/utils`: formatacao, datas, eventos e helpers
- `src/services`: configuracoes compartilhadas
- `public`: assets estaticos e manifest

## 9. Build e deploy

### Comandos
- Build: `npm run build`
- Saida: `dist`

### Deploy em host estatico (ex.: Render Static Site)
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Definir `VITE_API_URL` no ambiente de build/deploy
- Garantir rewrite SPA:
  - `/* /index.html 200`

Observacao:
- O script `copy-redirects` copia `public/_redirects` para `dist/_redirects` apos o build.

## 10. Status atual do frontend

Este README descreve os recursos que estao implementados no codigo atual do frontend, incluindo:
- autenticacao completa
- dashboard
- lancamentos
- planejamento
- categorias
- cartoes/faturas
- assistente (mobile + desktop)
- backup manual
- PWA com atualizacao automatica
