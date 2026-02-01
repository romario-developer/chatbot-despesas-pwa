import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

const ServiceWorkerUpdate = () => {
  const [visible, setVisible] = useState(false);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        setVisible(true);
      },
      onOfflineReady() {
        console.log("PWA offline ready");
      },
    });
    updateRef.current = update;
  }, []);

  if (!visible) {
    return null;
  }

  const handleUpdate = () => {
    updateRef.current?.(true).then(() => {
      setVisible(false);
      setTimeout(() => window.location.reload(), 200);
    });
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[min(420px,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-2xl shadow-slate-900/40 sm:bottom-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">Atualização</p>
        <p className="text-sm font-semibold">Nova versão disponível.</p>
      </div>
      <button
        type="button"
        onClick={handleUpdate}
        className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:bg-[var(--primary-dark)]"
      >
        Atualizar agora
      </button>
    </div>
  );
};

export default ServiceWorkerUpdate;
