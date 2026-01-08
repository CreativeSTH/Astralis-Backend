import {
  IsString,
  IsNumber,
  IsEmail,
  IsOptional,
  IsEnum,
  IsObject,
  Min,
  IsUrl,
} from 'class-validator';
import { PaymentProvider, PaymentMethod } from '../schemas/transaction.schema';

export class CreatePaymentDto {
  @IsString()
  orderId: string;

  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsNumber()
  @Min(1000)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEmail()
  customerEmail: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerDocument?: string;

  @IsOptional()
  @IsString()
  customerDocumentType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  redirectUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
