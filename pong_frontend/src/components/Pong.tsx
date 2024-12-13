import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { gameProps } from "../types";
import { GameRoom } from "../../../shared/types";

const lerp = (start: number, end: number, t: number) => {
  t = Math.max(0, Math.min(1, t));
  return start * (1 - t) + end * t;
};

const Pong = (props: gameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket>();
  const connectedRef = useRef(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [disconnectMessage, setDisconnectMessage] = useState<string>("");
  const [previousGameState, setPreviousGameState] = useState<GameRoom | null>(
    null,
  );
  const [currentGameState, setCurrentGameState] = useState<GameRoom | null>(
    null,
  );
  const lastUpdateTime = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  const handleStart = useCallback(() => {
    setGameStarted(true);
    setGameOver(false);
    setWinner(null);
    setDisconnectMessage("");
    socketRef.current?.emit("joinQueue", props.mode);
  }, [props.mode]);

  const handleRematch = useCallback(() => {
    setGameStarted(true);
    setGameOver(false);
    setWinner(null);
    setDisconnectMessage("");
    socketRef.current?.emit("rematch", { mode: props.mode });
  }, [props.mode]);

  useEffect(() => {
    socketRef.current = io("http://localhost:3000/game", {
      reconnectionAttempts: 5,
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to server");
      connectedRef.current = true;
    });

    socket.on("gameState", (gameState) => {
      // console.log("Received game state:", gameState);
      setPreviousGameState(currentGameState);
      setCurrentGameState(gameState);
      lastUpdateTime.current = performance.now();
    });

    socket.on(
      "playerDisconnected",
      (data: { playerId: string; gameState: GameRoom }) => {
        console.log("Opponent disconnected", data);
        if (data && data.gameState) {
          updateCanvas(data.gameState);
        }
        setDisconnectMessage("Opponent disconnected");
      },
    );

    socket.on("gameStarted", (data: { gameId: string; game: GameRoom }) => {
      console.log("Game started:", data);
      setGameStarted(true);
      setDisconnectMessage("");
      setPreviousGameState(data.game);
      setCurrentGameState(data.game);
      lastUpdateTime.current = performance.now();
    });

    socket.on("gameOver", (data: { winner: string; reason: string }) => {
      console.log("Game over message received: ", data);
      setGameStarted(false);
      setGameOver(true);
      setWinner(data.winner);
      if (data.reason === "disconnection") {
        setDisconnectMessage(
          `Opponent disconnected, Player ${data.winner} wins!`,
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateCanvas = useCallback((game: GameRoom) => {
    if (!game) {
      console.error("No game object found");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("No canvas element");
      return;
    }

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      console.log("No canvas contxt");
      return;
    }

    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "white";
    context.setLineDash([5, 15]);
    context.beginPath();
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = "white";
    game.gameState.players.forEach((player, idx) => {
      const paddleX =
        idx === 0 ? 0 : canvas.width - game.gameConstants.PADDLE_WIDTH;
      context.fillRect(
        paddleX,
        player.position,
        game.gameConstants.PADDLE_WIDTH,
        game.gameConstants.PADDLE_HEIGHT,
      );
    });

    context.fillRect(
      game.gameState.ball.x,
      game.gameState.ball.y,
      game.gameConstants.BALL_SIZE,
      game.gameConstants.BALL_SIZE,
    );

    context.font = "30px Arial";
    context.textBaseline = "top";
    context.textAlign = "center";
    game.gameState.players.forEach((player, idx) => {
      const scoreX = idx === 0 ? canvas.width / 4 : (canvas.width * 3) / 4;
      context.fillText(player.score.toString(), scoreX, 30);
    });
  }, []);

  useEffect(() => {
    const render = (timestamp: number) => {
      if (currentGameState) {
        if (previousGameState) {
          const timeSinceUpdate = timestamp - lastUpdateTime.current;
          const interpolationFactor = Math.min(
            timeSinceUpdate / (1000 / 60),
            1,
          );

          const interpolatedState = {
            ...currentGameState,
            gameState: {
              ball: {
                ...currentGameState.gameState.ball,
                x: lerp(
                  previousGameState.gameState.ball.x,
                  currentGameState.gameState.ball.x,
                  interpolationFactor,
                ),
                y: lerp(
                  previousGameState.gameState.ball.y,
                  currentGameState.gameState.ball.y,
                  interpolationFactor,
                ),
              },
              players: currentGameState.gameState.players.map(
                (player, idx) => ({
                  ...player,
                  position: lerp(
                    previousGameState.gameState.players[idx].position,
                    player.position,
                    interpolationFactor,
                  ),
                }),
              ),
            },
          };
          updateCanvas(interpolatedState);
        } else {
          updateCanvas(currentGameState);
        }
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };
    if (gameStarted) {
      animationFrameRef.current = requestAnimationFrame(render);
    }
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [currentGameState, previousGameState, gameStarted, updateCanvas]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!gameStarted) return;

      if (props.mode === "local-mp") {
        if (e.key.toLowerCase() === "w") {
          socketRef.current?.emit("updatePosition", { dir: -1, player: 1 });
        } else if (e.key.toLowerCase() === "s") {
          socketRef.current?.emit("updatePosition", { dir: 1, player: 1 });
        }

        if (e.key === "ArrowUp") {
          socketRef.current?.emit("updatePosition", { dir: -1, player: 2 });
        } else if (e.key === "ArrowDown") {
          socketRef.current?.emit("updatePosition", { dir: 1, player: 2 });
        }
      } else {
        if (e.key === "ArrowUp") {
          socketRef.current?.emit("updatePosition", { dir: -1 });
        } else if (e.key === "ArrowDown") {
          socketRef.current?.emit("updatePosition", { dir: 1 });
        }
      }
    },
    [gameStarted, props.mode],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-lg font-bold">Pong</div>
      <div className="text-sm mb-2">
        {props.mode === "local-mp" &&
          "Player 1: W/S | Player 2: Up/Down arrow keys"}
        {props.mode === "remote-mp" && "Use Up/Down arrow keys to move"}
        {props.mode === "singleplayer" &&
          "Player 1: Up/Down arrow keys | Player 2: computer"}
      </div>
      {!gameStarted && (
        <button
          onClick={handleStart}
          className="px-4 mt-2 py-2 bg-green-500 text-white rounded"
        >
          Start Game
        </button>
      )}
      {gameStarted && (
        <canvas
          ref={canvasRef}
          width={props.gameWidth}
          height={props.gameHeight}
          className="border border-gray-400"
        />
      )}
      {gameOver && (
        <div className="text-center mt-4">
          <div className="text-xl font-bold">
            {disconnectMessage || `Player: ${winner}, wins!`}
          </div>
          <button
            onClick={handleRematch}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Rematch
          </button>
        </div>
      )}
    </div>
  );
};

export default Pong;
