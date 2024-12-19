interface ScoreBoardProps {
  players: Array<{ score: number }>;
  canvasWidth: number;
}

const ScoreBoard = ({ players}: ScoreBoardProps) => {
  return (
    <div className="absolute top-8 w-full">
      <div className="flex justify-around">
        {players.map((player, idx) => (
          <div key={idx} className="text-3xl text-white">
            {player.score}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoreBoard;
