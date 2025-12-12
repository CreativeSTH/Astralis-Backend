import { IsNumber, IsDate, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AbonarCuotaDto {
  @IsNumber()
  @Min(1)
  numeroCuota: number;

  @IsNumber()
  @Min(0.01)
  montoAbono: number; // NUEVO: Monto del abono

  @Type(() => Date)
  @IsDate()
  fechaPago: Date;

  @IsOptional()
  @IsString()
  notas?: string;
}