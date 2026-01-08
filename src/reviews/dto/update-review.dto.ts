import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateReviewDto } from './create-review.dto';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewStatus } from '../schemas/review.schema';

export class UpdateReviewDto extends PartialType(
  OmitType(CreateReviewDto, ['productoId', 'orderId'] as const),
) {}

export class AdminUpdateReviewDto {
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminResponse?: string;
}
