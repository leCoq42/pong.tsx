import { io } from 'socket.io-client';

export const createSocket = () => {
  return io('your-socket-server-url', {
    transports: ['websocket'],
    reconnection: true,
  });
};