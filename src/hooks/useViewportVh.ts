import { useEffect } from "react";

const setVh = () => {
  if (typeof window === "undefined") return;
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
};

const useViewportVh = (enabled = true) => {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    // Mobile UIs change chrome height, so we mirror innerHeight into --vh instead of trusting 100vh.
    setVh();
    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);
    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
    };
  }, [enabled]);
};

export default useViewportVh;
