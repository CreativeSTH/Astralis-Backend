import { PartialType } from '@nestjs/mapped-types';
import { CreateTransportadoraDto } from './create-transportadora.dto';

export class UpdateTransportadoraDto extends PartialType(
  CreateTransportadoraDto,
) {}