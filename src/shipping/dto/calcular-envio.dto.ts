import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductoCarritoDto {
  @IsString()
  productoId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peso?: number; // kg

  @IsOptional()
  @IsString()
  categoria?: string;
}

export class CalcularEnvioDto {
  @IsString()
  ciudadId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoCarritoDto)
  productos: ProductoCarritoDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number; // Si no se envía, se calcula de los productos
}