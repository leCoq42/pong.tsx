interface GameOverProps {
	winner: string | null;
	disconnectMessage: string;
	finalScore: { player1: number; player2: number };
	onRematch: () => void;
  }
  
  export const GameOver = ({ winner, disconnectMessage, finalScore, onRematch }: GameOverProps) => {
	return (
	  <div className="text-center mt-4">
		<div className="text-xl font-bold">
		  {disconnectMessage || `Game Over! ${winner} wins!`}
		</div>
		<div className="mt-2">
		  Final Score: {finalScore.player1} - {finalScore.player2}
		</div>
		<button
		  onClick={onRematch}
		  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
		>
		  Rematch
		</button>
	  </div>
	);
  };