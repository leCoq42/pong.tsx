import { customAlphabet, nanoid } from 'nanoid';

export const createGameID = customAlphabet(
  '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  6,
);

export const createLobbyID = () => nanoid();
