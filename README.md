# Despesas PWA

PWA em React + TypeScript + Tailwind consumindo a API de despesas.

## Requisitos
- Node 20+ recomendado (Vite 7 sugere >=20.19 ou >=22.12)

## Como rodar local
1. Instale dependencias: `npm ci`
2. Copie variaveis: `cp .env.example .env` (ou crie `.env` manualmente)
3. Execute em modo dev: `npm run dev`
4. Acesse a URL indicada pelo Vite.

## Variaveis de ambiente
```
# Base da API - nao inclua /api no final
VITE_API_URL=https://chatbot-despesas.onrender.com

# Opcional: logs adicionais de API em producao
# VITE_DEBUG_API=true
```
O frontend prefixa todas as rotas com `/api/...`. Se `VITE_API_URL` terminar com `/api`, a URL final ficara duplicada (`/api/api/...`) e resultara em 404.

## Testes rapidos da API (curl)
- `curl -i https://<host>/api/health`
- `curl -i -X POST https://<host>/api/auth/login -H "Content-Type: application/json" -d '{"password":"<senha>"}'`
As respostas esperadas sao HTTP 200 para `/api/health` (ou 401 se protegido) e HTTP 200/401 para `/api/auth/login` dependendo das credenciais.

## Build / Producao (Render Static Site)
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Environment: defina `VITE_API_URL` (sem `/api`) nas variaveis do Render ou do host escolhido, garantindo que o valor exista tambem no ambiente de build.
- Render redirect: no painel do Render, configure um Redirect/Rewrite de `/*` para `/index.html` (Action `Rewrite` ou `200`) para que o SPA carregue em qualquer rota.
- Mantemos `public/_redirects` com `/* /index.html 200` e um script copia ele para `dist/_redirects` após o build para garantir fallback fora do Render.

## Funcionalidades
- Autenticacao por senha unica, token em `localStorage`, rotas protegidas, logout
- Dashboard: resumo mensal, graficos (Recharts) por categoria/dia, ultimos lancamentos
- Lancamentos: filtros por mes/categoria/busca, cards mobile e tabela desktop, total em BRL, criar/editar/excluir lancamentos (rotas `/entries/new`, `/entries/:id/edit`)
- Planejamento (B3): rota `/planning` para salario por mes, entradas extras do mes e contas fixas globais (persistencia em `localStorage`), valores integrados ao resumo do Dashboard
- Tailwind configurado + PWA (manifest e icones placeholder)
