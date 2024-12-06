export default interface Player {
  id: string;
  position: number;
  score: number;
}

export default interface GameState {
  ball: { x: number; y: number; dirX: number; dirY: number; speed: number };
  players: Player[];
  isActive: boolean;
  score1: number;
  score2: number;
}
