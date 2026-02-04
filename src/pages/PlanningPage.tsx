import { useEffect, useMemo, useState } from "react";
import MonthPicker, {
  MonthPickerFieldTrigger,
  monthPickerFieldButtonClassName,
} from "../components/MonthPicker";
import MoneyInput from "../components/MoneyInput";
import Toast from "../components/Toast";
import { savePlanning } from "../api/planning";
import { formatCentsToBRL } from "../utils/money";
import {
  formatMonthLabel,
  getCurrentMonthInTimeZone,
  getDefaultMonthRange,
} from "../utils/months";
import { type Planning, type PlanningBill, type PlanningExtra } from "../types";
import { usePlanning } from "../hooks/usePlanning";
import { DATA_CHANGED_EVENT, type DataChangedDetail } from "../utils/dataBus";

const currentMonth = () => getCurrentMonthInTimeZone("America/Bahia");

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const getMonthKey = (value: string | Date) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 7);
  }
  if (typeof value === "string" && value.length >= 7) {
    return value.slice(0, 7);
  }
  return new Date().toISOString().slice(0, 7);
};

const toCents = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : 0;
};

type ToastState = { message: string; type: "success" | "error" } | null;

const PlanningPage = () => {
  const currentMonthValue = useMemo(() => currentMonth(), []);
  const monthRange = useMemo(
    () => getDefaultMonthRange({ endMonth: currentMonthValue, monthsBack: 24 }),
    [currentMonthValue],
  );
  const [month, setMonth] = useState(currentMonthValue);
  const [planning, setPlanning] = useState<Planning>({
    salaryByMonth: {},
    extrasByMonth: {},
    fixedBills: [],
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [salaryCents, setSalaryCents] = useState(0);
  const [extraForm, setExtraForm] = useState<{
    id?: string;
    date: string;
    description: string;
    amountCents: number;
  }>({
    date: `${currentMonthValue}-01`,
    description: "",
    amountCents: 0,
  });
  const [billForm, setBillForm] = useState<{
    id?: string;
    name: string;
    amountCents: number;
    dueDay: string;
  }>({
    name: "",
    amountCents: 0,
    dueDay: "1",
  });
  const [errors, setErrors] = useState<{ salary?: string; extra?: string; bill?: string }>({});
  const [toast, setToast] = useState<ToastState>(null);

  const monthKey = useMemo(() => getMonthKey(month), [month]);
  const {
    planning: remotePlanning,
    isLoading: planningLoading,
    error: planningError,
    refetch: refetchPlanning,
  } = usePlanning(monthKey);

  useEffect(() => {
    if (remotePlanning) {
      setPlanning(remotePlanning);
    }
  }, [remotePlanning]);

  useEffect(() => {
    if (!planningLoading) {
      setInitialLoading(false);
    }
  }, [planningLoading]);

  useEffect(() => {
    if (!planningError) return;
    const message =
      planningError instanceof Error ? planningError.message : "Erro ao carregar planejamento";
    setToast({ message, type: "error" });
  }, [planningError]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handler = () => {
      void refetchPlanning({ silent: true });
    };
    window.addEventListener("planning-updated", handler);
    return () => {
      window.removeEventListener("planning-updated", handler);
    };
  }, [refetchPlanning]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleDataChanged = (event: Event) => {
      const detail = (event as CustomEvent<DataChangedDetail>).detail;
      const matchesMonth = !detail.month || detail.month === monthKey;
      if (matchesMonth && (detail.scope === "all" || detail.scope === "planning")) {
        void refetchPlanning({ silent: true });
      }
    };
    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    };
  }, [monthKey, refetchPlanning]);

  useEffect(() => {
    const value = planning.salaryByMonth?.[monthKey] ?? 0;
    setSalaryCents(toCents(value));
    setExtraForm((prev) => ({
      ...prev,
      date: `${monthKey}-01`,
    }));
  }, [monthKey, planning.salaryByMonth]);

  const salaryValue = toCents(planning.salaryByMonth?.[monthKey] ?? 0);

  const monthExtras = useMemo(() => {
    const list = planning.extrasByMonth?.[monthKey];
    return Array.isArray(list) ? list : [];
  }, [planning.extrasByMonth, monthKey]);

  const fixedBills = Array.isArray(planning.fixedBills) ? planning.fixedBills : [];

  const extrasTotal = monthExtras.reduce((sum, item) => sum + toCents(item.amount), 0);
  const fixedTotal = fixedBills.reduce((sum, bill) => sum + toCents(bill.amount), 0);

  const handleSaveSalary = async () => {
    const salaryValue = Number.isFinite(salaryCents) ? salaryCents : 0;
    if (salaryValue < 0) {
      setErrors((prev) => ({ ...prev, salary: "Valor inválido" }));
      return;
    }
    const next: Planning = {
      ...planning,
      salaryByMonth: {
        ...planning.salaryByMonth,
        [monthKey]: salaryValue,
      },
    };

    setPlanning(next);

    try {
      await savePlanning(next);
      setToast({ message: "Salário salvo", type: "success" });
      setErrors((prev) => ({ ...prev, salary: undefined }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar salário";
      setToast({ message, type: "error" });
    }
  };

  const resetExtraForm = () => {
    setExtraForm({
      id: undefined,
      date: `${monthKey}-01`,
      description: "",
      amountCents: 0,
    });
    setErrors((prev) => ({ ...prev, extra: undefined }));
  };

  const handleSubmitExtra = async () => {
    const amountValueCents = toCents(extraForm.amountCents);
    const description = extraForm.description.trim();
    const date = extraForm.date || `${monthKey}-01`;
    if (!description || !date || amountValueCents <= 0) {
      setErrors((prev) => ({
        ...prev,
        extra: "Preencha descrição, data e valor válido",
      }));
      return;
    }

    const currentList = Array.isArray(planning.extrasByMonth[monthKey])
      ? planning.extrasByMonth[monthKey]
      : [];

    const nextList: PlanningExtra[] = extraForm.id
      ? currentList.map((item) =>
              item.id === extraForm.id
            ? {
                ...item,
                id: item.id,
                description,
                label: item.label ?? description,
                date,
                amount: amountValueCents,
              }
            : item,
          )
      : [
          ...currentList,
          {
            id: extraForm.id ?? createId(),
            description,
            label: description,
            date,
            amount: amountValueCents,
          },
        ];

    const nextPlanning: Planning = {
      ...planning,
      extrasByMonth: {
        ...planning.extrasByMonth,
        [monthKey]: nextList,
      },
    };

    setErrors((prev) => ({ ...prev, extra: undefined }));
    setPlanning(nextPlanning);
    try {
      await savePlanning(nextPlanning);
      setToast({
        message: extraForm.id ? "Entrada extra atualizada" : "Entrada extra adicionada",
        type: "success",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar entrada extra";
      setToast({ message, type: "error" });
    }
    resetExtraForm();
  };

  const handleEditExtra = (extra: PlanningExtra) => {
    setExtraForm({
      id: extra.id,
      date: extra.date ?? `${monthKey}-01`,
      description: extra.description ?? extra.label ?? "",
      amountCents: toCents(extra.amount),
    });
  };

  const handleDeleteExtra = async (extra: PlanningExtra) => {
    const currentList = Array.isArray(planning.extrasByMonth[monthKey])
      ? planning.extrasByMonth[monthKey]
      : [];
    const nextList = currentList.filter((item) => item.id !== extra.id);
    const nextPlanning: Planning = {
      ...planning,
      extrasByMonth: {
        ...planning.extrasByMonth,
        [monthKey]: nextList,
      },
    };
    setPlanning(nextPlanning);
    try {
      await savePlanning(nextPlanning);
      setToast({ message: "Entrada extra removida", type: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao remover extra";
      setToast({ message, type: "error" });
    }
    if (extraForm.id === extra.id) {
      resetExtraForm();
    }
  };

  const resetBillForm = () => {
    setBillForm({
      id: undefined,
      name: "",
      amountCents: 0,
      dueDay: "1",
    });
    setErrors((prev) => ({ ...prev, bill: undefined }));
  };

  const handleSubmitBill = async () => {
    const amountValueCents = toCents(billForm.amountCents);
    const dueDay = Number(billForm.dueDay);
    const name = billForm.name.trim();
    if (
      !name ||
      amountValueCents <= 0 ||
      Number.isNaN(dueDay) ||
      dueDay < 1 ||
      dueDay > 31
    ) {
      setErrors((prev) => ({ ...prev, bill: "Preencha nome, valor e dia válido (1-31)" }));
      return;
    }

    const nextBills: PlanningBill[] = billForm.id
      ? fixedBills.map((bill) =>
          bill.id === billForm.id
            ? {
                ...bill,
                id: bill.id,
                name,
                label: bill.label ?? name,
                amount: amountValueCents,
                dueDay,
              }
            : bill,
        )
      : [
          ...fixedBills,
          {
            id: billForm.id ?? createId(),
            name,
            label: name,
            amount: amountValueCents,
            dueDay,
          },
        ];

    const nextPlanning: Planning = { ...planning, fixedBills: nextBills };

    setErrors((prev) => ({ ...prev, bill: undefined }));
    setPlanning(nextPlanning);
    try {
      await savePlanning(nextPlanning);
      setToast({
        message: billForm.id ? "Conta fixa atualizada" : "Conta fixa adicionada",
        type: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar conta fixa";
      setToast({ message, type: "error" });
    }
    resetBillForm();
  };

  const handleEditBill = (bill: PlanningBill) => {
    setBillForm({
      id: bill.id,
      name: bill.name ?? bill.label ?? "",
      amountCents: toCents(bill.amount),
      dueDay: bill.dueDay ? String(bill.dueDay) : "1",
    });
  };

  const handleDeleteBill = async (bill: PlanningBill) => {
    const nextBills = fixedBills.filter((item) => item.id !== bill.id);
    const nextPlanning: Planning = {
      ...planning,
      fixedBills: nextBills,
    };
    setPlanning(nextPlanning);
    try {
      await savePlanning(nextPlanning);
      setToast({ message: "Conta fixa removida", type: "success" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao remover conta fixa";
      setToast({ message, type: "error" });
    }
    if (billForm.id === bill.id) {
      resetBillForm();
    }
  };

  if (initialLoading) {
    return <div className="card p-4 text-sm text-slate-600">Carregando planejamento...</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Planejamento</h2>
          <p className="text-sm text-slate-600">
            Cadastre salario, entradas extras e contas fixas para o mes.
          </p>
        </div>
        <div className="w-full sm:w-60">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Mes
            <MonthPicker
              valueMonth={month}
              onChangeMonth={(value) => setMonth(getMonthKey(value))}
              minMonth={monthRange.start}
              maxMonth={monthRange.end}
              buttonClassName={monthPickerFieldButtonClassName}
              trigger={<MonthPickerFieldTrigger label={formatMonthLabel(month)} />}
            />
          </label>
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <h3 className="text-lg font-semibold text-slate-900">Salario do mes</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1">
            <MoneyInput
              valueCents={salaryCents}
              onChangeCents={setSalaryCents}
              placeholder="R$ 0,00"
              className="w-full"
            />
            {errors.salary && <p className="mt-1 text-xs text-red-600">{errors.salary}</p>}
            <p className="mt-1 text-xs text-slate-500">
              Atual: {formatCentsToBRL(salaryValue || 0)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveSalary}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            Salvar salario
          </button>
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {extraForm.id ? "Editar entrada extra" : "Entradas extras"}
              </h3>
              {extraForm.id && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Editando
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600">
              Total no mes: {formatCentsToBRL(extrasTotal)}
            </p>
            {extraForm.id && (
              <p className="text-xs text-slate-500">
                Valor atual: {formatCentsToBRL(extraForm.amountCents)}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:grid md:grid-cols-3">
          <label className="w-full flex flex-col gap-2 text-sm font-medium text-slate-700">
            Data
            <input
              type="date"
              value={extraForm.date}
              onChange={(e) => setExtraForm((prev) => ({ ...prev, date: e.target.value }))}
              className="block w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="w-full flex flex-col gap-2 text-sm font-medium text-slate-700">
            Descricao
            <input
              type="text"
              value={extraForm.description}
              onChange={(e) =>
                setExtraForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="block w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Ex.: bonus"
            />
          </label>
          <label className="w-full flex flex-col gap-2 text-sm font-medium text-slate-700">
            Valor
            <MoneyInput
              valueCents={extraForm.amountCents}
              onChangeCents={(amountCents) =>
                setExtraForm((prev) => ({ ...prev, amountCents }))
              }
              placeholder="R$ 0,00"
              className="w-full"
            />
          </label>
        </div>
        {errors.extra && <p className="text-xs text-red-600">{errors.extra}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {extraForm.id && (
            <button
              type="button"
              onClick={resetExtraForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              Cancelar edicao
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmitExtra}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            {extraForm.id ? "Salvar alteracoes" : "Adicionar extra"}
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {monthExtras.length ? (
            monthExtras.map((extra) => (
              <div key={extra.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {extra.description ?? extra.label ?? "Entrada extra"}
                  </p>
                  <p className="text-xs text-slate-600">
                    {(extra.date ?? `${monthKey}-01`).slice(0, 10)} ·{" "}
                    {formatCentsToBRL(toCents(extra.amount))}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleEditExtra(extra)}
                    className="text-primary hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteExtra(extra)}
                    className="text-red-600 hover:underline"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-2 text-sm text-slate-500">
              Nenhuma entrada extra para este mes.
            </p>
          )}
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {billForm.id ? "Editar conta fixa" : "Contas fixas"}
              </h3>
              {billForm.id && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Editando
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600">
              Total previsto: {formatCentsToBRL(fixedTotal)}
            </p>
            {billForm.id && (
              <p className="text-xs text-slate-500">
                Valor atual: {formatCentsToBRL(billForm.amountCents)}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Nome
            <input
              type="text"
              value={billForm.name}
              onChange={(e) => setBillForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Ex.: Aluguel"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Valor
            <MoneyInput
              valueCents={billForm.amountCents}
              onChangeCents={(amountCents) => setBillForm((prev) => ({ ...prev, amountCents }))}
              placeholder="R$ 0,00"
              className="w-full"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Dia do vencimento
            <input
              type="number"
              min={1}
              max={31}
              value={billForm.dueDay}
              onChange={(e) => setBillForm((prev) => ({ ...prev, dueDay: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
        {errors.bill && <p className="text-xs text-red-600">{errors.bill}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {billForm.id && (
            <button
              type="button"
              onClick={resetBillForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              Cancelar edicao
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmitBill}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
          >
            {billForm.id ? "Salvar alteracoes" : "Adicionar conta fixa"}
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {fixedBills.length ? (
            fixedBills.map((bill) => (
              <div key={bill.id} className="py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {bill.name ?? bill.label ?? "Conta"}
                    </p>
                    <p className="text-xs text-slate-600">
                    {formatCentsToBRL(toCents(bill.amount))}{" "}
                      {bill.dueDay ? `- Vence dia ${bill.dueDay}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => handleEditBill(bill)}
                      className="text-primary hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBill(bill)}
                      className="text-red-600 hover:underline"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="py-2 text-sm text-slate-500">Nenhuma conta fixa cadastrada.</p>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default PlanningPage;
