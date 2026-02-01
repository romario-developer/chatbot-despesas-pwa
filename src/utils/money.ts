const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

export const formatCentsToBRL = (cents: number) => {
  const safe = Number.isFinite(cents) ? cents : 0;
  return currencyFormatter.format(safe / 100);
};

export const parseBRLToCents = (value: string) => {
  if (!value) return 0;
  const sanitized = value.replace(/[^\d,.-]/g, "");
  const normalized = sanitized.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
};
