export type CreateGameFields = {
  name: string;
  pointsToWin: number;
};

export type JoinGameFields = {
  gameID: string;
  name: string;
};

export type RejoinGameFields = {
  gameID: string;
  userID: string;
  name: string;
};
