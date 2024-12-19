interface GameControlsProps {
  mode: string;
  isMatchmaking: boolean;
  queuePosition: number | null;
  onStart: () => void;
  onFindMatch: () => void;
  onCancelMatch: () => void;
}

const GameControls = ({
  mode,
  isMatchmaking,
  queuePosition,
  onStart,
  onFindMatch,
  onCancelMatch,
}: GameControlsProps) => {
  return (
    <div className="flex flex-col items-center gap-4">
      {mode !== "remote-mp" && (
        <button
          onClick={onStart}
          className="px-4 mt-2 py-2 bg-green-500 text-white rounded"
        >
          Start Game
        </button>
      )}
      {mode === "remote-mp" && (
        <div>
          {!isMatchmaking ? (
            <button
              onClick={onFindMatch}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Find Match
            </button>
          ) : (
            <div className="text-center">
              <div>Finding match... Position in queue: {queuePosition}</div>
              <button
                onClick={onCancelMatch}
                className="px-4 py-2 mt-2 bg-red-500 text-white rounded"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameControls;
