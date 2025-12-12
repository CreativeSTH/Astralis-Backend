import { IsString, IsOptional } from 'class-validator';

export class CreateAcordeDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  color?: string;
}