import { useEffect, useMemo, useState } from "react";
import MonthPicker from "../components/MonthPicker";
import Toast from "../components/Toast";
import {
  addExtra,
  addFixedBill,
  deleteExtra,
  deleteFixedBill,
  getMonthKey,
  loadPlanning,
  setSalary,
  updateExtra,
  updateFixedBill,
} from "../storage/planningStorage";
import { formatBRL, parseCurrencyInput } from "../utils/format";
import type { ExtraEntry, FixedBill, PlanningData } from "../types";

const currentMonth = () => new Date().toISOString().slice(0, 7);

type ToastState = { message: string; type: "success" | "error" } | null;

const PlanningPage = () => {
  const [month, setMonth] = useState(currentMonth());
  const [planning, setPlanning] = useState<PlanningData>(() => loadPlanning());
  const [salaryInput, setSalaryInput] = useState("");
  const [extraForm, setExtraForm] = useState<{
    id?: string;
    date: string;
    description: string;
    amount: string;
  }>({
    date: `${currentMonth()}-01`,
    description: "",
    amount: "",
  });
  const [billForm, setBillForm] = useState<{
    id?: string;
    name: string;
    amount: string;
    dueDay: string;
  }>({
    name: "",
    amount: "",
    dueDay: "1",
  });
  const [errors, setErrors] = useState<{ salary?: string; extra?: string; bill?: string }>({});
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const data = loadPlanning();
    setPlanning(data);
  }, [month]);

  useEffect(() => {
    const key = getMonthKey(month);
    const value = planning.salaryByMonth?.[key] ?? 0;
    setSalaryInput(value ? String(value) : "");
    setExtraForm((prev) => ({
      ...prev,
      date: `${key}-01`,
    }));
  }, [month, planning.salaryByMonth]);

  const salaryValue = planning.salaryByMonth?.[month] ?? 0;

  const monthExtras = useMemo(() => {
    const list = planning.extrasByMonth?.[month];
    return Array.isArray(list) ? list : [];
  }, [planning.extrasByMonth, month]);

  const fixedBills = Array.isArray(planning.fixedBills) ? planning.fixedBills : [];

  const extrasTotal = monthExtras.reduce((sum, item) => sum + (item?.amount ?? 0), 0);
  const fixedTotal = fixedBills.reduce((sum, bill) => sum + (bill?.amount ?? 0), 0);

  const handleSaveSalary = () => {
    const parsed = parseCurrencyInput(salaryInput || "0");
    if (Number.isNaN(parsed)) {
      setErrors((prev) => ({ ...prev, salary: "Valor invalido" }));
      return;
    }
    const data = setSalary(month, parsed);
    setPlanning(data);
    setErrors((prev) => ({ ...prev, salary: undefined }));
    setToast({ message: "Salario salvo", type: "success" });
  };

  const resetExtraForm = () => {
    setExtraForm({
      id: undefined,
      date: `${month}-01`,
      description: "",
      amount: "",
    });
    setErrors((prev) => ({ ...prev, extra: undefined }));
  };

  const handleSubmitExtra = () => {
    const parsedAmount = parseCurrencyInput(extraForm.amount);
    if (
      !extraForm.description.trim() ||
      !extraForm.date ||
      Number.isNaN(parsedAmount)
    ) {
      setErrors((prev) => ({ ...prev, extra: "Preencha descricao, data e valor valido" }));
      return;
    }

    if (extraForm.id) {
      const data = updateExtra(month, extraForm.id, {
        description: extraForm.description.trim(),
        date: extraForm.date,
        amount: parsedAmount,
      });
      setPlanning(data);
      setToast({ message: "Entrada extra atualizada", type: "success" });
    } else {
      const data = addExtra(month, {
        description: extraForm.description.trim(),
        date: extraForm.date,
        amount: parsedAmount,
      });
      setPlanning(data);
      setToast({ message: "Entrada extra adicionada", type: "success" });
    }
    resetExtraForm();
  };

  const handleEditExtra = (extra: ExtraEntry) => {
    setExtraForm({
      id: extra.id,
      date: extra.date,
      description: extra.description,
      amount: String(extra.amount),
    });
  };

  const handleDeleteExtra = (extra: ExtraEntry) => {
    const data = deleteExtra(month, extra.id);
    setPlanning(data);
    setToast({ message: "Entrada extra removida", type: "success" });
    if (extraForm.id === extra.id) {
      resetExtraForm();
    }
  };

  const resetBillForm = () => {
    setBillForm({
      id: undefined,
      name: "",
      amount: "",
      dueDay: "1",
    });
    setErrors((prev) => ({ ...prev, bill: undefined }));
  };

  const handleSubmitBill = () => {
    const parsedAmount = parseCurrencyInput(billForm.amount);
    const dueDay = Number(billForm.dueDay);
    if (
      !billForm.name.trim() ||
      Number.isNaN(parsedAmount) ||
      Number.isNaN(dueDay) ||
      dueDay < 1 ||
      dueDay > 31
    ) {
      setErrors((prev) => ({ ...prev, bill: "Preencha nome, valor e dia valido (1-31)" }));
      return;
    }

    if (billForm.id) {
      const data = updateFixedBill(billForm.id, {
        name: billForm.name.trim(),
        amount: parsedAmount,
        dueDay,
      });
      setPlanning(data);
      setToast({ message: "Conta fixa atualizada", type: "success" });
    } else {
      const data = addFixedBill({
        name: billForm.name.trim(),
        amount: parsedAmount,
        dueDay,
      });
      setPlanning(data);
      setToast({ message: "Conta fixa adicionada", type: "success" });
    }
    resetBillForm();
  };

  const handleEditBill = (bill: FixedBill) => {
    setBillForm({
      id: bill.id,
      name: bill.name,
      amount: String(bill.amount),
      dueDay: String(bill.dueDay),
    });
  };

  const handleDeleteBill = (bill: FixedBill) => {
    const data = deleteFixedBill(bill.id);
    setPlanning(data);
    setToast({ message: "Conta fixa removida", type: "success" });
    if (billForm.id === bill.id) {
      resetBillForm();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Planejamento</h2>
          <p className="text-sm text-slate-600">
            Cadastre salario, entradas extras e contas fixas para o mes.
          </p>
        </div>
        <div className="sm:w-60">
          <MonthPicker label="Mes" value={month} onChange={setMonth} />
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <h3 className="text-lg font-semibold text-slate-900">Salario do mes</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1">
            <input
              type="text"
              inputMode="decimal"
              value={salaryInput}
              onChange={(e) => setSalaryInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="0,00"
            />
            {errors.salary && <p className="mt-1 text-xs text-red-600">{errors.salary}</p>}
            <p className="mt-1 text-xs text-slate-500">
              Atual: {formatBRL(salaryValue || 0)}
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
            <h3 className="text-lg font-semibold text-slate-900">Entradas extras</h3>
            <p className="text-sm text-slate-600">
              Total no mes: {formatBRL(extrasTotal)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Data
            <input
              type="date"
              value={extraForm.date}
              onChange={(e) => setExtraForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Descricao
            <input
              type="text"
              value={extraForm.description}
              onChange={(e) =>
                setExtraForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Ex.: bonus"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Valor
            <input
              type="text"
              inputMode="decimal"
              value={extraForm.amount}
              onChange={(e) => setExtraForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="0,00"
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
              <div key={extra.id} className="py-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {extra.description}
                    </p>
                    <p className="text-xs text-slate-600">
                      {extra.date} - {formatBRL(extra.amount)}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs font-semibold">
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
            <h3 className="text-lg font-semibold text-slate-900">Contas fixas</h3>
            <p className="text-sm text-slate-600">
              Total previsto: {formatBRL(fixedTotal)}
            </p>
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
            <input
              type="text"
              inputMode="decimal"
              value={billForm.amount}
              onChange={(e) => setBillForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="0,00"
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
                      {bill.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatBRL(bill.amount)} - Vence dia {bill.dueDay}
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
