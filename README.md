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
VITE_API_URL=https://chatbot-despesas.onrender.com
```
Use `import.meta.env.VITE_API_URL` no codigo (ja configurado).

## Build / Producao (Render Static Site)
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Environment: defina `VITE_API_URL`

## Funcionalidades
- Autenticacao por senha unica, token em `localStorage`, rotas protegidas, logout
- Dashboard: resumo mensal, graficos (Recharts) por categoria/dia, ultimos lancamentos
- Lancamentos: filtros por mes/categoria/busca, cards mobile e tabela desktop, total em BRL, botao "Novo lancamento"
- Rotas placeholder para `/entries/new` e `/entries/:id/edit` (serao implementadas na parte B2)
- Tailwind configurado + PWA (manifest e icones placeholder)
