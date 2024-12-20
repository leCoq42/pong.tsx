import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RoomService } from '../services/room.service';
import { MatchmakingService } from '../services/matchmaking.service';
import { forwardRef, Inject } from '@nestjs/common';
import { GameGateway } from './game.gateway';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'game',
})
export class MatchmakingGateway {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MatchmakingGateway.name);

  constructor(
    private matchmakingService: MatchmakingService,
    private roomService: RoomService,
    @Inject(forwardRef(() => GameGateway))
    private gameGateway: GameGateway,
  ) {}

  @SubscribeMessage('findMatch')
  async handleFindMatch(client: Socket): Promise<void> {
    try {
      const position = await this.matchmakingService.joinQueue(client.id);
      client.emit('queueUpdate', { position });
    } catch (error) {
      this.logger.error(`Error joining queue: ${error}`);
      client.emit('error', { message: 'Failed to join queue' });
    }
  }

  @SubscribeMessage('leaveQueue')
  async handleLeaveQueue(client: Socket): Promise<void> {
    try {
      await this.matchmakingService.leaveQueue(client.id);
      client.emit('leftQueue');
    } catch (error) {
      this.logger.error(`Error leaving queue: ${error}`);
    }
  }

  @SubscribeMessage('acceptMatch')
  async handleMatchAccept(
    client: Socket,
    payload: { gameId: string; playerId: string },
  ): Promise<void> {
    const game = this.roomService.getRoom(payload.gameId);
    if (!game) return;

    game.playersReady.add(client.id);

    if (game.playersReady.size === 2) {
      game.matchAccepted = true;
      game.isActive = true;
      this.roomService.setRoom(payload.gameId, game);

      this.server.to(payload.gameId).emit('matchAccepted');

      game.clients.forEach((client) => {
        this.server.to(client.id).emit('joinAcceptedGame', {
          gameId: payload.gameId,
          playerId: client.id,
        });
      });
    }
  }

  @SubscribeMessage('declineMatch')
  async handleMatchDecline(
    client: Socket,
    payload: { gameId: string; playerId: string },
  ): Promise<void> {
    const game = this.roomService.getRoom(payload.gameId);
    if (!game) return;

    this.server.to(payload.gameId).emit('matchDeclined');
    this.roomService.removeRoom(payload.gameId);

    // Put other player back in queue
    game.clients
      .filter((c) => c.id !== payload.playerId)
      .forEach((c) => this.matchmakingService.joinQueue(c.id));
  }
}
