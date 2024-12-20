interface MatchAcceptProps {
  isOpen: boolean;
  opponent: string;
  timeLeft: number;
  onAccept: () => void;
  onDecline: () => void;
}

const MatchAccept = ({
  isOpen,
  opponent,
  timeLeft,
  onAccept,
  onDecline,
}: MatchAcceptProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Match Found!</h2>
        <p className="mb-4">Opponent: {opponent}</p>
        <p className="mb-4">Time to accept: {timeLeft}s</p>
        <div className="flex justify-between gap-4">
          <button
            onClick={onAccept}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Accept
          </button>
          <button
            onClick={onDecline}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchAccept;
