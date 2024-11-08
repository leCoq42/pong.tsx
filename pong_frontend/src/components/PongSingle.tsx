import { useCallback, useEffect, useRef, useState } from "react";
import { gameProps, GameState } from "../types";

const PADDLE_HEIGHT = 100;
const PADDLE_MID = PADDLE_HEIGHT / 2;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const BALL_SPEED = 5;
const BALL_ACCELERATION = 1.1;
const PADDLE_SPEED = 10;
const INTERVAL = 1000 / 60;
const WIN_SCORE = 3;

const PongSingle = (props: gameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keyRef = useRef<{ [key: string]: boolean }>({});
  const gameStateRef = useRef<GameState>({
    ballX: props.gameWidth / 2,
    ballY: props.gameHeight / 2,
    ballSpeedX: Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED,
    ballSpeedY: Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED,
    paddle1Y: props.gameHeight / 2 - PADDLE_MID,
    paddle2Y: props.gameHeight / 2 - PADDLE_MID,
    score1: 0,
    score2: 0,
  });

  const [gameStart, setGameStart] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const handleStart = useCallback(() => {
    setGameStart(true);
  }, []);

  const handleRematch = useCallback(() => {
    // const newBallSpeedX = Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED;
    const newBallSpeedX =
      gameStateRef.current.ballSpeedX > 0 ? -BALL_SPEED : BALL_SPEED;
    const newBallSpeedY = Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED;

    gameStateRef.current = {
      ballX: 400,
      ballY: 300,
      ballSpeedX: newBallSpeedX,
      ballSpeedY: newBallSpeedY,
      paddle1Y: 250,
      paddle2Y: 250,
      score1: 0,
      score2: 0,
    };
    setGameOver(false);
    setWinner(null);
  }, []);

  const movePlayerPaddle = useCallback(
    (
      upKey: string,
      downKey: string,
      paddleY: number,
      setPaddleY: (y: number) => void,
      canvas: HTMLCanvasElement,
    ): void => {
      if (keyRef.current[upKey] && paddleY > 0) {
        setPaddleY(paddleY - PADDLE_SPEED);
      }
      if (keyRef.current[downKey] && paddleY < canvas.height - PADDLE_HEIGHT) {
        setPaddleY(paddleY + PADDLE_SPEED);
      }
    },
    [],
  );

  const moveAiPaddle = useCallback(
    (
      paddleY: number,
      ballY: number,
      setPaddleY: (y: number) => void,
      canvas: HTMLCanvasElement,
    ): void => {
      const distance = Math.abs(paddleY + PADDLE_MID - ballY);
      const speed = Math.min(distance, PADDLE_SPEED);

      if (paddleY + PADDLE_MID > ballY && paddleY > 0)
        setPaddleY(paddleY - speed);
      if (
        paddleY + PADDLE_MID < ballY &&
        paddleY < canvas.height - PADDLE_HEIGHT
      )
        setPaddleY(paddleY + speed);
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

      movePlayerPaddle(
        "ArrowUp",
        "ArrowDown",
        gameState.paddle1Y,
        (y) => (gameState.paddle1Y = y),
        canvas,
      );

      moveAiPaddle(
        gameState.paddle2Y,
        gameState.ballY,
        (y) => (gameState.paddle2Y = y),
        canvas,
      );

      let newBallX = gameState.ballX + gameState.ballSpeedX;
      let newBallY = gameState.ballY + gameState.ballSpeedY;
      let newBallSpeedX = gameState.ballSpeedX;
      let newBallSpeedY = gameState.ballSpeedY;
      let newScore1 = gameState.score1;
      let newScore2 = gameState.score2;

      if (newBallY <= 0 || newBallY >= canvas.height - BALL_SIZE) {
        newBallSpeedY = -newBallSpeedY * BALL_ACCELERATION;
      }

      // Paddle collision Player1
      if (
        newBallX <= PADDLE_WIDTH &&
        newBallY >= gameState.paddle1Y &&
        newBallY <= gameState.paddle1Y + PADDLE_HEIGHT
      ) {
        newBallSpeedX = -newBallSpeedX * BALL_ACCELERATION;
      }
      // Paddle collision Player2
      if (
        newBallX >= canvas.width - PADDLE_WIDTH - BALL_SIZE &&
        newBallY >= gameState.paddle2Y &&
        newBallY <= gameState.paddle2Y + PADDLE_HEIGHT
      ) {
        newBallSpeedX = -newBallSpeedX * BALL_ACCELERATION;
      }

      //Register Score Player 1
      if (newBallX >= canvas.width) {
        newScore1++;
        newBallX = canvas.width / 2;
        newBallY = canvas.height / 2;
        newBallSpeedX = -BALL_SPEED;
        newBallSpeedY = -BALL_SPEED;
      }
      //Register Score Player 2
      if (newBallX <= 0 - BALL_SIZE) {
        newScore2++;
        newBallX = canvas.width / 2;
        newBallY = canvas.height / 2;
        newBallSpeedX = -BALL_SPEED;
        newBallSpeedY = -BALL_SPEED;
      }

      // Register winner
      if (newScore1 >= WIN_SCORE) {
        setGameOver(true);
        setWinner("Player 1");
      } else if (newScore2 >= WIN_SCORE) {
        setGameOver(true);
        setWinner("Player 2");
      }

      gameStateRef.current = {
        ...gameState,
        ballX: newBallX,
        ballY: newBallY,
        ballSpeedX: newBallSpeedX,
        ballSpeedY: newBallSpeedY,
        score1: newScore1,
        score2: newScore2,
      };

      context.fillStyle = "black";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = "white";
      context.fillRect(0, gameState.paddle1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
      context.fillRect(
        canvas.width - PADDLE_WIDTH,
        gameState.paddle2Y,
        PADDLE_WIDTH,
        PADDLE_HEIGHT,
      );

      context.fillRect(gameState.ballX, gameState.ballY, BALL_SIZE, BALL_SIZE);

      context.font = "30px Arial";
      context.fillText(gameState.score1.toString(), canvas.width / 4, 30);
      context.fillText(gameState.score2.toString(), (canvas.width * 3) / 4, 30);

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
  }, [gameOver, gameStart, moveAiPaddle, movePlayerPaddle]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-lg  font-bold">Pong</div>
      <div className="text-sm mb-2">
        Player 1: Up/Down arrow keys | Player 2: computer
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

export default PongSingle;
