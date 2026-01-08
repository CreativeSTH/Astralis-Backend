import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsDate,
  IsMongoId,
  IsEnum,
  IsOptional,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoVenta } from '../schemas/venta.schema';

class ProductoVentaDto {
  @IsMongoId()
  productoId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioVentaCustom?: number;
}

class DescuentoVentaDto {
  @IsEnum(['PORCENTAJE', 'MONTO_FIJO'])
  tipo: 'PORCENTAJE' | 'MONTO_FIJO';

  @IsNumber()
  @Min(0)
  valor: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class CreateVentaDto {
  @IsMongoId()
  clienteId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoVentaDto)
  productos: ProductoVentaDto[];

  @IsEnum(TipoVenta)
  @IsOptional()
  tipoVenta?: TipoVenta;

  @IsNumber()
  @Min(1)
  numeroCuotas: number;

  @Type(() => Date)
  @IsDate()
  fechaPrimerPago: Date;

  @IsBoolean()
  @IsOptional()
  pagarInmediatamente?: boolean;

  // === DESCUENTO ===
  @IsOptional()
  @ValidateNested()
  @Type(() => DescuentoVentaDto)
  descuento?: DescuentoVentaDto;

  // === INTERÉS POR MORA ===
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5) // Máximo 5% diario
  tasaInteresMora?: number;

  // === VALIDACIONES ===
  @IsOptional()
  @IsBoolean()
  omitirValidacionCredito?: boolean; // Para casos especiales (admin override)

  @IsOptional()
  @IsBoolean()
  omitirValidacionMargen?: boolean; // Para ventas promocionales
}