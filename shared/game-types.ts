export interface GameState {
  ballX: number;
  ballY: number;
  ballSpeed: number;
  playerSpeed: number;
  paddle1Y: number;
  paddle2Y: number;
  score1: number;
  score2: number;
}

export interface Player {
  userID: string;
  paddle: number;
  // client: Socket | null;
}

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
