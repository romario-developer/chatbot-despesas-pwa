const ENTRIES_CHANGED_EVENT = "entries:changed";
const ENTRY_CREATED_EVENT = "entry:created";

export const notifyEntriesChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ENTRIES_CHANGED_EVENT));
};

export const notifyEntryCreated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ENTRY_CREATED_EVENT));
};

export const ENTRIES_CHANGED = ENTRIES_CHANGED_EVENT;
export const ENTRY_CREATED = ENTRY_CREATED_EVENT;
