export type DataChangedScope = "entries" | "planning" | "dashboard" | "all";

export type DataChangedDetail = {
  scope: DataChangedScope;
  month?: string;
};

export const DATA_CHANGED_EVENT = "data:changed";

export const createDataChangedEvent = (detail: DataChangedDetail) =>
  new CustomEvent<DataChangedDetail>(DATA_CHANGED_EVENT, { detail });

export const emitDataChanged = (detail: DataChangedDetail) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(createDataChangedEvent(detail));
};
