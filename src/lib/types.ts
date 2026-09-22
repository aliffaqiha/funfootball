export type GameMode = "trivia" | "starting11" | "transfer" | "guess";

export type GameModeOrHome = GameMode | "";

export interface GameProps {
  hostView: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export interface PoolCountry {
  rank: number;
  code: string;
  name: string;
  flag: string;
}

export interface PoolClub {
  id: string;
  name: string;
  country: string;
  color: string;
  flag: string;
}

export interface GachaPool {
  countries: PoolCountry[];
  clubs: PoolClub[];
}