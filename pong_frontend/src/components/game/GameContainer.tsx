interface GameContainerProps {
	children: React.ReactNode;
	mode: string;
  }
  
  const GameContainer = ({ children, mode }: GameContainerProps) => {
	return (
	  <div className="flex flex-col items-center gap-4">
		<div className="text-lg font-bold">Pong</div>
		<div className="text-sm mb-2">
		  {mode === "local-mp" && "Player 1: W/S | Player 2: Up/Down arrow keys"}
		  {mode === "remote-mp" && "Use Up/Down arrow keys to move"}
		  {mode === "singleplayer" && "Player 1: Up/Down arrow keys | Player 2: computer"}
		</div>
		{children}
	  </div>
	);
  };
  
  export default GameContainer;