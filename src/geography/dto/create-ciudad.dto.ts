import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateCiudadDto {
  @IsString()
  nombre: string;

  @IsString()
  codigo: string;

  @IsString()
  departamentoId: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}