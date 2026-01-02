import type { ExtraEntry, FixedBill, PlanningData } from "../types";

const STORAGE_KEY = "despesas_pwa_planning_v1";

const defaultPlanning: PlanningData = {
  salaryByMonth: {},
  extrasByMonth: {},
  fixedBills: [],
};

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const safeParse = (raw: string | null): PlanningData => {
  if (!raw) return { ...defaultPlanning };
  try {
    const parsed = JSON.parse(raw) as Partial<PlanningData>;
    return {
      salaryByMonth: parsed.salaryByMonth && typeof parsed.salaryByMonth === "object"
        ? parsed.salaryByMonth
        : {},
      extrasByMonth: parsed.extrasByMonth && typeof parsed.extrasByMonth === "object"
        ? parsed.extrasByMonth
        : {},
      fixedBills: Array.isArray(parsed.fixedBills) ? parsed.fixedBills : [],
    };
  } catch {
    return { ...defaultPlanning };
  }
};

export const loadPlanning = (): PlanningData => {
  if (typeof localStorage === "undefined") return { ...defaultPlanning };
  const raw = localStorage.getItem(STORAGE_KEY);
  const data = safeParse(raw);
  return {
    salaryByMonth: data.salaryByMonth ?? {},
    extrasByMonth: data.extrasByMonth ?? {},
    fixedBills: Array.isArray(data.fixedBills) ? data.fixedBills : [],
  };
};

export const savePlanning = (data: PlanningData) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getMonthKey = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 7);
  }
  if (value.length >= 7) {
    return value.slice(0, 7);
  }
  return new Date().toISOString().slice(0, 7);
};

export const setSalary = (yearMonth: string, amount: number) => {
  const data = loadPlanning();
  const key = getMonthKey(yearMonth);
  data.salaryByMonth[key] = amount;
  savePlanning(data);
  return data;
};

export const addExtra = (yearMonth: string, extra: Omit<ExtraEntry, "id">) => {
  const data = loadPlanning();
  const key = getMonthKey(yearMonth);
  const list = Array.isArray(data.extrasByMonth[key]) ? data.extrasByMonth[key] : [];
  const item: ExtraEntry = { id: createId(), ...extra };
  data.extrasByMonth[key] = [...list, item];
  savePlanning(data);
  return data;
};

export const updateExtra = (
  yearMonth: string,
  extraId: string,
  patch: Partial<Omit<ExtraEntry, "id">>,
) => {
  const data = loadPlanning();
  const key = getMonthKey(yearMonth);
  const list = Array.isArray(data.extrasByMonth[key]) ? data.extrasByMonth[key] : [];
  data.extrasByMonth[key] = list.map((item) =>
    item.id === extraId ? { ...item, ...patch, id: item.id } : item,
  );
  savePlanning(data);
  return data;
};

export const deleteExtra = (yearMonth: string, extraId: string) => {
  const data = loadPlanning();
  const key = getMonthKey(yearMonth);
  const list = Array.isArray(data.extrasByMonth[key]) ? data.extrasByMonth[key] : [];
  data.extrasByMonth[key] = list.filter((item) => item.id !== extraId);
  savePlanning(data);
  return data;
};

export const addFixedBill = (bill: Omit<FixedBill, "id">) => {
  const data = loadPlanning();
  const item: FixedBill = { id: createId(), ...bill };
  const list = Array.isArray(data.fixedBills) ? data.fixedBills : [];
  data.fixedBills = [...list, item];
  savePlanning(data);
  return data;
};

export const updateFixedBill = (billId: string, patch: Partial<Omit<FixedBill, "id">>) => {
  const data = loadPlanning();
  const list = Array.isArray(data.fixedBills) ? data.fixedBills : [];
  data.fixedBills = list.map((bill) =>
    bill.id === billId ? { ...bill, ...patch, id: bill.id } : bill,
  );
  savePlanning(data);
  return data;
};

export const deleteFixedBill = (billId: string) => {
  const data = loadPlanning();
  const list = Array.isArray(data.fixedBills) ? data.fixedBills : [];
  data.fixedBills = list.filter((bill) => bill.id !== billId);
  savePlanning(data);
  return data;
};
