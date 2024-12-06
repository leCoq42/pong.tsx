import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'game',
})
export class GameGateway {
  @WebSocketServer() server: Server;
  private matchmakingQueue: Socket[] = [];

  constructor(private gameService: GameService) {}

  afterInit() {
    console.log('Game Gateway Initialized');
  }

  handleConnection(client: Socket) {
    console.log('Client connected: ' + client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected: ' + client.id);
    this.removeFromQueue(client);
    this.gameService.removePlayer(client.id);
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(client: Socket) {
    this.matchmakingQueue.push(client);
    if (this.matchmakingQueue.length >= 2) {
      const player1 = this.matchmakingQueue.shift();
      const player2 = this.matchmakingQueue.shift();
      this.startGame(player1, player2);
    }
  }

  @SubscribeMessage('updatePosition')
  handleUpdatePosition(client: Socket, position: number) {
    const game = this.gameService.getGameByPlayerId(client.id);
    if (game) {
      const player = game.players.find((p) => p.id === client.id);
      if (player) player.position = position;
    }
  }

  @SubscribeMessage('startSinglePlayer')
  handleSinglePlayerGame(client: Socket) {
    const gameId = this.gameService.createGame([client.id]);
    client.emit('gameStarted', { gameId, mode: 'singlePlater' });
  }

  private startGame(player1: Socket, player2: Socket) {
    const gameId = this.gameService.createGame([player1.id, player2.id]);

    player1.join(gameId);
    player2.join(gameId);

    player1.emit('gameStarted', { gameId, mode: 'remoteMultiplayer' });
    player2.emit('gameStarted', { gameId, mode: 'remoteMultiplayer' });
  }

  private removeFromQueue(client: Socket) {
    this.matchmakingQueue = this.matchmakingQueue.filter(
      (c) => c.id !== client.id,
    );
  }
}
