import { io, Socket } from "socket.io-client";

export const SOCKET_URL = "http://localhost:3000";

export const createSocket = (): Socket => {
  const socket = io(`${SOCKET_URL}/game`, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
  });

  socket.on("connect_failed", () => {
    console.error("Connection failed");
  });

  return socket;
};
