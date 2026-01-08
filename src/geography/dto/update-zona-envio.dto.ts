import { PartialType } from '@nestjs/mapped-types';
import { CreateZonaEnvioDto } from './create-zona-envio.dto';

export class UpdateZonaEnvioDto extends PartialType(CreateZonaEnvioDto) {}