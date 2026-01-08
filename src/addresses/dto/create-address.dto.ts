import {
  IsString,
  IsOptional,
  IsBoolean,
  IsMongoId,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  label: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  fullName: string;

  @IsString()
  @MinLength(7)
  @MaxLength(20)
  phone: string;

  @IsMongoId()
  departamentoId: string;

  @IsMongoId()
  ciudadId: string;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressDetail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
