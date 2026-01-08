import { IsString, IsOptional, IsEmail, IsNumber, Min, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoNotaCliente } from '../schemas/cliente.schema';

export class CreateNotaClienteDto {
  @IsString()
  texto: string;

  @IsOptional()
  @IsEnum(TipoNotaCliente)
  tipo?: TipoNotaCliente;
}

export class CreateClienteDto {
  @IsString()
  nombreCompleto: string;

  @IsString()
  telefono: string;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  limiteCredito?: number;
}