import { IsNumber, IsDate, Min, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPago } from '../schemas/venta.schema';

export class AbonarCuotaDto {
  @IsNumber()
  @Min(1)
  numeroCuota: number;

  @IsNumber()
  @Min(0.01)
  montoAbono: number;

  @Type(() => Date)
  @IsDate()
  fechaPago: Date;

  // === AUDITORÍA DE PAGO ===
  @IsOptional()
  @IsEnum(MetodoPago)
  metodoPago?: MetodoPago;

  @IsOptional()
  @IsString()
  referenciaPago?: string; // Número de transferencia, voucher, etc.

  @IsOptional()
  @IsString()
  notas?: string;

  // === MORA ===
  @IsOptional()
  @IsBoolean()
  incluirMora?: boolean; // Si debe incluir interés por mora en el pago
}