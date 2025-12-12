import { 
  IsString, 
  IsNumber, 
  IsArray, 
  ValidateNested, 
  Min, 
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
  precioVentaCustom?: number; // NUEVO: Precio personalizado
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
  tipoVenta?: TipoVenta; // NUEVO

  @IsNumber()
  @Min(1)
  numeroCuotas: number;

  @Type(() => Date)
  @IsDate()
  fechaPrimerPago: Date;

  @IsBoolean()
  @IsOptional()
  pagarInmediatamente?: boolean; // NUEVO: Para ventas de contado
}