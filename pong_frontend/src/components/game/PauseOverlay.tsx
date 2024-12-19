interface PauseOverlayProps {
  isPaused: boolean;
  message?: string;
}

const PauseOverlay = ({
  isPaused,
  message = "Game Paused",
}: PauseOverlayProps) => {
  if (!isPaused) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-3xl text-white">{message}</div>
    </div>
  );
};

export default PauseOverlay;
