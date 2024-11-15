export type CreateGameFields = {
  name: string;
  playerId: string;
  opponentId?: string;
};

export type JoinGameFields = {
  gameID: string;
};

export type RejoinGameFields = {
  gameID: string;
};
