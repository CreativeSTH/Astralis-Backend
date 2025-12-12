import { IsString, IsNumber, IsOptional, Min, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoProducto } from '../schemas/producto.schema';

export class AcordeProductoDto {
  @IsString()
  acordeId: string;

  @IsNumber()
  @Min(0)
  porcentaje: number;
}

export class CreateProductoDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  precioCompra: number;

  @IsNumber()
  @Min(0)
  precioVenta: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsEnum(TipoProducto)
  @IsOptional()
  tipo?: TipoProducto;

  @IsOptional()
  @IsString()
  marcaId?: string;

  @IsOptional()
  @IsString()
  imagen?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcordeProductoDto)
  acordes?: AcordeProductoDto[];
}