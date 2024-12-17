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

  const [currentGameState, setCurrentGameState] = useState<GameRoom | null>(
    null
  );
  const [previousGameState, setPreviousGameState] = useState<GameRoom | null>(
    null
  );
  const [finalScore, setFinalScore] = useState<{
    player1: number;
    player2: number;
  }>({
    player1: 0,
    player2: 0,
  });
  const [queuePosition, setQueuePosition] = useState(0);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [connectionError, setConnectionError] = useState<string>("");
  const [disconnectMessage, setDisconnectMessage] = useState<string>("");
  const [reconnectAvailable, setReconnectAvailable] = useState(false);
  const lastUpdateTime = useRef<number>(0);
  const animationFrameRef = useRef<number>();

  const keyRef = useRef<{ [key: string]: boolean }>({});

  const handleStart = useCallback(() => {
    setGameStarted(true);
    setGameOver(false);
    setWinner(null);
    setDisconnectMessage("");
    socketRef.current?.emit("startGame", props.mode);
  }, [props.mode]);

  const handleStartdMatchmaking = useCallback(() => {
    setIsMatchmaking(true);
    socketRef.current?.emit("joinMatchmaking");
  }, []);

  const handleCancelMatchmaking = useCallback(() => {
    socketRef.current?.emit("leaveMatchmaking");
    setIsMatchmaking(false);
  }, []);

  const handleRematch = useCallback(() => {
    setGameStarted(true);
    setGameOver(false);
    setWinner(null);
    setDisconnectMessage("");
    socketRef.current?.emit("rematch", { mode: props.mode });
  }, [props.mode]);

  useEffect(() => {
    const storedGameId = localStorage.getItem("disconnectedGameId");
    if (storedGameId) {
      setReconnectAvailable(true);
    }
  }, []);

  useEffect(() => {
    socketRef.current = io("http://localhost:3000/game", {
      reconnectionAttempts: 5,
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnecting(false);
      setConnectionError("");
      connectedRef.current = true;
      const storedGameId = localStorage.getItem("disconnectedGameId");
      if (storedGameId) {
        setReconnectAvailable(true);
      }
    });

    socket.on(
      "playerReconnected",
      (data: { playerId: string; gameState: GameRoom }) => {
        setIsPaused(false);
        setDisconnectMessage("");
        setCurrentGameState(data.gameState);
        localStorage.removeItem("disconnectedGameId");
        setReconnectAvailable(false);
      }
    );

    socket.on("canReconnect", (data: { gameId: string }) => {
      setReconnectAvailable(true);
      localStorage.setItem("gameId", data.gameId);
    });

    socket.on("connect_error", (error) => {
      setIsConnecting(false);
      setConnectionError("Failed to connect to game server");
      console.error("Connection error:", error);
    });

    socket.on(
      "opponentDisconnected",
      (data: { playerId: string; gameState: GameRoom }) => {
        if (data.gameState.isPaused) {
          setIsPaused(true);
          if (data.playerId === socket.id) {
            localStorage.setItem("disconnectedGameId", data.gameState.gameId);
            setReconnectAvailable(true);
            setDisconnectMessage(
              "You're disconnected. Click reconnect to rejoin the game."
            );
          } else {
            setDisconnectMessage(
              "Opponent disconnected. Waiting for reconnection..."
            );
          }
        }
        updateCanvas(data.gameState);
      }
    );

    socket.on(
      "matchmakingStatus",
      (data: { status: string; positition?: number; length?: number }) => {
        if (data.status === "waiting") {
          setQueuePosition(data.positition || 0);
        } else if (data.status === "left") {
          setIsMatchmaking(false);
          setQueuePosition(0);
        }
      }
    );

    socket.on("matchmakingError", (data: { message: string }) => {
      setConnectionError(data.message);
      setIsMatchmaking(false);
    });

    socket.on("gameStarted", (data: { gameId: string; game: GameRoom }) => {
      console.log("Game started:", data);
      setGameStarted(true);
      setDisconnectMessage("");
      setPreviousGameState(data.game);
      setCurrentGameState(data.game);
      lastUpdateTime.current = performance.now();
      // Store gameId when game starts
      localStorage.setItem("gameId", data.gameId);
    });

    socket.on("gameState", (gameState) => {
      setPreviousGameState(currentGameState);
      setCurrentGameState(gameState);
      lastUpdateTime.current = performance.now();
    });

    socket.on(
      "gameOver",
      (data: { winner: string; reason: string; score: number }) => {
        console.log("Game over message received: ", data);
        setGameStarted(false);
        setGameOver(true);
        setWinner(data.winner);
        setIsPaused(false);

        if (currentGameState) {
          setFinalScore({
            player1: currentGameState.gameState.players[0].score,
            player2: currentGameState.gameState.players[1].score,
          });
        }

        localStorage.removeItem("gameId");
        localStorage.removeItem("disconnectedGameId");
        setReconnectAvailable(false);

        let message = `Player ${data.winner} wins! (${finalScore.player1} - ${finalScore.player2})`;
        if (data.reason === "timeout") {
          message = `Opponent failed to reconnect. Player ${data.winner} wins!`;
        } else if (data.reason === "disconnection") {
          message = `Opponent disconnected. Player ${data.winner} wins!`;
        }
        setDisconnectMessage(message);
      }
    );

    return () => {
      socket?.off("matchmakingStatus");
      socket?.off("matchmakingError");
    };
  }, []);

  const handleReconnect = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("reconnectToGame");
    setReconnectAvailable(false);
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
        game.gameConstants.PADDLE_HEIGHT
      );
    });

    context.fillRect(
      game.gameState.ball.x,
      game.gameState.ball.y,
      game.gameConstants.BALL_SIZE,
      game.gameConstants.BALL_SIZE
    );

    context.font = "30px Arial";
    context.textBaseline = "top";
    context.textAlign = "center";
    game.gameState.players.forEach((player, idx) => {
      const scoreX = idx === 0 ? canvas.width / 4 : (canvas.width * 3) / 4;
      context.fillText(player.score.toString(), scoreX, 30);
    });

    if (game.isPaused) {
      context.font = "30px Arial";
      context.fillStyle = "white";
      context.textAlign = "center";
      context.fillText("Game Paused", canvas.width / 2, canvas.height / 2);
    }
  }, []);

  useEffect(() => {
    const render = (timestamp: number) => {
      if (currentGameState) {
        if (previousGameState) {
          const timeSinceUpdate = timestamp - lastUpdateTime.current;
          const interpolationFactor = Math.min(
            timeSinceUpdate / (1000 / 60),
            1
          );

          const interpolatedState = {
            ...currentGameState,
            gameState: {
              ball: {
                ...currentGameState.gameState.ball,
                x: lerp(
                  previousGameState.gameState.ball.x,
                  currentGameState.gameState.ball.x,
                  interpolationFactor
                ),
                y: lerp(
                  previousGameState.gameState.ball.y,
                  currentGameState.gameState.ball.y,
                  interpolationFactor
                ),
              },
              players: currentGameState.gameState.players.map(
                (player, idx) => ({
                  ...player,
                  position: lerp(
                    previousGameState.gameState.players[idx].position,
                    player.position,
                    interpolationFactor
                  ),
                })
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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)) {
      e.preventDefault();
    }
    keyRef.current[e.key] = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keyRef.current[e.key] = false;
  }, []);

  const updatePaddles = useCallback(() => {
    if (!currentGameState) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { PADDLE_HEIGHT, CANVAS_HEIGHT } = currentGameState.gameConstants;

    if (props.mode === "local-mp") {
      if (
        keyRef.current["w"] &&
        currentGameState.gameState.players[0].position > 0
      ) {
        socketRef.current?.emit("updatePosition", { dir: -1, player: 1 });
      }
      if (
        keyRef.current["s"] &&
        currentGameState.gameState.players[0].position <
          CANVAS_HEIGHT - PADDLE_HEIGHT
      ) {
        socketRef.current?.emit("updatePosition", { dir: 1, player: 1 });
      }
    }

    if (
      keyRef.current["ArrowUp"] &&
      currentGameState.gameState.players[props.mode === "local-mp" ? 1 : 0]
        .position > 0
    ) {
      socketRef.current?.emit("updatePosition", {
        dir: -1,
        player: props.mode === "local-mp" ? 2 : 1,
      });
    }
    if (
      keyRef.current["ArrowDown"] &&
      currentGameState.gameState.players[props.mode === "local-mp" ? 1 : 0]
        .position <
        CANVAS_HEIGHT - PADDLE_HEIGHT
    ) {
      socketRef.current?.emit("updatePosition", {
        dir: 1,
        player: props.mode === "local-mp" ? 2 : 1,
      });
    }
  }, [currentGameState, props.mode]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (!gameStarted) return;

    let animationFrameId: number;
    const updateLoop = () => {
      updatePaddles();
      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [gameStarted, updatePaddles]);

  if (connectionError) {
    return <div className="text-red-500">{connectionError}</div>;
  }

  if (isConnecting) {
    return <div>Connecting to game server...</div>;
  }

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
      {props.mode != "remote-mp" && !gameStarted && (
        <button
          onClick={handleStart}
          className="px-4 mt-2 py-2 bg-green-500 text-white rounded"
        >
          Start Game
        </button>
      )}
      {props.mode === "remote-mp" && !gameStarted && (
        <div>
          {!isMatchmaking ? (
            <button
              onClick={handleStartdMatchmaking}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Find Match
            </button>
          ) : (
            <div className="text-center">
              <div>Finding match... Position in queue: {queuePosition}</div>
              <button
                onClick={handleCancelMatchmaking}
                className="px-4 py-2 mt-2 bg-red-500 text-white rounded"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
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
            {disconnectMessage || `Player: ${winner}, wins! (${finalScore.player1} - ${finalScore.player2})`}
          </div>
          <button
            onClick={handleRematch}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Rematch
          </button>
        </div>
      )}
      {isPaused && disconnectMessage && (
        <div className="game-message">{disconnectMessage}</div>
      )}

      {reconnectAvailable && (
        <button className="game-button" onClick={handleReconnect}>
          Reconnect to Game
        </button>
      )}
    </div>
  );
};

export default Pong;
