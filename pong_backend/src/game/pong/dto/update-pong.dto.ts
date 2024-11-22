import { PartialType } from '@nestjs/mapped-types';
import { CreatePongDto } from './create-pong.dto';

export class UpdatePongDto extends PartialType(CreatePongDto) {
  id: number;
}
