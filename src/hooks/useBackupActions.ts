import { useCallback, useState } from "react";
import { exportUserBackup, importUserBackup } from "../api/backup";
import type { UserBackup } from "../api/backup";

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

const readBackupFile = async (file: File): Promise<UserBackup> => {
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

  return parsed as UserBackup;
};

export const useBackupActions = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const exportBackup = useCallback(async (): Promise<string> => {
    setIsExporting(true);
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
      return "Backup exportado e download iniciado.";
    } catch (error) {
      throw new Error(resolveErrorMessage(error, "Não foi possível exportar o backup."));
    } finally {
      setIsExporting(false);
    }
  }, []);

  const importBackup = useCallback(async (file: File): Promise<string> => {
    setIsImporting(true);
    try {
      const payload = await readBackupFile(file);
      await importUserBackup(payload);
      return "Backup importado com sucesso. Os dados foram restaurados.";
    } catch (error) {
      throw new Error(
        resolveErrorMessage(error, "Não foi possível importar o backup. Verifique o arquivo e tente novamente."),
      );
    } finally {
      setIsImporting(false);
    }
  }, []);

  return {
    exportBackup,
    importBackup,
    isExporting,
    isImporting,
  };
};
