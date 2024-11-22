import { IsInt } from 'class-validator';

export class CreatePongDto {
  @IsInt()
  score_1: number;

  @IsInt()
  score_2: number;

  @IsInt()
  ball_x: number;

  @IsInt()
  ball_y: number;

  @IsInt()
  ball_speed: number;

  @IsInt()
  player_1_y: number;

  @IsInt()
  player_2_y: number;

  @IsInt()
  player_speed: number;

  @IsInt()
  ball_size: number;

  @IsInt()
  player_size: number;

  @IsInt()
  ball_size_x: number;
}
