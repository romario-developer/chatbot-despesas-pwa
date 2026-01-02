import { useParams } from "react-router-dom";

const EntryFormPlaceholder = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-slate-900">
        {isEdit ? "Editar lancamento" : "Novo lancamento"}
      </h2>
      <p className="text-sm text-slate-600">Em breve.</p>
    </div>
  );
};

export default EntryFormPlaceholder;
