import {
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  IsBoolean,
  IsMongoId,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethodType } from '../schemas/order.schema';

export class OrderItemDto {
  @IsString()
  productoId: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  imagen?: string;

  @IsNumber()
  @Min(1)
  cantidad: number;

  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peso?: number;
}

export class ShippingAddressDto {
  @IsString()
  fullName: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  addressDetail?: string;

  @IsString()
  ciudadId: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ShippingInfoDto {
  @IsString()
  metodoEnvioId: string;

  @IsNumber()
  @Min(0)
  costo: number;

  @IsOptional()
  @IsBoolean()
  esGratis?: boolean;
}

export class CreateOrderDto {
  @IsString()
  userId: string;

  @IsEmail()
  customerEmail: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  discountCode?: string;

  @IsOptional()
  @IsMongoId()
  addressId?: string;

  @ValidateIf((o) => !o.addressId)
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ValidateNested()
  @Type(() => ShippingInfoDto)
  shippingInfo: ShippingInfoDto;

  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @IsOptional()
  @IsString()
  notes?: string;
}
