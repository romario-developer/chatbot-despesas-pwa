/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import type { PrecacheEntry } from "workbox-precaching";
import { NetworkOnly } from "workbox-strategies";
import { registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry>;
};

const isExpensiveExport = ({ url }: { url: URL }) =>
  url.pathname.startsWith("/api/admin/exports/expenses.csv");

const isApiCall = ({ url }: { url: URL }) => url.pathname.startsWith("/api/");

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(isExpensiveExport, new NetworkOnly());
registerRoute(isApiCall, new NetworkOnly());

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.resolve(clientsClaim()));
});
