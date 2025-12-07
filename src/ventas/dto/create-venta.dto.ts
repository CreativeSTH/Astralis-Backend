import { 
  IsString, 
  IsNumber, 
  IsArray, 
  ValidateNested, 
  Min, 
  IsDate,
  IsMongoId 
} from 'class-validator';
import { Type } from 'class-transformer';

class ProductoVentaDto {
  @IsMongoId()
  productoId: string;

  @IsNumber()
  @Min(1)
  cantidad: number;
}

export class CreateVentaDto {
  @IsMongoId()
  clienteId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductoVentaDto)
  productos: ProductoVentaDto[];

  @IsNumber()
  @Min(1)
  numeroCuotas: number;

  @Type(() => Date)
  @IsDate()
  fechaPrimerPago: Date;
}