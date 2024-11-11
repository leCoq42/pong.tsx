import { Test, TestingModule } from '@nestjs/testing';
import { SinglePlayerGateway } from './single-player.gateway';

describe('SinglePlayerGateway', () => {
  let gateway: SinglePlayerGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SinglePlayerGateway],
    }).compile();

    gateway = module.get<SinglePlayerGateway>(SinglePlayerGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
