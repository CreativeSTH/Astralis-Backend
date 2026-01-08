import { IsString } from 'class-validator';

export class RechazarDevolucionDto {
  @IsString()
  motivoRechazo: string;
}
