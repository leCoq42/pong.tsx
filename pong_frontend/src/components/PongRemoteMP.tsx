import { io } from "socket.io-client";
import { gameProps, GameState } from "../types";

const PongRemoteMP = (props: gameProps) => {
  const socket = io("http://localhost:3000");

  const onPing = () => {
    socket.emit("events", { test: "test" });
    socket.emit("identity", 0, (response: string) =>
      console.log("Identity:", response),
    );
  };

  socket.on("connect", function () {
    console.log("Connected");
  });

  socket.on("events", function (data) {
    console.log("event", data);
  });

  socket.on("exception", function (data) {
    console.log("event", data);
  });

  socket.on("disconnect", function () {
    console.log("Disconnected");
  });

  return (
    <div>
      <button onClick={onPing}>ping</button>
    </div>
  );
};

export default PongRemoteMP;
