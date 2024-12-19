import { useRef, useEffect } from "react";
import { GameRoom } from "../../../../shared/types";

interface GameCanvasProps {
  width: number;
  height: number;
  gameState: GameRoom;
  onDraw: (context: CanvasRenderingContext2D, game: GameRoom) => void;
}

const GameCanvas = ({
  width,
  height,
  gameState,
  onDraw,
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    onDraw(context, gameState);
  }, [gameState, onDraw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-400"
    />
  );
};

export default GameCanvas;