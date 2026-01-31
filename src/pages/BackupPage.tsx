import type { ChangeEvent } from "react";
import { useCallback, useRef, useState } from "react";
import Toast from "../components/Toast";
import { exportUserBackup, importUserBackup } from "../api/backup";
import type { UserBackup } from "../api/backup";
import { useAuth } from "../contexts/AuthContext";

type ToastState = {
  type: "success" | "error";
  message: string;
};

const sanitizeFileNameSegment = (value?: string) => {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return "usuario";
  return cleaned.replace(/[^a-zA-Z0-9_-]/g, "_");
};

const buildFileName = (userId?: string) => {
  const date = new Date().toISOString().slice(0, 10);
  const id = sanitizeFileNameSegment(userId);
  return `backup_${id}_${date}.json`;
};

const STATUS_OVERRIDES: Record<number, string> = {
  401: "Sessão expirada. Faça login novamente para continuar.",
  403: "Você não tem permissão para realizar essa operação.",
  500: "Erro interno do servidor. Tente novamente mais tarde.",
};

const resolveErrorMessage = (error: unknown, fallback: string) => {
  const status = (error as { status?: number })?.status;
  if (typeof status === "number" && STATUS_OVERRIDES[status]) {
    return STATUS_OVERRIDES[status];
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
};

const BackupPage = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [exportFeedback, setExportFeedback] = useState<ToastState | null>(null);
  const [importFeedback, setImportFeedback] = useState<ToastState | null>(null);

  const userLabel = user?.name ?? user?.email ?? "você";

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportFeedback(null);
    try {
      const backup = await exportUserBackup();
      const payload = JSON.stringify(backup, null, 2);
      const filename = buildFileName(backup.meta?.userId);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      const message = "Backup exportado e download iniciado.";
      setExportFeedback({ type: "success", message });
      setToast({ type: "success", message });
    } catch (error) {
      const message = resolveErrorMessage(error, "Não foi possível exportar o backup.");
      setExportFeedback({ type: "error", message });
      setToast({ type: "error", message });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      input.value = "";
      if (!file || isImporting) return;
      setIsImporting(true);
      setImportFeedback(null);
      try {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error("Arquivo JSON inválido.");
        }

        if (!parsed || typeof parsed !== "object") {
          throw new Error("O backup precisa conter um objeto JSON.");
        }

        const meta = (parsed as UserBackup).meta;
        const hasMetaUserId =
          meta && typeof meta === "object" && typeof meta.userId === "string" && meta.userId.trim();

        if (!hasMetaUserId) {
          throw new Error("O backup precisa conter meta.userId.");
        }

        if (!("data" in (parsed as { data?: unknown }))) {
          throw new Error("O backup precisa conter o campo data.");
        }

        await importUserBackup(parsed as UserBackup);
        const message = "Backup importado com sucesso. Os dados foram restaurados.";
        setImportFeedback({ type: "success", message });
        setToast({ type: "success", message });
      } catch (error) {
        const message = resolveErrorMessage(
          error,
          "Não foi possível importar o backup. Verifique o arquivo e tente novamente.",
        );
        setImportFeedback({ type: "error", message });
        setToast({ type: "error", message });
      } finally {
        setIsImporting(false);
      }
    },
    [isImporting],
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
