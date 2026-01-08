import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { ShippingService } from './shipping.service';
import { ShippingCalculatorService } from './shipping-calculator.service';
import {
  CreateTransportadoraDto,
  UpdateTransportadoraDto,
  CreateMetodoEnvioDto,
  UpdateMetodoEnvioDto,
  CalcularEnvioDto,
} from './dto';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly calculatorService: ShippingCalculatorService,
  ) {}

  // ==================== TRANSPORTADORAS ====================

  @Post('transportadoras')
  @HttpCode(HttpStatus.CREATED)
  createTransportadora(@Body() dto: CreateTransportadoraDto) {
    return this.shippingService.createTransportadora(dto);
  }

  @Get('transportadoras')
  findAllTransportadoras() {
    return this.shippingService.findAllTransportadoras();
  }

  @Get('transportadoras/:id')
  findTransportadoraById(@Param('id') id: string) {
    return this.shippingService.findTransportadoraById(id);
  }

  @Patch('transportadoras/:id')
  updateTransportadora(
    @Param('id') id: string,
    @Body() dto: UpdateTransportadoraDto,
  ) {
    return this.shippingService.updateTransportadora(id, dto);
  }

  @Delete('transportadoras/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTransportadora(@Param('id') id: string) {
    return this.shippingService.removeTransportadora(id);
  }

  // ==================== MÉTODOS DE ENVÍO ====================

  @Post('metodos')
  @HttpCode(HttpStatus.CREATED)
  createMetodoEnvio(@Body() dto: CreateMetodoEnvioDto) {
    return this.shippingService.createMetodoEnvio(dto);
  }

  @Get('metodos')
  findAllMetodosEnvio() {
    return this.shippingService.findAllMetodosEnvio();
  }

  @Get('metodos/vigentes')
  findMetodosEnvioVigentes() {
    return this.shippingService.findMetodosEnvioVigentes();
  }

  @Get('metodos/:id')
  findMetodoEnvioById(@Param('id') id: string) {
    return this.shippingService.findMetodoEnvioById(id);
  }

  @Get('metodos/codigo/:codigo')
  findMetodoEnvioByCodigo(@Param('codigo') codigo: string) {
    return this.shippingService.findMetodoEnvioByCodigo(codigo);
  }

  @Get('metodos/zona/:zonaId')
  findMetodosEnvioByZona(@Param('zonaId') zonaId: string) {
    return this.shippingService.findMetodosEnvioByZona(zonaId);
  }

  @Get('metodos/ciudad/:ciudadId')
  findMetodosEnvioByCiudad(@Param('ciudadId') ciudadId: string) {
    return this.shippingService.findMetodosEnvioByCiudad(ciudadId);
  }

  @Patch('metodos/:id')
  updateMetodoEnvio(
    @Param('id') id: string,
    @Body() dto: UpdateMetodoEnvioDto,
  ) {
    return this.shippingService.updateMetodoEnvio(id, dto);
  }

  @Delete('metodos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMetodoEnvio(@Param('id') id: string) {
    return this.shippingService.removeMetodoEnvio(id);
  }

  // ==================== CÁLCULO DE ENVÍO ====================

  @Post('calcular')
  calcularEnvio(@Body() dto: CalcularEnvioDto) {
    return this.calculatorService.calcularEnvio(dto);
  }

  @Get('verificar-disponibilidad/:ciudadId')
  verificarDisponibilidadEnvio(@Param('ciudadId') ciudadId: string) {
    return this.calculatorService.verificarDisponibilidadEnvio(ciudadId);
  }
}