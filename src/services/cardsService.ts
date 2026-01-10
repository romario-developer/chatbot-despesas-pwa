import { listCards } from "../api/cards";
import type { CreditCard } from "../types";

const CACHE_TTL_MS = 60_000;
let cachedCards: CreditCard[] | null = null;
let cachedAt = 0;
let inFlight: Promise<CreditCard[]> | null = null;

export const listCardsCached = async (
  options: { force?: boolean } = {},
): Promise<CreditCard[]> => {
  const now = Date.now();
  if (!options.force && cachedCards && now - cachedAt < CACHE_TTL_MS) {
    return cachedCards;
  }

  if (!options.force && inFlight) {
    return inFlight;
  }

  inFlight = listCards()
    .then((result) => {
      cachedCards = result.cards;
      cachedAt = Date.now();
      return result.cards;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export const clearCardsCache = () => {
  cachedCards = null;
  cachedAt = 0;
};
