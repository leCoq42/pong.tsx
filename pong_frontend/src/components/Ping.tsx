import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const PingServer = () => {
  socket.emit("ping", () => {
    console.log("ping");
  });

  socket.on("pong", () => {
    console.log("pong");
  });

  socket.on("newMessage", () => {
    console.log("received message");
  });

  return <div>Pinged the server!</div>;
};

export default PingServer;
