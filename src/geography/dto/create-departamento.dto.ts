import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateDepartamentoDto {
  @IsString()
  nombre: string;

  @IsString()
  codigo: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}