import { Injectable } from '@nestjs/common';
import { GameRoom, GameState } from '../../../shared/types';
import { Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RoomService {
  private rooms: Map<string, GameRoom> = new Map();
  private playerGameMap: Map<string, string> = new Map();
  private readonly logger = new Logger(RoomService.name);
  readonly RECONNECT_TIMEOUT = 5000;
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

    this.playerGameMap.set(playerIds[0], gameId);
    if (mode === 'remote-mp' && playerIds[1]) {
      this.playerGameMap.set(playerIds[1], gameId);
    }

    const clients =
      mode === 'singleplayer'
        ? [{ id: playerIds[0] }, { id: 'bot' }]
        : mode === 'local-mp'
          ? [{ id: playerIds[0] }, { id: 'player2' }]
          : [{ id: playerIds[0] }, { id: playerIds[1] }];

    const gameRoom: GameRoom = {
      gameId,
      clients,
      mode,
      isActive: true,
      isFinished: false,
      gameState: initialGameState,
      gameConstants,
    };

    this.rooms.set(gameId, gameRoom);
    return gameId;
  }

  getRoom(gameId: string): GameRoom | undefined {
    return this.rooms.get(gameId);
  }

  setRoom(gameId: string, room: GameRoom): void {
    this.rooms.set(gameId, room);
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

  handleReconnect(playerId: string): GameRoom | undefined {
    const disconnectedInfo = this.disconnectedPlayers.get(playerId);
    if (!disconnectedInfo) return undefined;

    const room = this.rooms.get(disconnectedInfo.gameId);
    if (!room || room.isFinished) return undefined;

    this.disconnectedPlayers.delete(playerId);
    room.isActive = true;
    room.isPaused = false;
    this.rooms.set(disconnectedInfo.gameId, room);

    return room;
  }

  handleReconnectTimeout(
    gameId: string,
    playerId: string,
  ): GameRoom | undefined {
    const disconnectedInfo = this.disconnectedPlayers.get(playerId);
    if (!disconnectedInfo || disconnectedInfo.gameId !== gameId) return;

    const room = this.rooms.get(gameId);
    if (!room) return;

    this.disconnectedPlayers.delete(playerId);
    room.isActive = false;
    room.isFinished = true;
    room.isPaused = false;
    room.winner = room.clients.find((c) => c.id !== playerId)?.id;

    this.rooms.set(gameId, room);
    return room;
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
