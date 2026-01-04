import { apiRequest } from "./client";
import {
  DEFAULT_PLANNING,
  type Planning,
  type PlanningBill,
  type PlanningExtra,
} from "../types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeExtra = (item: Partial<PlanningExtra>): PlanningExtra => {
  const baseLabel =
    typeof item.label === "string" && item.label.trim()
      ? item.label
      : typeof item.description === "string"
        ? item.description
        : undefined;

  return {
    id: item.id ? String(item.id) : createId(),
    label: baseLabel,
    description: typeof item.description === "string" ? item.description : baseLabel,
    date: typeof item.date === "string" ? item.date : undefined,
    amount: normalizeNumber(item.amount),
  };
};

const normalizeBill = (bill: Partial<PlanningBill>): PlanningBill => {
  const baseLabel =
    typeof bill.label === "string" && bill.label.trim()
      ? bill.label
      : typeof bill.name === "string"
        ? bill.name
        : undefined;
  const dueDay = Number(bill.dueDay);
  const safeDueDay = Number.isFinite(dueDay) ? dueDay : undefined;

  return {
    id: bill.id ? String(bill.id) : createId(),
    label: baseLabel,
    name: typeof bill.name === "string" ? bill.name : baseLabel,
    amount: normalizeNumber(bill.amount),
    dueDay: safeDueDay,
  };
};

const normalizePlanning = (data?: Partial<Planning> | null): Planning => {
  const salaryByMonth = isRecord(data?.salaryByMonth)
    ? Object.entries(data?.salaryByMonth ?? {}).reduce<Record<string, number>>(
        (acc, [key, value]) => {
          acc[key] = normalizeNumber(value);
          return acc;
        },
        {},
      )
    : {};

  const extrasByMonth = isRecord(data?.extrasByMonth)
    ? Object.entries(data?.extrasByMonth ?? {}).reduce<
        Record<string, PlanningExtra[]>
      >((acc, [key, value]) => {
        if (Array.isArray(value)) {
          acc[key] = value.map((item) => normalizeExtra(item as Partial<PlanningExtra>));
        } else {
          acc[key] = [];
        }
        return acc;
      }, {})
    : {};

  const fixedBills = Array.isArray(data?.fixedBills)
    ? (data?.fixedBills ?? []).map((bill) => normalizeBill(bill as Partial<PlanningBill>))
    : [];

  return {
    salaryByMonth,
    extrasByMonth,
    fixedBills,
  };
};

export async function getPlanning(): Promise<Planning> {
  const data = await apiRequest<Planning | null>({
    url: "/api/planning",
    method: "GET",
  });
  return normalizePlanning(data ?? DEFAULT_PLANNING);
}

export async function savePlanning(planning: Planning): Promise<Planning> {
  const payload = normalizePlanning(planning);
  const data = await apiRequest<Planning | null>({
    url: "/api/planning",
    method: "PUT",
    data: payload,
  });

  return normalizePlanning(data ?? DEFAULT_PLANNING);
}
