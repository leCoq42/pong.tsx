import { useEffect, useRef } from 'react';
import { Socket, io } from 'socket.io-client';
import { GameRoom } from '../../../shared/types';

export const useGameSocket = (onGameUpdate: (game: GameRoom) => void) => {
  const socketRef = useRef<Socket>();
  const connectedRef = useRef(false);

  useEffect(() => {
    socketRef.current = io('YOUR_SOCKET_URL');
    
    socketRef.current.on('gameUpdate', (game: GameRoom) => {
      onGameUpdate(game);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [onGameUpdate]);

  return socketRef.current;
};
