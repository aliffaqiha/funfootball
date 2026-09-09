export type GameMode = "trivia" | "starting11" | "transfer" | "guess";

export type GameModeOrHome = GameMode | "";

export interface GameProps {
  hostView: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}