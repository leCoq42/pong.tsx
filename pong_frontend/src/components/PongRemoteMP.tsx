import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { gameProps } from "../types";
import { GameState, Player } from "../../../shared/types";

const PongRemoteMP = (props: gameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket>();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:3000/game");

    socketRef.current.on("gameState", (gameState) => {
      updateCanvas(gameState);
    });

    socketRef.current.on("gameOver", ({ winner }) => {
      setGameOver(true);
      setWinner(winner);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const updateCanvas = (gameState: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, props.gameWidth, props.gameHeight);

    // Draw paddles
    ctx.fillStyle = "white";
    gameState.players.forEach((player: Player, index: number) => {
      ctx.fillRect(
        index === 0 ? 0 : props.gameWidth - 10,
        player.position,
        10,
        100,
      );
    });

    // Draw ball
    ctx.fillRect(gameState.ball.x, gameState.ball.y, 10, 10);

    // Draw scores
    ctx.font = "30px Arial";
    ctx.fillText(gameState.score1.toString(), props.gameWidth / 4, 30);
    ctx.fillText(gameState.score2.toString(), (props.gameWidth * 3) / 4, 30);
  };

  const handleStartGame = () => {
    socketRef.current?.emit("joinGame");
    setGameStarted(true);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const newPosition = e.key === "ArrowUp" ? -10 : 10;
      socketRef.current?.emit("updatePosition", { position: newPosition });
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div>
      {!gameStarted && <button onClick={handleStartGame}>Start Game</button>}
      <canvas
        ref={canvasRef}
        width={props.gameWidth}
        height={props.gameHeight}
      />
      {gameOver && (
        <div>
          <h2>{winner} wins!</h2>
          <button onClick={() => window.location.reload()}>Play Again</button>
        </div>
      )}
    </div>
  );
};

export default PongRemoteMP;
