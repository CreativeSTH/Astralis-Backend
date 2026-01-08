import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  ValidateNested,
  IsUrl,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TiempoEstimadoDto {
  @IsNumber()
  @Min(0)
  minDias: number;

  @IsNumber()
  @Min(0)
  maxDias: number;
}

export class CreateTransportadoraDto {
  @IsString()
  nombre: string;

  @IsString()
  codigo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TiempoEstimadoDto)
  tiempoEstimado?: TiempoEstimadoDto;

  @IsOptional()
  @IsString()
  urlTracking?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  sitioWeb?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}