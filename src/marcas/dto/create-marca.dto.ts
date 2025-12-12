import { IsString, IsOptional } from 'class-validator';

export class CreateMarcaDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  logo?: string;
}