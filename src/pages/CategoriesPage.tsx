import { useCallback, useEffect, useMemo, useState } from "react";
import Toast from "../components/Toast";
import {
  deleteCategory,
  listCategories,
  updateCategory,
} from "../api/categories";
import type { Category } from "../types";

type CategoryFilter = "active" | "inactive" | "all";

const FILTER_OPTIONS: { label: string; value: CategoryFilter }[] = [
  { label: "Ativas", value: "active" },
  { label: "Desativadas", value: "inactive" },
  { label: "Todas", value: "all" },
];

const CategoriesPage = () => {
  const [filter, setFilter] = useState<CategoryFilter>("active");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeParam = filter === "all" ? "all" : filter === "active";
      const data = await listCategories({ active: activeParam });
      setCategories(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar categorias.";
      setError(message);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  const startRenaming = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const handleRename = async (category: Category) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setToast({ message: "Informe um nome valido.", type: "error" });
      return;
    }

    if (trimmed === category.name) {
      setEditingId(null);
      setEditingName("");
      return;
    }

    setProcessingId(category.id);
    try {
      await updateCategory(category.id, { name: trimmed });
      setToast({ message: "Categoria atualizada.", type: "success" });
      setEditingId(null);
      setEditingName("");
      await loadCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar categoria.";
      setToast({ message, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleActive = async (category: Category) => {
    const targetState = !(category.isActive ?? true);
    setProcessingId(category.id);
    try {
      await updateCategory(category.id, { isActive: targetState });
      setToast({
        message: targetState ? "Categoria reativada." : "Categoria desativada.",
        type: "success",
      });
      await loadCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar categoria.";
      setToast({ message, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (category: Category) => {
    setProcessingId(category.id);
    try {
      await deleteCategory(category.id);
      setToast({ message: "Categoria removida.", type: "success" });
      await loadCategories();
    } catch (err) {
      const apiError = err as Error & { status?: number };
      if (apiError?.status === 409) {
        setToast({
          message: "Categoria em uso. Desative em vez de excluir.",
          type: "error",
        });
      } else {
        const message = err instanceof Error ? err.message : "Erro ao remover categoria.";
        setToast({ message, type: "error" });
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Categorias</h2>
          <p className="text-sm text-slate-600">
            Renomeie, ative/desative ou exclua categorias cadastradas.
          </p>
        </div>
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
                filter === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-sm text-slate-600">
          Carregando categorias...
        </div>
      ) : sortedCategories.length ? (
        <div className="space-y-3">
          {sortedCategories.map((category) => {
            const isActive = category.isActive ?? true;
            const isProcessing = processingId === category.id;
            const isEditing = editingId === category.id;
            return (
              <div
                key={category.id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      disabled={isProcessing}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">{category.name}</p>
                  )}
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    {isActive ? "Ativa" : "Desativada"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleRename(category)}
                        disabled={isProcessing}
                        className="rounded-full border border-primary px-3 py-1 text-primary transition hover:bg-primary/10 disabled:opacity-70"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditingName("");
                        }}
                        disabled={isProcessing}
                        className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-primary hover:text-primary disabled:opacity-70"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startRenaming(category)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-primary hover:text-primary"
                    >
                      Renomear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(category)}
                    disabled={isProcessing}
                    className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-primary hover:text-primary disabled:opacity-70"
                  >
                    {isActive ? "Desativar" : "Reativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    disabled={isProcessing}
                    className="rounded-full border border-rose-200 px-3 py-1 text-rose-600 transition hover:bg-rose-50 disabled:opacity-70"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-sm text-slate-600">
          Nenhuma categoria encontrada para o filtro selecionado.
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};

export default CategoriesPage;
