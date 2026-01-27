import { useSyncExternalStore } from "react";
import { getApiReadyState, subscribeToApiReadyState } from "../api/client";
import type { ApiReadyState } from "../api/client";

const getSnapshot = () => getApiReadyState();

const subscribe = (onStoreChange: () => void) =>
  subscribeToApiReadyState(onStoreChange);

const getServerSnapshot = () => getSnapshot();

export const useApiReadyState = (): ApiReadyState =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
