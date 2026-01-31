import type { ChangeEvent } from "react";
import { useCallback, useRef, useState } from "react";
import Toast from "../components/Toast";
import { useAuth } from "../contexts/AuthContext";
import { useBackupActions } from "../hooks/useBackupActions";

type ToastState = {
  type: "success" | "error";
  message: string;
};

const BackupPage = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [exportFeedback, setExportFeedback] = useState<ToastState | null>(null);
  const [importFeedback, setImportFeedback] = useState<ToastState | null>(null);
  const { exportBackup, importBackup, isExporting, isImporting } = useBackupActions();

  const userLabel = user?.name ?? user?.email ?? "você";

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setExportFeedback(null);
    try {
      const message = await exportBackup();
      setExportFeedback({ type: "success", message });
      setToast({ type: "success", message });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível exportar o backup.";
      setExportFeedback({ type: "error", message });
      setToast({ type: "error", message });
    }
  }, [exportBackup, isExporting]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      input.value = "";
      if (!file || isImporting) return;
      setImportFeedback(null);
      try {
        const message = await importBackup(file);
        setImportFeedback({ type: "success", message });
        setToast({ type: "success", message });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível importar o backup. Verifique o arquivo e tente novamente.";
        setImportFeedback({ type: "error", message });
        setToast({ type: "error", message });
      }
    },
    [importBackup, isImporting],
  );

  return (
    <div className="space-y-6">
      <header className="space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Backup manual
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Segurança extra para os seus dados
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {userLabel}, exporte e importe o backup do seu perfil sempre que quiser adicionar uma
          camada extra de confiança.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Exportar backup</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              É gerado um JSON com os dados do usuário autenticado.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="rounded-full border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary transition hover:bg-primary hover:text-white disabled:opacity-60"
          >
            {isExporting ? "Exportando..." : "Exportar backup"}
          </button>
        </div>
        {exportFeedback && (
          <p
            className={[
              "mt-3 text-sm font-semibold",
              exportFeedback.type === "error" ? "text-rose-600" : "text-emerald-600",
            ].join(" ")}
          >
            {exportFeedback.message}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Importar backup
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha um arquivo JSON exportado pelo próprio aplicativo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={isImporting}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {isImporting ? "Importando..." : "Selecionar arquivo"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Validação mínima: <span className="font-semibold">meta.userId</span> e <span className="font-semibold">data</span>.
        </p>
        <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-400/40 dark:bg-yellow-950/70 dark:text-yellow-200">
          Importar backup pode sobrescrever dados atuais.
        </div>
        {importFeedback && (
          <p
            className={[
              "mt-3 text-sm font-semibold",
              importFeedback.type === "error" ? "text-rose-600" : "text-emerald-600",
            ].join(" ")}
          >
            {importFeedback.message}
          </p>
        )}
      </section>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default BackupPage;
