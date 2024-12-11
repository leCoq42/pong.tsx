import { useCallback, useEffect, useRef, useState } from "react";
import { gameProps } from "../types";
import { GameState, Player } from "../../../shared/types";

const PADDLE_HEIGHT = 100;
const PADDLE_MID = PADDLE_HEIGHT / 2;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 50;
const BALL_SPEED = 5;
const BALL_ACCELERATION = 1.1;
const PADDLE_SPEED = 10;
const INTERVAL = 1000 / 60;
const WIN_SCORE = 2;

const PongLocalMult = (props: gameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyRef = useRef<{ [key: string]: boolean }>({});
  const gameStateRef = useRef<GameState>({
    ball: {
      x: props.gameWidth / 2,
      y: props.gameHeight / 2,
      dirX: Math.random() > 0.5 ? 1 : -1,
      dirY: Math.random() > 0.5 ? 1 : -1,
      speed: BALL_SPEED,
    },
    players: [
      { score: 0, position: props.gameHeight / 2 - PADDLE_MID },
      { score: 0, position: props.gameHeight / 2 - PADDLE_MID },
    ],
  });

  const [gameStart, setGameStart] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const handleStart = useCallback(() => {
    setGameStart(true);
  }, []);

  const handleRematch = useCallback(() => {
    gameStateRef.current = {
      ball: {
        x: props.gameWidth / 2,
        y: props.gameHeight / 2,
        dirX: Math.random() > 0.5 ? 1 : -1,
        dirY: Math.random() > 0.5 ? 1 : -1,
        speed: BALL_SPEED,
      },
      players: [
        { score: 0, position: props.gameHeight / 2 - PADDLE_MID },
        { score: 0, position: props.gameHeight / 2 - PADDLE_MID },
      ],
    };
    setGameOver(false);
    setWinner(null);
  }, []);

  const movePaddle = useCallback(
    (
      upKey: string,
      downKey: string,
      playerIndex: number,
      canvas: HTMLCanvasElement,
    ): void => {
      const player = gameStateRef.current.players[playerIndex];
      if (keyRef.current[upKey] && player.position > 0) {
        gameStateRef.current.players[playerIndex].position -= PADDLE_SPEED;
      }
      if (
        keyRef.current[downKey] &&
        player.position < canvas.height - PADDLE_HEIGHT
      ) {
        gameStateRef.current.players[playerIndex].position += PADDLE_SPEED;
      }
    },
    [],
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keyRef.current[e.key] = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keyRef.current[e.key] = false;
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (!gameStart) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let lastTime = performance.now();
    let animationFrameId: number;

    const render = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      if (deltaTime < INTERVAL) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      lastTime = currentTime;

      const gameState = gameStateRef.current;

      movePaddle("w", "s", 0, canvas);
      movePaddle("ArrowUp", "ArrowDown", 1, canvas);

      let newBallX =
        gameState.ball.x + gameState.ball.speed * gameState.ball.dirX;
      let newBallY =
        gameState.ball.y + gameState.ball.speed * gameState.ball.dirY;
      let newBallDirX = gameState.ball.dirX;
      let newBallDirY = gameState.ball.dirY;
      let newBallSpeed = gameState.ball.speed;

      if (newBallY <= 0 || newBallY >= canvas.height - BALL_SIZE) {
        newBallDirY = -newBallDirY;
        newBallSpeed = newBallSpeed * BALL_ACCELERATION;
      }

      // Paddle collision Player1
      if (
        newBallX <= PADDLE_WIDTH &&
        newBallY + BALL_SIZE >= gameState.players[0].position &&
        newBallY <= gameState.players[0].position + PADDLE_HEIGHT
      ) {
        newBallDirX = -newBallDirX;
        newBallSpeed = newBallSpeed * BALL_ACCELERATION;
      }
      // Paddle collision Player2
      if (
        newBallX >= canvas.width - PADDLE_WIDTH - BALL_SIZE &&
        newBallY + BALL_SIZE >= gameState.players[1].position &&
        newBallY <= gameState.players[1].position + PADDLE_HEIGHT
      ) {
        newBallDirX = -newBallDirX;
        newBallSpeed = newBallSpeed * BALL_ACCELERATION;
      }

      //Register Score Player 1
      if (newBallX >= canvas.width - BALL_SIZE) {
        gameStateRef.current.players[0].score++;
        newBallX = canvas.width / 2;
        newBallY = canvas.height / 2;
        newBallDirX = -newBallDirX;
        newBallDirY = -newBallDirY;
        newBallSpeed = BALL_SPEED;
      }
      //Register Score Player 2
      if (newBallX <= 0) {
        gameStateRef.current.players[1].score++;
        newBallX = canvas.width / 2;
        newBallY = canvas.height / 2;
        newBallDirX = -newBallDirX;
        newBallDirY = -newBallDirY;
        newBallSpeed = BALL_SPEED;
      }

      // Register winner
      if (gameState.players[0].score >= WIN_SCORE) {
        setGameOver(true);
        setWinner("Player 1");
      } else if (gameState.players[1].score >= WIN_SCORE) {
        setGameOver(true);
        setWinner("Player 2");
      }

      gameStateRef.current.ball = {
        x: newBallX,
        y: newBallY,
        dirX: newBallDirX,
        dirY: newBallDirY,
        speed: newBallSpeed,
      };

      context.clearRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = "black";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = "white";
      context.fillRect(
        0,
        gameState.players[0].position,
        PADDLE_WIDTH,
        PADDLE_HEIGHT,
      );
      context.fillRect(
        canvas.width - PADDLE_WIDTH,
        gameState.players[1].position,
        PADDLE_WIDTH,
        PADDLE_HEIGHT,
      );

      context.fillRect(
        gameState.ball.x,
        gameState.ball.y,
        BALL_SIZE,
        BALL_SIZE,
      );

      context.font = "30px Arial";
      context.fillText(
        gameState.players[0].score.toString(),
        canvas.width / 4,
        30,
      );
      context.fillText(
        gameState.players[1].score.toString(),
        (canvas.width * 3) / 4,
        30,
      );

      context.setLineDash([5, 15]);
      context.beginPath();
      context.moveTo(canvas.width / 2, 0);
      context.lineTo(canvas.width / 2, canvas.height);
      context.strokeStyle = "white";
      context.stroke();

      if (!gameOver) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    render(lastTime);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameOver, gameStart, movePaddle]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-lg  font-bold">Pong</div>
      <div className="text-sm mb-2">
        Player 1: W/S | Player 2: Up/Down arrow keys
      </div>
      {!gameStart && (
        <button
          onClick={handleStart}
          className="px-4 mt-2 py-2 bg-green-500 text-white rounded"
        >
          Start Game
        </button>
      )}
      {gameStart && (
        <canvas
          ref={canvasRef}
          width={props.gameWidth}
          height={props.gameHeight}
          className="border border-gray-400"
        />
      )}
      {gameOver && (
        <div className="text-center mt-4">
          <div className="text-xl font-bold">{winner} wins!</div>
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

export default PongLocalMult;
