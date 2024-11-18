import { io } from "socket.io-client";

const PingServer = () => {
  const socket = io("http://localhost:3000");

  const onPing = () => {
    socket.emit("ping");
  };

  socket.on("pong", () => {
    console.log("pong");
  });

  socket.on("newMessage", () => {
    console.log("received message");
  });

  return (
    <div>
      <button onClick={onPing}>ping</button>
    </div>
  );
};

export default PingServer;
