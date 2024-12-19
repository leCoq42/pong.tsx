interface GameOverProps {
  winner: string | null;
  disconnectMessage: string | null;
  finalScore: { player1: number; player2: number } | null;
  onRematch: () => void;
}

const GameOver: React.FC<GameOverProps> = ({
  winner,
  disconnectMessage,
  finalScore,
  onRematch,
}: GameOverProps) => {
  if (!finalScore) return null;

  return (
    <div>
    <div className="text-xl font-bold">
        {disconnectMessage || `Game Over! ${winner} wins!`}
      </div>
    <p>Final Score: {finalScore.player1} - {finalScore.player2}</p>
    <button onClick={onRematch}>Rematch</button>
  </div>
  );
};

export default GameOver;
