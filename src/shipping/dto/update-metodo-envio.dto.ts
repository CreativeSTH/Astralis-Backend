import { PartialType } from '@nestjs/mapped-types';
import { CreateMetodoEnvioDto } from './create-metodo-envio.dto';

export class UpdateMetodoEnvioDto extends PartialType(CreateMetodoEnvioDto) {}