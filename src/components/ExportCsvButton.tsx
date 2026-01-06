import { useState } from "react";
import { getStoredToken } from "../api/client";
import { exportExpensesCsv, ExportCsvError } from "../utils/exportCsv";
import Toast from "./Toast";

type ExportCsvButtonProps = {
  selectedMonth: string;
};

const ExportCsvButton = ({ selectedMonth }: ExportCsvButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(
    null,
  );

  const handleClick = async () => {
    if (isLoading) return;

    const token = getStoredToken();
    if (!token) {
      setToast({ message: "Sessao expirada. Faca login novamente.", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      await exportExpensesCsv(selectedMonth, token);
    } catch (err) {
      let message = "Nao foi possivel exportar. Tente novamente.";
      if (err instanceof ExportCsvError) {
        if (err.status === 401 || err.status === 403) {
          message = "Sessao expirada. Faca login novamente.";
        } else if (err.status === 413) {
          message = err.message || message;
        }
      }
      setToast({ message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
      >
        {isLoading ? "Exportando..." : "Exportar CSV"}
      </button>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default ExportCsvButton;
