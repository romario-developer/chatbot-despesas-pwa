import { invalidateCacheKey, invalidateCacheKeys } from "./liveQueryCache";

export const dashboardSummaryKey = (month: string) => `dashboard-summary:${month}`;
export const entriesKey = (month: string) => `entries:${month}`;
export const planningKey = (month: string) => `planning:${month}`;
export const cardsSummaryKey = "cards-summary";

export const invalidateCachesForMonth = (month: string) => {
  invalidateCacheKeys([
    dashboardSummaryKey(month),
    entriesKey(month),
    planningKey(month),
  ]);
};

export const invalidateCardsSummary = () => {
  invalidateCacheKey(cardsSummaryKey);
};
