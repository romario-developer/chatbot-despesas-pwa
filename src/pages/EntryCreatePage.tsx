import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEntry } from "../api/entries";
import { listCategories } from "../api/categories";
import EntryForm from "../components/EntryForm";
import { notifyEntriesChanged } from "../utils/entriesEvents";

const EntryCreatePage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<unknown>([]);
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

  const safeCategories = useMemo(
    () =>
      Array.isArray(categories)
        ? categories
        : Object.keys((categories ?? {}) as Record<string, unknown>),
    [categories],
  );

  const handleSubmit = async (payload: Parameters<typeof createEntry>[0]) => {
    setError(null);
    try {
      await createEntry(payload);
      notifyEntriesChanged();
      navigate("/entries", {
        replace: true,
        state: { toast: { message: "Lancamento criado", type: "success" as const } },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar lancamento.";
      setError(message);
      throw err;
    }
  };

  const handleCancel = () => navigate("/entries");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Novo lancamento</h2>
        <p className="text-sm text-slate-600">Preencha os campos para criar um lancamento.</p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <EntryForm
        categories={safeCategories}
        initialValues={{ date: new Date().toISOString().slice(0, 10) }}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default EntryCreatePage;
