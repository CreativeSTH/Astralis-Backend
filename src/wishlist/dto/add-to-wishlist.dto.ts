import { IsString } from 'class-validator';

export class AddToWishlistDto {
  @IsString()
  productoId: string;
}
