import { getCurrentMonthInTimeZone } from "./months";
import { invalidateMonthCaches } from "../api/queryClient";

const ENTRIES_CHANGED_EVENT = "entries:changed";
const ENTRY_CREATED_EVENT = "entry:created";

const ensureMonth = (month?: string) =>
  month ?? getCurrentMonthInTimeZone("America/Bahia");

export const notifyEntriesChanged = (month?: string) => {
  if (typeof window === "undefined") return;
  const targetMonth = ensureMonth(month);
  invalidateMonthCaches(targetMonth);
  window.dispatchEvent(new Event(ENTRIES_CHANGED_EVENT));
};

export const notifyEntryCreated = (month?: string) => {
  if (typeof window === "undefined") return;
  const targetMonth = ensureMonth(month);
  invalidateMonthCaches(targetMonth);
  window.dispatchEvent(new Event(ENTRY_CREATED_EVENT));
};

export const ENTRIES_CHANGED = ENTRIES_CHANGED_EVENT;
export const ENTRY_CREATED = ENTRY_CREATED_EVENT;
