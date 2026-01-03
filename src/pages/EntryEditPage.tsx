import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEntry, listEntries, updateEntry } from "../api/entries";
import { listCategories } from "../api/categories";
import EntryForm from "../components/EntryForm";
import { monthToRange } from "../utils/dateRange";
import type { Entry } from "../types";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const EntryEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<unknown>([]);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await listCategories();
        setCategories(data);
      } catch {
        setCategories([]);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadEntry = async () => {
      if (!id) {
        setError("ID invalido.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      let found: Entry | null = null;
      let message: string | null = null;

      try {
        found = await getEntry(id);
      } catch (primaryError) {
        try {
          const { from, to } = monthToRange(currentMonth());
          const list = await listEntries({ from, to });
          const safeList = Array.isArray(list) ? list : [];
          found = safeList.find((item) => String(item.id) === String(id)) ?? null;
          if (!found) {
            throw primaryError;
          }
        } catch (fallbackError) {
          message =
            fallbackError instanceof Error
              ? fallbackError.message
              : "Nao foi possivel carregar o lancamento.";
        }
      }

      if (found) {
        setEntry(found);
      } else {
        setEntry(null);
        setError(message ?? "Lancamento nao encontrado.");
      }

      setIsLoading(false);
    };

    loadEntry();
  }, [id]);

  const safeCategories = useMemo(
    () =>
      Array.isArray(categories)
        ? categories
        : Object.keys((categories ?? {}) as Record<string, unknown>),
    [categories],
  );

  const handleSubmit = async (payload: Parameters<typeof updateEntry>[1]) => {
    if (!id) return;
    setError(null);
    try {
      await updateEntry(id, payload);
      navigate("/entries", {
        replace: true,
        state: { toast: { message: "Lancamento atualizado", type: "success" as const } },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao atualizar lancamento.";
      setError(message);
      throw err;
    }
  };

  const handleCancel = () => navigate("/entries");

  if (isLoading) {
    return (
      <div className="card p-4 text-sm text-slate-600">Carregando lancamento...</div>
    );
  }

  if (error || !entry) {
    return (
      <div className="card space-y-3 p-4">
        <p className="text-sm text-red-700">
          {error ?? "Lancamento nao encontrado."}
        </p>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Editar lancamento</h2>
        <p className="text-sm text-slate-600">
          Atualize os campos do lancamento selecionado.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <EntryForm
        categories={safeCategories}
        initialValues={entry}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default EntryEditPage;
