import {
  IsString,
  IsNumber,
  IsArray,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsMongoId,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MotivoDevolucion, TipoReembolso } from '../schemas/devolucion.schema';

export class ProductoDevolucionDto {
  @IsMongoId()
  productoId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class CreateDevolucionDto {
  @IsMongoId()
  ventaId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductoDevolucionDto)
  productos: ProductoDevolucionDto[];

  @IsEnum(MotivoDevolucion)
  motivo: MotivoDevolucion;

  @IsOptional()
  @IsString()
  descripcionMotivo?: string;

  @IsOptional()
  @IsEnum(TipoReembolso)
  tipoReembolso?: TipoReembolso;

  @IsOptional()
  @IsBoolean()
  devolverStock?: boolean;

  @IsOptional()
  @IsBoolean()
  afectaDeuda?: boolean;

  @IsOptional()
  @IsString()
  notas?: string;
}
