import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { TipoReembolso } from '../schemas/devolucion.schema';

export class AprobarDevolucionDto {
  @IsEnum(TipoReembolso)
  tipoReembolso: TipoReembolso;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoReembolso?: number; // Si es diferente al monto total

  @IsOptional()
  @IsBoolean()
  devolverStock?: boolean;

  @IsOptional()
  @IsBoolean()
  afectaDeuda?: boolean;

  @IsOptional()
  @IsString()
  comentario?: string;
}
