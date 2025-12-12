import { IsNumber, Min } from 'class-validator';

export class AddStockDto {
  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioCompra: number;
}