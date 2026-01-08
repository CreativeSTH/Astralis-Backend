import { IsMongoId, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class AddItemDto {
  @IsMongoId({ message: 'productId must be a valid MongoDB ID' })
  @IsNotEmpty({ message: 'productId is required' })
  productId: string;

  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(1, { message: 'quantity must be at least 1' })
  quantity: number;
}
