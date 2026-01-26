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
    });
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-slate-900/90 px-4 py-3 text-sm text-white shadow-2xl shadow-slate-900/60 sm:bottom-6 sm:right-6 sm:left-auto">
      <span>Nova versão disponível</span>
      <button
        type="button"
        onClick={handleUpdate}
        className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:bg-primary/90"
      >
        Atualizar agora
      </button>
    </div>
  );
};

export default ServiceWorkerUpdate;
