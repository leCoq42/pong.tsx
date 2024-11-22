import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString({ each: true })
  @IsArray()
  @ArrayMinSize(1)
  players: string[];
}
