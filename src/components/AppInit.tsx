import { useCallback, useEffect, useMemo } from "react";
import { isAxiosError } from "axios";
import { waitForApiReady } from "../api/client";
import { rawApiUrl, shouldLogApi } from "../services/api";
import { useApiReadyState } from "../hooks/useApiReadyState";

const CONNECTION_TEXT = "Conectando ao servidor…";
const WAKING_TEXT = "Acordando o servidor…";

const isNetworkOrTimeoutError = (error: Error | null) => {
  if (!error) return false;

  if (isAxiosError(error)) {
    if (error.code === "ECONNABORTED") return true;
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("timeout")) return true;
    if (!error.response && message.includes("network")) return true;
  }

  const genericMessage = (error.message ?? "").toLowerCase();
  if (genericMessage.includes("failed to fetch")) return true;
  if (genericMessage.includes("network")) return true;
  return false;
};

const isInvalidApiUrlError = (error: Error | null, rawUrl: string) => {
  if (!error) return false;

  const trimmedRawUrl = rawUrl.trim();
  if (!trimmedRawUrl) {
    return true;
  }

  if (isAxiosError(error) && error.response?.status === 404) {
    return true;
  }

  const message = (error.message ?? "").toLowerCase();
  if (error instanceof TypeError && /failed to fetch/i.test(message)) {
    return true;
  }

  if (error instanceof TypeError && /invalid url/i.test(message)) {
    return true;
  }

  return false;
};

const spinner = (
  <span
    className="h-3 w-3 animate-spin rounded-full border-[2px] border-white border-t-transparent"
    aria-hidden="true"
  />
);

const AppInit = () => {
  const { status, lastError } = useApiReadyState();

  useEffect(() => {
    waitForApiReady().catch(() => {
      /* errors shown in the banner */
    });
  }, []);

  const handleRetry = useCallback(() => {
    waitForApiReady({ force: true }).catch((error) => {
      if (shouldLogApi) {
        // eslint-disable-next-line no-console
        console.error("[api] health retry failed", error);
      }
    });
  }, []);

  const message = useMemo(() => {
    if (status === "failed") {
      if (isInvalidApiUrlError(lastError, rawApiUrl)) {
        return "VITE_API_URL incorreto";
      }
      return "Servidor indisponível no momento";
    }

    if (status === "connecting" && isNetworkOrTimeoutError(lastError)) {
      return WAKING_TEXT;
    }

    return CONNECTION_TEXT;
  }, [status, lastError]);

  if (status === "idle" || status === "ready") {
    return null;
  }

  const bannerClass =
    status === "failed"
      ? "bg-rose-600 text-white border-b border-rose-500/80"
      : "bg-slate-900 text-white border-b border-slate-800/80";
  const showRetry = status === "failed";

  return (
    <div className={`${bannerClass} px-4 py-3 text-sm font-semibold`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {status === "connecting" && spinner}
          <span>{message}</span>
        </div>
        {showRetry && (
          <div className="flex items-center gap-3 text-xs font-normal">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full border border-white/30 px-3 py-1 text-white transition hover:border-white/70 hover:bg-white/10"
            >
              Tentar novamente
            </button>
            <span className="text-white/70">Ou tente recarregar a página.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppInit;
