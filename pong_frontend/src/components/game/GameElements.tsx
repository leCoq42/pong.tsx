interface GameElementsProps {
  context: CanvasRenderingContext2D;
  gameState: any; // Replace with proper type
  gameConstants: any; // Replace with proper type
}

const GameElements = {
  drawPaddles: (props: GameElementsProps) => {
    const { context, gameState, gameConstants } = props;
    gameState.players.forEach((player: any, idx: number) => {
      const paddleX =
        idx === 0 ? 0 : context.canvas.width - gameConstants.PADDLE_WIDTH;
      context.fillRect(
        paddleX,
        player.position,
        gameConstants.PADDLE_WIDTH,
        gameConstants.PADDLE_HEIGHT
      );
    });
  },

  drawBall: (props: GameElementsProps) => {
    const { context, gameState, gameConstants } = props;
    context.fillRect(
      Math.round(gameState.ball.x),
      Math.round(gameState.ball.y),
      gameConstants.BALL_SIZE,
      gameConstants.BALL_SIZE
    );
  },
};

export default GameElements;
