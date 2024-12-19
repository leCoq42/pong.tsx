import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { GameRoom } from "../../../../shared/types";
import { roomApi } from "./services/rooms";
import { createSocket } from "../../config/socket";
import GameCanvas from "./GameCanvas";
import GameControls from "./GameControls";
import GameOver from "./GameOver";
import GameElements from "./GameElements";
import ScoreBoard from "./ScoreBoard";
import PauseOverlay from "./PauseOverlay";

const FRAME_RATE = 1000 / 60;

interface PongProps {
  mode: "singleplayer" | "local-mp" | "remote-mp";
  gameWidth: number;
  gameHeight: number;
}

const Pong: React.FC<PongProps> = (props) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [currentGameState, setCurrentGameState] = useState<GameRoom | null>(
    null
  );
  const [previousGameState, setPreviousGameState] = useState<GameRoom | null>(
    null
  );
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(
    null
  );
  const [isPaused, setIsPaused] = useState(false);
  const [finalScore, setFinalScore] = useState<{
    player1: number;
    player2: number;
  } | null>({
    player1: 0,
    player2: 0,
  });
  const [gameActive, setGameActive] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateTime = useRef<number>(0);
  const connectedRef = useRef<boolean>(false);
  const keyRef = useRef<{ [key: string]: boolean }>({});

  function setupSocketListeners() {
    if (!socketRef.current) return;

    socketRef.current.on("connect", () => {
      console.log("Connected to server");
      connectedRef.current = true;
    });

    socketRef.current.on(
      "opponentDisconnected",
      (data: { playerId: string; gameState: GameRoom }) => {
        if (data.gameState.isPaused) {
          setIsPaused(true);
          if (data.playerId === socketRef.current?.id) {
            localStorage.setItem("disconnectedGameId", data.gameState.gameId);
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

    socketRef.current.on(
      "gameStarted",
      (data: { gameId: string; game: GameRoom }) => {
        console.log("Game started:", data);
        setGameStarted(true);
        setDisconnectMessage("");
        setPreviousGameState(data.game);
        setCurrentGameState(data.game);
        lastUpdateTime.current = performance.now();
        localStorage.setItem("gameId", data.gameId);
      }
    );

    socketRef.current.on("gameState", (gameState) => {
      setPreviousGameState(currentGameState);
      setCurrentGameState(gameState);
      lastUpdateTime.current = performance.now();
    });

    socketRef.current.on(
      "gameOver",
      (data: {
        winner: string;
        reason: string;
        score: { player1: number; player2: number };
      }) => {
        console.log("Game over message received: ", data);
        setGameOver(true);
        setWinner(data.winner);
        setFinalScore(data.score);
        setGameActive(false);
      }
    );

    socketRef.current.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    socketRef.current.on("connect_failed", () => {
      console.error("Connection failed");
    });
  }

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollMatchStatus = async () => {
      if (!isMatchmaking) return;

      try {
        const { matched, gameId } = await roomApi.checkMatchStatus();
        if (matched && gameId) {
          setIsMatchmaking(false);
          setQueuePosition(null);

          socketRef.current = createSocket();
          setupSocketListeners();
          socketRef.current.emit("joinGame", { gameId });

          setGameStarted(true);
          setGameActive(true);
        }
      } catch (error) {
        console.error("Error checking match status:", error);
      }
    };

    if (isMatchmaking) {
      pollInterval = setInterval(pollMatchStatus, 1000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isMatchmaking]);

  const lerp = (start: number, end: number, t: number) => {
    return start * (1 - t) + end * t;
  };

  const handleStart = async () => {
    try {
      const { gameId, gameState } = await roomApi.createGame(props.mode);

      if (!gameId || !gameState) {
        return;
      }

      localStorage.setItem("gameId", gameId);

      setPreviousGameState(null);
      setCurrentGameState(gameState);

      socketRef.current = createSocket();
      setupSocketListeners();

      socketRef.current.emit("joinGame", { gameId });

      setGameStarted(true);
      setGameActive(true);
    } catch (error) {
      console.error("Error starting game:", error);
    }
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        connectedRef.current = false;
      }
    };
  }, []);

  const handleStartMatchmaking = async () => {
    try {
      const { position } = await roomApi.joinQueue();
      setIsMatchmaking(true);
      setQueuePosition(position);
    } catch (error) {
      console.error("Error starting matchmaking:", error);
    }
  };

  const handleCancelMatchmaking = async () => {
    try {
      await roomApi.leaveQueue();
      setIsMatchmaking(false);
      setQueuePosition(null);
    } catch (error) {
      console.error("Error cancelling matchmaking:", error);
    }
  };

  const resetGame = useCallback(() => {
    setGameStarted(false);
    setGameOver(false);
    setCurrentGameState(null);
    setPreviousGameState(null);
    setWinner(null);
    setFinalScore({ player1: 0, player2: 0 });
    setGameActive(false);
  }, []);

  const handleRematch = async () => {
    try {
      const currentGameId = localStorage.getItem("gameId");
      if (!currentGameId) return;

      const { newGameId } = await roomApi.rematch(currentGameId);
      resetGame();
      setGameOver(false);
      setWinner(null);
      setFinalScore(null);
      handleStart();
      socketRef.current?.emit("joinGame", { gameId: newGameId });
      localStorage.setItem("gameId", newGameId);
    } catch (error) {
      console.error("Error rematching:", error);
    }
  };

  const handleDraw = useCallback(
    (context: CanvasRenderingContext2D, gameState: GameRoom) => {
      context.fillStyle = "black";
      context.fillRect(0, 0, props.gameWidth, props.gameHeight);

      context.strokeStyle = "white";
      context.setLineDash([5, 15]);
      context.beginPath();
      context.moveTo(context.canvas.width / 2, 0);
      context.lineTo(context.canvas.width / 2, context.canvas.height);
      context.stroke();
      context.setLineDash([]);

      context.fillStyle = "white";
      GameElements.drawPaddles({
        context,
        gameState: gameState.gameState,
        gameConstants: gameState.gameConstants,
      });
      GameElements.drawBall({
        context,
        gameState: gameState.gameState,
        gameConstants: gameState.gameConstants,
      });
    },
    []
  );

  const updateCanvas = useCallback(
    (gameState: GameRoom) => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      handleDraw(context, gameState);
    },
    [handleDraw]
  );

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
    if (!currentGameState || !gameActive || !socketRef.current?.connected)
      return;

    const { PADDLE_HEIGHT, CANVAS_HEIGHT } = currentGameState.gameConstants;

    if (props.mode === "local-mp") {
      if (
        keyRef.current["w"] &&
        currentGameState.gameState.players[0].position > 0
      ) {
        console.log("Sending up movement");
        socketRef.current?.emit("updatePosition", { dir: -1, player: 2 });
      }
      if (
        keyRef.current["s"] &&
        currentGameState.gameState.players[0].position <
          CANVAS_HEIGHT - PADDLE_HEIGHT
      ) {
        console.log("Sending down movement");
        socketRef.current?.emit("updatePosition", { dir: 1, player: 2 });
      }
    } else {
      if (keyRef.current["ArrowUp"]) {
        console.log("Sending up movement");
        socketRef.current?.emit("updatePosition", { dir: -1 });
      }
      if (keyRef.current["ArrowDown"]) {
        console.log("Sending down movement");
        socketRef.current?.emit("updatePosition", { dir: 1 });
      }
    }
  }, [currentGameState, props.mode, gameActive]);

  useEffect(() => {
    let lastRenderTime = 0;
    const render = (timestamp: number) => {
      if (timestamp - lastRenderTime >= FRAME_RATE) {
        if (gameActive) {
          updatePaddles();
        }

        if (currentGameState) {
          if (previousGameState) {
            const timeSinceUpdate = timestamp - lastRenderTime;
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
          lastRenderTime = timestamp;
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

  useEffect(() => {
    if (gameStarted) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameStarted, handleKeyDown, handleKeyUp]);

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

      {!gameStarted && !gameOver && (
        <GameControls
          mode={props.mode}
          isMatchmaking={isMatchmaking}
          queuePosition={queuePosition}
          onStart={handleStart}
          onFindMatch={handleStartMatchmaking}
          onCancelMatch={handleCancelMatchmaking}
        />
      )}

      {gameStarted && currentGameState && (
        <div className="relative">
          <GameCanvas
            width={props.gameWidth}
            height={props.gameHeight}
            gameState={currentGameState}
            onDraw={handleDraw}
          />
          {currentGameState && (
            <ScoreBoard
              players={currentGameState.gameState.players}
              canvasWidth={props.gameWidth}
            />
          )}
          <PauseOverlay
            isPaused={isPaused}
            message={disconnectMessage || "Game Paused"}
          />
        </div>
      )}

      {gameOver && (
        <GameOver
          winner={winner}
          disconnectMessage={disconnectMessage}
          finalScore={finalScore}
          onRematch={handleRematch}
        />
      )}
    </div>
  );
};

export default Pong;
