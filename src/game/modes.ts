export interface GameMode {
  id: string;
  name: string;
  maxTicks: number;
  getWinner(params: { p1Live: number; p2Live: number; tick: number }): "P1" | "P2" | "Draw";
}

export const classicDuel: GameMode = {
  id: "classic-duel",
  name: "Classic Duel",
  maxTicks: 100,
  getWinner({ p1Live, p2Live }) {
    if (p1Live > p2Live) return "P1";
    if (p2Live > p1Live) return "P2";
    return "Draw";
  },
};

export const defaultMode: GameMode = classicDuel;
