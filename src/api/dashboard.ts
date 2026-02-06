import { apiRequest } from "./client";
import type { DashboardCategory, DashboardSummary } from "../types";

type RawCategory = {
  category?: unknown;
  categoryName?: unknown;
  name?: unknown;
  total?: unknown;
  amount?: unknown;
  color?: unknown;
};

type RawDashboardSummary = {
  month?: unknown;
  balance?: unknown;
  balanceCents?: unknown;
  incomeTotal?: unknown;
  incomeTotalCents?: unknown;
  expenseTotal?: unknown;
  expenseTotalCents?: unknown;
  expenseCashTotal?: unknown;
  expenseCashTotalCents?: unknown;
  expenseCreditTotal?: unknown;
  expenseCreditTotalCents?: unknown;
  expense_cash_total?: unknown;
  expense_cash_total_cents?: unknown;
  expense_credit_total?: unknown;
  expense_credit_total_cents?: unknown;
  salary?: unknown;
  salaryCents?: unknown;
  extras?: unknown;
  extrasCents?: unknown;
  receitas?: unknown;
  receitasCents?: unknown;
  gastosCaixa?: unknown;
  gastosCaixaCents?: unknown;
  gastosCredito?: unknown;
  gastosCreditoCents?: unknown;
  byCategory?: unknown;
} | null;

const normalizeNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const resolveCents = (options: { cents?: unknown; reais?: unknown }) => {
  if (options.cents !== undefined && options.cents !== null) {
    return normalizeNumber(options.cents);
  }
  if (options.reais !== undefined && options.reais !== null) {
    // Se o valor for muito grande (ex: > 100.000), provavelmente já está em centavos.
    // No entanto, para ser consistente com a correção do backend, vamos assumir que
    // os campos 'balance', 'incomeTotal', etc, agora retornam centavos.
    return normalizeNumber(options.reais);
  }
  return 0;
};

const normalizeCategory = (value: RawCategory): DashboardCategory | null => {
  const label =
    typeof value.categoryName === "string"
      ? value.categoryName
      : typeof value.category === "string"
        ? value.category
        : typeof value.name === "string"
          ? value.name
          : "";
  const total = normalizeNumber(value.total ?? value.amount);
  if (!label) return null;
  const color = typeof value.color === "string" ? value.color : undefined;
  return {
    category: label,
    total,
    color,
  };
};

const normalizeCategories = (value: unknown): DashboardCategory[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeCategory(item as RawCategory))
      .filter(Boolean) as DashboardCategory[];
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([category, total]) => ({
        category,
        total: normalizeNumber(total),
      }))
      .filter((item) => Boolean(item.category));
  }

  return [];
};

export const getDashboardSummary = async (month: string): Promise<DashboardSummary> => {
  const search = new URLSearchParams({ month });
  const data = await apiRequest<RawDashboardSummary>({
    url: `/api/dashboard/summary?${search.toString()}`,
    method: "GET",
    dashboardDebug: { label: "dashboard-summary" },
  });

  const cashTotal =
    data?.expenseCashTotal ?? data?.expense_cash_total;
  const creditTotal =
    data?.expenseCreditTotal ?? data?.expense_credit_total;
  const receipts =
    data?.incomeTotal ?? data?.receitas;
  const cashCents =
    data?.expenseCashTotalCents ?? data?.expense_cash_total_cents;
  const creditCents =
    data?.expenseCreditTotalCents ?? data?.expense_credit_total_cents;
  return {
    month: typeof data?.month === "string" ? data.month : month,
    balance: normalizeNumber(data?.balance),
    balanceCents: resolveCents({
      cents: data?.balanceCents,
      reais: data?.balance,
    }),
    incomeTotal: normalizeNumber(receipts),
    incomeTotalCents: resolveCents({
      cents: data?.incomeTotalCents ?? data?.receitasCents,
      reais: receipts,
    }),
    expenseCashTotal: normalizeNumber(cashTotal),
    expenseCashTotalCents: resolveCents({
      cents: cashCents ?? data?.gastosCaixaCents,
      reais: data?.gastosCaixa ?? cashTotal,
    }),
    expenseCreditTotal: normalizeNumber(creditTotal),
    expenseCreditTotalCents: resolveCents({
      cents: creditCents ?? data?.gastosCreditoCents,
      reais: data?.gastosCredito ?? creditTotal,
    }),
    expenseTotal: normalizeNumber(data?.expenseTotal),
    expenseTotalCents: resolveCents({
      cents: data?.expenseTotalCents,
      reais: data?.expenseTotal,
    }),
    salary: normalizeNumber(data?.salary),
    salaryCents: resolveCents({
      cents: data?.salaryCents,
      reais: data?.salary,
    }),
    extras: normalizeNumber(data?.extras),
    extrasCents: resolveCents({
      cents: data?.extrasCents,
      reais: data?.extras,
    }),
    receitas: normalizeNumber(data?.receitas),
    receitasCents: resolveCents({
      cents: data?.receitasCents,
      reais: data?.receitas,
    }),
    gastosCaixa: normalizeNumber(data?.gastosCaixa),
    gastosCaixaCents: resolveCents({
      cents: data?.gastosCaixaCents,
      reais: data?.gastosCaixa,
    }),
    gastosCredito: normalizeNumber(data?.gastosCredito),
    gastosCreditoCents: resolveCents({
      cents: data?.gastosCreditoCents,
      reais: data?.gastosCredito,
    }),
    byCategory: normalizeCategories(data?.byCategory),
  };
};
