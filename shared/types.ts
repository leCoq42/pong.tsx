export interface Room {
  players: Player[];
  roomID: string;
}

export enum ClientEvents {
  Ping = "client.ping",

  LobbyCreate = "client.lobby.create",
}

export enum ServerEvents {
  Pong = "server.pong",

  GameMessage = "server.game.message",
}

export type ServerPayloads = {
  [ServerEvents.Pong]: {
    message: string;
  };

  [ServerEvents.GameMessage]: {
    message: string;
    color?: "red" | "blue" | "green" | "orange";
  };
};

export interface GameRoom {
  gameId: string;
  players: Player[];
  mode: "singleplayer" | "multiplayer";
  isActive: boolean;
  isFinished: boolean;
  gameState: GameState;
  gameConstants: GameConstants;
  winner?: string;
}

export interface Player {
  id: string;
  position: number;
  score: number;
}

export interface Ball {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
}

export interface GameState {
  ball: Ball;
  score1: number;
  score2: number;
  paddle1Y: number;
  paddle2Y: number;
}

export interface GameConstants {
  PADDLE_HEIGHT: number;
  PADDLE_WIDTH: number;
  BALL_SIZE: number;
  BALL_SPEED: number;
  BALL_ACCELERATION: number;
  PADDLE_SPEED: number;
  CANVAS_WIDTH: number;
  CANVAS_HEIGHT: number;
  WIN_SCORE: number;
}
