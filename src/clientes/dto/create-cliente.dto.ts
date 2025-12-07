import { IsString, IsOptional, IsEmail } from 'class-validator';

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
}