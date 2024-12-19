import { io, Socket } from 'socket.io-client';

export const SOCKET_URL = 'http://localhost:3000';

export const createSocket = (): Socket => {
  return io(`${SOCKET_URL}/game`, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });
};