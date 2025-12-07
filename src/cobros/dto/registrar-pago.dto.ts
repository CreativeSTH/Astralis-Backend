import { IsDate, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class RegistrarPagoDto {
  @Type(() => Date)
  @IsDate()
  fechaPago: Date;

  @IsOptional()
  @IsString()
  notas?: string;
}