export type GameMode = "singleplayer" | "local-mp" | "remote-mp";

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
  clients: Client[];
  mode: GameMode;
  isActive: boolean;
  isFinished: boolean;
  gameState: GameState;
  gameConstants: GameConstants;
  winner?: string;
  playersReady: Set<string>;
  matchAccepted: boolean;
  isPaused?: boolean;
}

export interface MatchFoundPayload {
  gameId: string;
  opponent: string;
  timeToAccept: number;
}

export interface MatchAcceptedPayload {
  gameId: string;
  playerId: string;
}

export interface Client {
  id: string;
}

export interface Player {
  score: number;
  position: number;
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
  players: Player[];
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
