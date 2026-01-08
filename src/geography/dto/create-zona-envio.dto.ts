import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CoberturaCiudadDto {
  @IsString()
  ciudadId: string;
}

export class CreateZonaEnvioDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  codigo: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departamentosIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoberturaCiudadDto)
  ciudades?: CoberturaCiudadDto[];

  @IsOptional()
  @IsBoolean()
  coberturaNacional?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}