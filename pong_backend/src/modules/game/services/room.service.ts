import { Injectable } from '@nestjs/common';
import { GameRoom, GameState } from '../../../../../shared/types';
import { Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RoomService {
  private rooms = new Map<string, GameRoom>();
  public playerGameMap = new Map<string, string>();
  private readonly logger = new Logger(RoomService.name);
  private disconnectedPlayers: Map<
    string,
    { gameId: string; timestamp: number }
  > = new Map();

  initializeRoom(
    playerIds: string[],
    mode: 'singleplayer' | 'local-mp' | 'remote-mp',
    initialGameState: GameState,
    gameConstants: any,
  ): string {
    const gameId = uuid();

    playerIds.forEach((id) => {
      this.playerGameMap.set(id, gameId);
    });

    const clients = playerIds.map((id) => ({ id }));

    const gameRoom: GameRoom = {
      gameId,
      clients,
      mode,
      isActive: false,
      isFinished: false,
      gameState: initialGameState,
      gameConstants,
      playersReady: new Set(),
      matchAccepted: false,
    };

    this.rooms.set(gameId, gameRoom);
    return gameId;
  }

  getRoom(gameId: string): GameRoom | undefined {
    return this.rooms.get(gameId);
  }

  setRoom(gameId: string, game: GameRoom): void {
    this.rooms.set(gameId, game);
    game.clients.forEach((client) => {
      this.playerGameMap.set(client.id, gameId);
    });
  }

  getRoomByPlayerId(playerId: string): string | undefined {
    return this.playerGameMap.get(playerId);
  }

  isPlayerInRoom(playerId: string): boolean {
    return this.playerGameMap.has(playerId);
  }

  removeRoom(gameId: string): void {
    const room = this.rooms.get(gameId);
    if (room) {
      room.clients.forEach((client) => {
        this.playerGameMap.delete(client.id);
      });
      this.rooms.delete(gameId);
    }
  }

  handlePlayerDisconnect(
    gameId: string,
    playerId: string,
  ): GameRoom | undefined {
    const room = this.rooms.get(gameId);
    if (!room) return undefined;

    if (room.mode === 'local-mp' || room.mode === 'remote-mp') {
      if (!room.isFinished) {
        this.disconnectedPlayers.set(playerId, {
          gameId,
          timestamp: Date.now(),
        });

        room.isActive = false;
        room.isPaused = true;
        this.rooms.set(gameId, room);
        return room;
      }
    }

    this.removeRoom(gameId);
    return undefined;
  }

  getDisconnectedPlayerInfo(playerId: string) {
    const info = this.disconnectedPlayers.get(playerId);
    if (!info) return null;

    const room = this.rooms.get(info.gameId);
    if (!room || room.isFinished) {
      this.disconnectedPlayers.delete(playerId);
      return null;
    }

    return info;
  }

  getAllRooms(): Map<string, GameRoom> {
    return this.rooms;
  }

  clearAllRooms(): void {
    this.rooms.clear();
    this.playerGameMap.clear();
    this.disconnectedPlayers.clear();
  }
}
