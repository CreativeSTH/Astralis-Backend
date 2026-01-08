import { IsNumber, Min } from 'class-validator';

export class UpdateItemDto {
  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(1, { message: 'quantity must be at least 1' })
  quantity: number;
}
