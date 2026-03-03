import { useEffect, useMemo, useState } from "react";
import MonthPicker, {
  MonthPickerFieldTrigger,
  monthPickerFieldButtonClassName,
} from "../components/MonthPicker";
import MoneyInput from "../components/MoneyInput";
import Toast from "../components/Toast";
import { savePlanning } from "../api/planning";
import { listCategories } from "../api/categories";
import { formatCentsToBRL } from "../utils/money";
import {
  formatMonthLabel,
  getCurrentMonthInTimeZone,
  getDefaultMonthRange,
} from "../utils/months";
import { type Planning, type PlanningExtra, type Category } from "../types";
import { useDashboard, usePlanning } from "../hooks/queries";
import { DATA_CHANGED_EVENT, type DataChangedDetail } from "../utils/dataBus";

const currentMonth = () => getCurrentMonthInTimeZone("America/Bahia");

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const getMonthKey = (value: string | Date) => {
  if (value instanceof Date) return value.toISOString().slice(0, 7);
  if (typeof value === "string" && value.length >= 7) return value.slice(0, 7);
  return new Date().toISOString().slice(0, 7);
};

const toCents = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : 0;
};

type ToastState = { message: string; type: "success" | "error" } | null;

const PlanningPage = () => {
  const currentMonthValue = useMemo(() => currentMonth(), []);
  const monthRange = useMemo(() => getDefaultMonthRange({ endMonth: currentMonthValue, monthsBack: 24 }), [currentMonthValue]);
  const [month, setMonth] = useState(currentMonthValue);
  const monthKey = useMemo(() => getMonthKey(month), [month]);

  const [planning, setPlanning] = useState<Planning>({ salaryByMonth: {}, extrasByMonth: {}, fixedBills: [] });
  const [salaryCents, setSalaryCents] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [extraForm, setExtraForm] = useState<{ id?: string; date: string; description: string; amountCents: number }>({
    date: `${currentMonthValue}-01`, description: "", amountCents: 0,
  });
  
  const [errors, setErrors] = useState<{ salary?: string; extra?: string }>({});
  const [toast, setToast] = useState<ToastState>(null);

  const { planning: remotePlanning, isLoading: planningLoading, refetch: refetchPlanning } = usePlanning(monthKey);
  const { data: dashboardSummary } = useDashboard(monthKey);

  useEffect(() => {
    if (remotePlanning) setPlanning(remotePlanning);
    listCategories({ active: true }).then(setCategories);
  }, [remotePlanning]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleDataChanged = (event: Event) => {
      const detail = (event as CustomEvent<DataChangedDetail>).detail;
      if (!detail.month || detail.month === monthKey) void refetchPlanning();
    };
    window.addEventListener(DATA_CHANGED_EVENT, handleDataChanged);
    window.addEventListener("planning-updated", () => refetchPlanning());
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, handleDataChanged);
      window.removeEventListener("planning-updated", () => refetchPlanning());
    };
  }, [monthKey, refetchPlanning]);

  useEffect(() => {
    setSalaryCents(toCents(planning.salaryByMonth?.[monthKey] ?? 0));
    setExtraForm(prev => ({ ...prev, date: `${monthKey}-01` }));
  }, [monthKey, planning.salaryByMonth]);

  const salaryValue = toCents(planning.salaryByMonth?.[monthKey] ?? 0);
  const monthExtras = useMemo(() => Array.isArray(planning.extrasByMonth?.[monthKey]) ? planning.extrasByMonth[monthKey] : [], [planning.extrasByMonth, monthKey]);
  const extrasTotal = monthExtras.reduce((sum, item) => sum + toCents(item.amount), 0);
  const categoryBudgets = (planning as any).categoryBudgets || {};

  // --- ACTIONS ---
  const handleSaveSalary = async () => {
    if (salaryCents < 0) { setErrors(prev => ({ ...prev, salary: "Valor inválido" })); return; }
    const next: Planning = { ...planning, salaryByMonth: { ...planning.salaryByMonth, [monthKey]: salaryCents } };
    setPlanning(next);
    try {
      await savePlanning(next);
      setToast({ message: "Salário salvo", type: "success" });
      setErrors(prev => ({ ...prev, salary: undefined }));
    } catch { setToast({ message: "Erro ao salvar", type: "error" }); }
  };

  const handleUpdateBudget = async (catName: string, val: number) => {
    const next = { ...planning, categoryBudgets: { ...categoryBudgets, [catName]: val } };
    setPlanning(next as any);
    try {
      await savePlanning(next as any);
      setToast({ message: `Meta de ${catName} salva`, type: "success" });
      refetchPlanning();
    } catch { setToast({ message: "Erro ao salvar meta", type: "error" }); }
  };

  const resetExtraForm = () => { setExtraForm({ id: undefined, date: `${monthKey}-01`, description: "", amountCents: 0 }); setErrors(prev => ({ ...prev, extra: undefined })); };

  const handleSubmitExtra = async () => {
    if (!extraForm.description.trim() || extraForm.amountCents <= 0) {
      setErrors(prev => ({ ...prev, extra: "Preencha descrição e valor válido" })); return;
    }
    const currentList = Array.isArray(planning.extrasByMonth[monthKey]) ? planning.extrasByMonth[monthKey] : [];
    const nextList: PlanningExtra[] = extraForm.id
      ? currentList.map(item => item.id === extraForm.id ? { ...item, description: extraForm.description, label: extraForm.description, date: extraForm.date, amount: extraForm.amountCents } : item)
      : [...currentList, { id: createId(), description: extraForm.description, label: extraForm.description, date: extraForm.date, amount: extraForm.amountCents }];
    
    const nextPlanning: Planning = { ...planning, extrasByMonth: { ...planning.extrasByMonth, [monthKey]: nextList } };
    setErrors(prev => ({ ...prev, extra: undefined }));
    setPlanning(nextPlanning);
    try {
      await savePlanning(nextPlanning);
      setToast({ message: extraForm.id ? "Extra atualizado" : "Extra adicionado", type: "success" });
    } catch { setToast({ message: "Erro ao salvar", type: "error" }); }
    resetExtraForm();
  };

  const handleDeleteExtra = async (extra: PlanningExtra) => {
    const nextList = monthExtras.filter(item => item.id !== extra.id);
    const nextPlanning: Planning = { ...planning, extrasByMonth: { ...planning.extrasByMonth, [monthKey]: nextList } };
    setPlanning(nextPlanning);
    try {
      await savePlanning(nextPlanning);
      setToast({ message: "Extra removido", type: "success" });
    } catch { setToast({ message: "Erro ao remover", type: "error" }); }
  };

  if (planningLoading) return <div className="p-4 space-y-4 animate-pulse"><div className="h-8 w-48 rounded-full bg-slate-200" /><div className="h-32 rounded-xl bg-slate-200" /></div>;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 overflow-x-hidden">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Planejamento</h2>
          <p className="text-sm text-slate-600">Gerencie salários, ganhos extras e metas de gastos.</p>
        </div>
        <MonthPicker valueMonth={month} onChangeMonth={value => setMonth(getMonthKey(value))} minMonth={monthRange.start} maxMonth={monthRange.end} buttonClassName={monthPickerFieldButtonClassName} trigger={<MonthPickerFieldTrigger label={formatMonthLabel(month)} />} />
      </div>

      {/* SALÁRIO */}
      <div className="card flex flex-col sm:flex-row gap-4 p-5 items-end">
        <div className="flex-1 w-full">
          <label className="text-sm font-bold text-slate-500 uppercase mb-2 block">Salário Mensal</label>
          <MoneyInput valueCents={salaryCents} onChangeCents={setSalaryCents} className="w-full text-lg" />
          <p className="mt-1 text-xs text-slate-500">Atual: {formatCentsToBRL(salaryValue)}</p>
          {errors.salary && <p className="mt-1 text-xs font-medium text-rose-600">{errors.salary}</p>}
        </div>
        <button onClick={handleSaveSalary} className="btn-primary w-full sm:w-auto h-12">Salvar</button>
      </div>

      {/* NOVO: METAS POR CATEGORIA */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">🎯 Metas de Gastos</h3>
        <p className="text-sm text-slate-600">Acompanhe seus limites. A IA avisará se você chegar perto de estourar o orçamento.</p>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const goalCents = categoryBudgets[cat.name] || 0;
            const spentCents = dashboardSummary?.byCategory?.find((c) => c.category === cat.name)?.total || 0;
            const percent = goalCents > 0 ? Math.min((spentCents / goalCents) * 100, 100) : 0;
            
            // Cores dinâmicas baseadas no progresso
            const isDanger = percent >= 100;
            const isWarning = percent >= 80 && !isDanger;
            const barColor = isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-[#25D366]';
            const textColor = isDanger ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-500';

            return (
              <div key={cat.id} className="card p-4 transition-all hover:shadow-md">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold text-slate-800">{cat.name}</span>
                  <span className={`text-xs font-bold ${textColor}`}>{percent.toFixed(0)}%</span>
                </div>
                
                <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full transition-all duration-700 ${barColor}`} style={{ width: `${percent}%` }} />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-4 uppercase tracking-wider">
                  <span>Usado: {formatCentsToBRL(spentCents)}</span>
                  <span>Teto: {goalCents > 0 ? formatCentsToBRL(goalCents) : '---'}</span>
                </div>
                
                <MoneyInput valueCents={goalCents} onChangeCents={(val) => handleUpdateBudget(cat.name, val)} placeholder="Definir meta" className="h-9 w-full text-xs" />
              </div>
            );
          })}
        </div>
      </div>

      {/* ENTRADAS EXTRAS */}
      <div className="card space-y-4 p-5 mt-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{extraForm.id ? "Editar ganho extra" : "Ganhos Extras"}</h3>
            <p className="text-sm text-slate-500">Renda extra no mês: {formatCentsToBRL(extrasTotal)}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-slate-700">Data<input type="date" value={extraForm.date} onChange={e => setExtraForm(p => ({ ...p, date: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 p-2 outline-none focus:border-primary" /></label>
          <label className="text-sm font-medium text-slate-700">Origem<input type="text" value={extraForm.description} onChange={e => setExtraForm(p => ({ ...p, description: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 p-2 outline-none focus:border-primary" placeholder="Ex: Venda, Freela" /></label>
          <label className="text-sm font-medium text-slate-700">Valor<MoneyInput valueCents={extraForm.amountCents} onChangeCents={v => setExtraForm(p => ({ ...p, amountCents: v }))} className="mt-1 w-full" /></label>
        </div>
        
        <div className="flex justify-end gap-2 pt-2">
          {extraForm.id && <button onClick={resetExtraForm} className="btn-secondary">Cancelar</button>}
          <button onClick={handleSubmitExtra} className="btn-primary">{extraForm.id ? "Salvar" : "Adicionar Extra"}</button>
        </div>
        {errors.extra && <p className="text-xs font-medium text-rose-600">{errors.extra}</p>}

        {/* Lista de Extras */}
        <div className="divide-y divide-slate-100 pt-2">
          {monthExtras.map(extra => (
            <div key={extra.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-slate-800">{extra.description ?? extra.label}</p>
                <p className="text-xs text-slate-500">{extra.date?.slice(0, 10)} · {formatCentsToBRL(toCents(extra.amount))}</p>
              </div>
              <div className="flex gap-3 text-xs font-bold">
                <button onClick={() => { setExtraForm({ id: extra.id, date: extra.date || '', description: extra.description || '', amountCents: toCents(extra.amount) }) }} className="text-primary">Editar</button>
                <button onClick={() => handleDeleteExtra(extra)} className="text-rose-500">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default PlanningPage;
