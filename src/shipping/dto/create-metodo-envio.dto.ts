import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoCosto, TipoAplicacion } from '../schemas/metodo-envio.schema';

export class CondicionesEnvioDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  montoMinimoGratis?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidadMinimaGratis?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pesoMaximo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorMaximo?: number;
}

export class CostoEscalonadoDto {
  @IsNumber()
  @Min(0)
  hastaKg: number;

  @IsNumber()
  @Min(0)
  costo: number;
}

export class ConfiguracionCostoDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoBase?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costoPorKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costoPorM3?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostoEscalonadoDto)
  escalonado?: CostoEscalonadoDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  costoKgAdicional?: number;
}

export class VigenciaTemporalDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fechaInicio?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fechaFin?: Date;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  diasSemana?: number[];
}

export class RestriccionesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productosExcluidos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoriasExcluidas?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorRequiereSeguro?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentajeSeguro?: number;
}

export class CoberturaMetodoDto {
  @IsOptional()
  @IsBoolean()
  nacional?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  zonasEnvioIds?: string[];
}

export class CreateMetodoEnvioDto {
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  codigo: string;

  @IsOptional()
  @IsEnum(TipoCosto)
  tipoCosto?: TipoCosto;

  @IsOptional()
  @IsEnum(TipoAplicacion)
  tipoAplicacion?: TipoAplicacion;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfiguracionCostoDto)
  configuracionCosto?: ConfiguracionCostoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CondicionesEnvioDto)
  condiciones?: CondicionesEnvioDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoberturaMetodoDto)
  cobertura?: CoberturaMetodoDto;

  @IsOptional()
  @IsString()
  transportadoraId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tiempoEstimadoMinDias?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tiempoEstimadoMaxDias?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => VigenciaTemporalDto)
  vigencia?: VigenciaTemporalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RestriccionesDto)
  restricciones?: RestriccionesDto;

  @IsOptional()
  @IsNumber()
  prioridad?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}