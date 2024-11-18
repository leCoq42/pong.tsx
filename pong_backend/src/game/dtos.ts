import { IsInt, IsString, Max, Min } from 'class-validator';

export class LobbyCreateDto {
  @IsString()
  mode: 'localMult' | 'single' | 'remoteMult';

  @IsInt()
  @Min(1)
  @Max(99)
  pointsToWin: number;
}

export class LobbyJoinDto {
  @IsString()
  lobbyId: string;
}
