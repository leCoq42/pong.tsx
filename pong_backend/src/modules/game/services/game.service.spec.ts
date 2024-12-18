import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './services/game.service';
import { RoomService } from './room/room.service';

describe('GameService', () => {
  let service: GameService;
  let roomService: RoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: RoomService,
          useValue: {
            initializeRoom: jest.fn(),
            getRoom: jest.fn(),
            setRoom: jest.fn(),
            removeRoom: jest.fn(),
            getAllRooms: jest.fn(),
            clearAllRooms: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GameService>(service);
    roomService = module.get<RoomService>(RoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkWinCondition', () => {
    it('should set game as finished when a player reaches WIN_SCORE', () => {
      const mockGame = {
        gameId: 'test-game',
        isActive: true,
        isFinished: false,
        winner: null,
        clients: [{ id: 'player1' }, { id: 'player2' }],
        gameState: {
          players: [
            { score: 1, position: 0 },
            { score: 0, position: 0 },
          ],
        },
        gameConstants: {
          WIN_SCORE: 1,
        },
      };

      jest.spyOn(roomService, 'getRoom').mockReturnValue(mockGame);

      service.updateGameState('test-game');

      expect(mockGame.isActive).toBeFalsy();
      expect(mockGame.isFinished).toBeTruthy();
      expect(mockGame.winner).toBe('player1');
      expect(roomService.setRoom).toHaveBeenCalledWith('test-game', mockGame);
    });
  });

  describe('updateGameState', () => {
    it('should handle collisions and update scores correctly', () => {
      // Test implementation
    });

    it('should update AI position in singleplayer mode', () => {
      // Test implementation
    });
  });
});
