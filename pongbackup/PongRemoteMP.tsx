import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { gameProps } from "../types";
import { GameRoom } from "../../../shared/types";

const lerp = (start: number, end: number, t: number) => {
  t = Math.max(0, Math.min(1, t));
  return start * (1 - t) + end * t;
};

const PongRemoteMP = (props: gameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket>();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<string>("");
  const [disconnectMessage, setDisconnectMessage] = useState<string>("");
  const [previousGameState, setPreviousGameState] = useState<GameRoom | null>(
    null,
  );
  const [currentGameState, setCurrentGameState] = useState<GameRoom | null>(
    null,
  );
  const lastUpdateTime = useRef<number>(0);

  useEffect(() => {
    socketRef.current?.on("gameState", (gameState) => {
      setPreviousGameState(currentGameState);
      setCurrentGameState(gameState);
      lastUpdateTime.current = performance.now();
    });
  }, [currentGameState]);

  useEffect(() => {
    socketRef.current = io("http://localhost:3000/game", {
      reconnectionAttempts: 5,
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to server");
    });

    socketRef.current.on(
      "playerDisconnected",
      (data: { playerId: string; gameState: GameRoom }) => {
        console.log("Player disconnected", data);

        if (data && data.gameState) {
          updateCanvas(data.gameState);
        }
        setDisconnectMessage("Opponent disconnected");
      },
    );

    socketRef.current.on(
      "gameStarted",
      (data: { gameId: string; mode: string; game: GameRoom }) => {
        console.log("Game started:", data);
        setGameStarted(true);
        setGameMode(data.mode);
        setDisconnectMessage("");
        setCurrentGameState(data.game);
      },
    );

    socketRef.current.on(
      "gameOver",
      (data: { winner: string; reason: string }) => {
        console.log("Game Over message received: ", data);
        setGameStarted(false);
        setGameOver(true);
        setWinner(data.winner);

        if (data.reason === "disconnection") {
          setDisconnectMessage(
            `Opponent disconnected, Player ${data.winner} wins!`,
          );
        }
      },
    );

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const render = (timestamp: number) => {
      if (currentGameState && previousGameState) {
        const timeSinceUpdate = timestamp - lastUpdateTime.current;
        const interpolationFactor = Math.min(timeSinceUpdate / (1000 / 60), 1);

        const interpolatedState: GameRoom = {
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
            players: currentGameState.gameState.players.map((player, i) => ({
              ...player,
              position: lerp(
                previousGameState.gameState.players[i].position,
                player.position,
                interpolationFactor,
              ),
            })),
          },
        };
        updateCanvas(interpolatedState);
      }
      animationFrameId = requestAnimationFrame(render);
    };
    if (gameStarted) {
      animationFrameId = requestAnimationFrame(render);
    }
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [currentGameState, previousGameState, gameStarted]);

  const handleStartGame = () => {
    console.log("Joining queue");
    socketRef.current?.emit("joinQueue");
    setGameStarted(true);
  };

  const updateCanvas = (game: GameRoom) => {
    if (!game) {
      console.log("No game state to render");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("No canvas element");
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      console.log("No canvas context");
      return;
    }

    ctx.save();
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, props.gameWidth, props.gameHeight);

    ctx.fillStyle = "white";

    // Draw paddles
    game.gameState.players.forEach((player, index) => {
      const paddleX = index === 0 ? 0 : props.gameWidth - 10;
      ctx.fillRect(paddleX, Math.round(player.position), 10, 100);
    });

    // Draw ball
    ctx.fillRect(
      Math.round(game.gameState.ball.x),
      Math.round(game.gameState.ball.y),
      10,
      10,
    );

    // Draw scores
    ctx.font = "30px Arial";
    ctx.textBaseline = "top";
    game.gameState.players.forEach((player, index) => {
      const scoreX =
        index === 0 ? props.gameWidth / 4 : (props.gameWidth * 3) / 4;
      ctx.fillText(player.score.toString(), scoreX, 30);
    });
    ctx.restore();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!gameStarted) return;

    if (e.key === "ArrowUp") {
      socketRef.current?.emit("updatePosition", { dir: -1 });
    } else if (e.key === "ArrowDown") {
      socketRef.current?.emit("updatePosition", { dir: 1 });
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted]);

  return (
    <div>
      {!gameStarted && <button onClick={handleStartGame}>Start Game</button>}
      {gameStarted && (
        <div>
          <div> Game Mode: {gameMode} </div>
          {disconnectMessage && <div>{disconnectMessage}</div>}
          <canvas
            ref={canvasRef}
            width={props.gameWidth}
            height={props.gameHeight}
          />
        </div>
      )}
      {gameOver && (
        <div>
          <h2>{disconnectMessage || `Player: ${winner}, wins!`}</h2>
          <button onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}
    </div>
  );
};

export default PongRemoteMP;
