const ENTRIES_CHANGED_EVENT = "entries:changed";

export const notifyEntriesChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ENTRIES_CHANGED_EVENT));
};

export const ENTRIES_CHANGED = ENTRIES_CHANGED_EVENT;
