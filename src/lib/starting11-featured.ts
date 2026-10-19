import curatedPlayers from "../data/starting11-curated-players.json";

export const STARTING11_MIN_INTERNATIONAL_CAPS = 10;
export const STARTING11_MIN_HIGHEST_MARKET_VALUE_EUR = 10_000_000;

const CURATED_PLAYER_IDS = new Set(curatedPlayers.playerIds);

export interface Starting11PlayerSignals {
  transfermarktId: number;
  internationalCaps: number | null;
  highestMarketValue: number | null;
}

export function isStarting11FeaturedPlayer(player: Starting11PlayerSignals): boolean {
  return (
    CURATED_PLAYER_IDS.has(player.transfermarktId) ||
    (player.internationalCaps ?? 0) >= STARTING11_MIN_INTERNATIONAL_CAPS ||
    (player.highestMarketValue ?? 0) >= STARTING11_MIN_HIGHEST_MARKET_VALUE_EUR
  );
}

export function starting11FeaturedPlayerFilter() {
  return {
    OR: [
      { internationalCaps: { gte: STARTING11_MIN_INTERNATIONAL_CAPS } },
      { highestMarketValue: { gte: STARTING11_MIN_HIGHEST_MARKET_VALUE_EUR } },
      { transfermarktId: { in: [...CURATED_PLAYER_IDS] } },
    ],
  };
}
