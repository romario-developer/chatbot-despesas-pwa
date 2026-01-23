# Checklist do projeto (estado atual)

## Autenticacao e sessao
- [x] Login por senha unica (`/api/auth/login`) com token em `localStorage` (`src/pages/LoginPage.tsx`, `src/api/auth.ts`)
- [x] Rotas protegidas com redirect para `/login` (`src/components/ProtectedRoute.tsx`)
- [x] Logout limpa token e volta para `/login` (`src/components/AppLayout.tsx`)
- [x] Interceptador de API com Bearer token, tratamento 401/404 e bloqueio por falhas repetidas (`src/api/client.ts`)

## Dashboard
- [x] Resumo mensal com metricas (ganhos, despesas, saldo, fixas) e contagem de lancamentos (`src/pages/DashboardPage.tsx`)
- [x] Graficos: pizza por categoria, barras por dia e resumo receitas x despesas (`src/pages/DashboardPage.tsx`)
- [x] Insights dinamicos (gasto maior que receita, top categoria, saldo positivo) (`src/pages/DashboardPage.tsx`)
- [x] Ultimos lancamentos e links rapidos (`src/pages/DashboardPage.tsx`)
- [x] Exportacao CSV com autenticacao (`src/components/ExportCsvButton.tsx`, `src/utils/exportCsv.ts`)

## Lancamentos (entries)
- [x] Lista com filtros por mes, categoria e busca (`src/pages/EntriesPage.tsx`)
- [x] Total do periodo e listagem responsiva (cards mobile e tabela desktop) (`src/pages/EntriesPage.tsx`)
- [x] Criar lancamento (`src/pages/EntryCreatePage.tsx`, `src/components/EntryForm.tsx`)
- [x] Editar lancamento (`src/pages/EntryEditPage.tsx`, `src/components/EntryForm.tsx`)
- [x] Excluir lancamento com confirmacao (`src/pages/EntriesPage.tsx`, `src/components/ConfirmDialog.tsx`)
- [x] Validacoes de formulario e normalizacao de valor decimal (`src/components/EntryForm.tsx`)

## Planejamento
- [x] Salario por mes com salvamento via API (`src/pages/PlanningPage.tsx`, `src/api/planning.ts`)
- [x] Entradas extras por mes (CRUD) (`src/pages/PlanningPage.tsx`)
- [x] Contas fixas (CRUD) com dia de vencimento (`src/pages/PlanningPage.tsx`)
- [x] Totais de extras e fixas calculados no front (`src/pages/PlanningPage.tsx`)

## Infra e UX
- [x] PWA com service worker, prompt de update e gatilho `pwa:need-refresh` (`src/main.tsx`, `src/components/AppLayout.tsx`, `vite.config.ts`)
- [x] Cache da API em NetworkOnly (`vite.config.ts`)
- [x] Healthcheck da API com banner de erro (`src/components/ApiHealthCheck.tsx`)
- [x] Toasts de feedback global (`src/components/Toast.tsx`)
- [x] Month picker reutilizavel (`src/components/MonthPicker.tsx`)
- [x] Atualizacao automatica de dados (intervalo, foco, online, evento) para dashboard e lancamentos (`src/pages/DashboardPage.tsx`, `src/pages/EntriesPage.tsx`, `src/utils/entriesEvents.ts`)
